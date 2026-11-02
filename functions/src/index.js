const functions = require("firebase-functions");
const admin = require("firebase-admin");
// FieldValue、Timestamp 直接從這裡載入：在本機測試環境中 admin.firestore.FieldValue 會是 undefined
const { FieldValue, Timestamp } = require("firebase-admin/firestore");
const { analyzeConversation, analyzeAfterConversation, generateQuotation } = require("./gemini");
const { analyzeInsight, followUpAdvisor } = require("./advisor");

admin.initializeApp();
const db = admin.firestore();

function setCORS(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
}


// ===== 共用工具：業務員品牌、車款、日期、客戶狀態 =====

const STATUSES = ["new", "following", "won"];
const PRIORITIES = ["high", "medium", "low"];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// 讀業務員資料（salespersons/{uid}），沒有就回傳 null
async function getSalesperson(salespersonId) {
  if (!salespersonId) return null;
  const doc = await db.collection("salespersons").doc(salespersonId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

// 取得可推薦的車款：有品牌就只拿自家品牌的車；沒有設定品牌（舊資料）才拿全部
async function getCarsForBrand(brand) {
  const query = brand ? db.collection("cars").where("brand", "==", brand) : db.collection("cars");
  const snap = await query.get();
  return snap.docs.map((doc) => ({ car_id: doc.id, ...doc.data() }));
}

// 由 AI 判斷的生命週期換算客戶狀態；「流失」或判斷不出來時回傳 null（維持原狀態）
function statusFromStage(stage) {
  if (stage === "初次接觸") return "new";
  if (["需求確認", "報價中", "決策中"].includes(stage)) return "following";
  if (stage === "成交") return "won";
  return null;
}

// "2026-10-31" 加 n 天 → "2026-11-03"（純日期運算，不受時區影響）
function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// 車款定價（元）：優先用 price（元），沒有就用 priceFrom（萬元）換算
function basePriceOf(car) {
  if (Number.isFinite(Number(car.price)) && Number(car.price) > 0) return Math.round(Number(car.price));
  if (Number.isFinite(Number(car.priceFrom)) && Number(car.priceFrom) > 0) return Math.round(Number(car.priceFrom) * 10000);
  return null;
}

// 報價單的所有數字都在這裡算，AI 不碰
// optionItems：客戶選的選配名稱（要存在於 cars.options）；discount：業務員給的折扣（元），沒給就用車款預設折扣
function computeQuotation(car, { optionItems = [], discount } = {}) {
  const basePrice = basePriceOf(car);
  if (basePrice === null) return null;

  const carOptions = Array.isArray(car.options) ? car.options : [];
  const options = carOptions
    .map((o) => ({ item: o.item || o.name, price: Math.round(Number(o.price) || 0) }))
    .filter((o) => o.item && optionItems.includes(o.item));

  const subtotal = basePrice + options.reduce((sum, o) => sum + o.price, 0);
  const rawDiscount = Number(discount ?? car.discount ?? 0);
  const safeDiscount = Number.isFinite(rawDiscount) ? Math.min(Math.max(Math.round(rawDiscount), 0), subtotal) : 0;

  return {
    base_price: basePrice,
    options,
    subtotal,
    discount: safeDiscount,
    final_price: subtotal - safeDiscount,
    currency: "TWD",
  };
}


exports.analyzeConversation = functions.https.onRequest(async (req, res) => {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(204).send("");

  try {
    const { conversationText, salespersonId } = req.body;

    if (!conversationText) {
      return res.status(400).json({ error: "conversationText 是必填欄位" });
    }

    // 只拿業務員自家品牌的車給 AI 推薦
    const salesperson = await getSalesperson(salespersonId);
    const brand = salesperson ? salesperson.brand || null : null;
    const carInventory = await getCarsForBrand(brand);

    const result = await analyzeConversation(conversationText, carInventory, brand);

    return res.status(200).json({ success: true, brand, data: result });
  } catch (error) {
    console.error("analyzeConversation error:", error);
    return res.status(500).json({ error: "AI 分析失敗，請稍後再試" });
  }
});


exports.analyzeAfterConversation = functions.https.onRequest(async (req, res) => {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(204).send("");

  try {
    const { conversationText, customerId, salespersonId, sessionId } = req.body;

    if (!conversationText || !customerId) {
      return res.status(400).json({ error: "conversationText 和 customerId 是必填欄位" });
    }

    const customerRef = db.collection("customers").doc(customerId);
    const [customerDoc, salesperson] = await Promise.all([customerRef.get(), getSalesperson(salespersonId)]);
    const customerHistory = customerDoc.exists ? customerDoc.data() : null;
    const brand = salesperson ? salesperson.brand || null : null;
    const carInventory = await getCarsForBrand(brand);

    const today = toTaipeiDate(new Date());
    // 回傳的結果已補齊預設值，少欄位也不會讓後面的程式掛掉
    const result = await analyzeAfterConversation(conversationText, customerHistory, { today, brand, carInventory });

    const timestamp = FieldValue.serverTimestamp();

    const conversationRef = await db.collection("conversations").add({
      customerId,
      salespersonId: salespersonId || null,
      sessionId: sessionId || null, // 對應 stt-server 的 sessions，之後合併時用
      conversationText,
      analysis: result,
      createdAt: timestamp,
    });

    // 更新客戶：AI 判斷不出來的欄位不覆蓋舊值
    const customerUpdate = {
      lastContactAt: timestamp,
      latestConversationId: conversationRef.id,
      closeAnalysis: result.close_probability,
      competitorComparison: result.competitor_comparison,
    };
    if (salespersonId && !(customerHistory && customerHistory.salespersonId)) {
      customerUpdate.salespersonId = salespersonId;
    }
    if (result.lifecycle_stage.stage) customerUpdate.lifecycleStage = result.lifecycle_stage.stage;
    if (result.close_probability.percentage !== null) {
      customerUpdate.closeProbability = result.close_probability.percentage;
    }

    // 客戶狀態：業務員手動改過（statusSource = manual）就不讓 AI 蓋掉
    const derivedStatus = statusFromStage(result.lifecycle_stage.stage);
    const manuallySet = customerHistory && customerHistory.statusSource === "manual";
    if (derivedStatus && !manuallySet) {
      customerUpdate.status = derivedStatus;
      customerUpdate.statusSource = "ai";
    } else if (!customerHistory || !customerHistory.status) {
      // 新客戶又判斷不出階段時，至少給一個預設狀態，前端才分得了類
      customerUpdate.status = "new";
      customerUpdate.statusSource = "ai";
    }

    await customerRef.set(customerUpdate, { merge: true });

    // 待辦：存真正的日期 dueDate，前端月曆才放得上去
    const todoBatch = db.batch();
    for (const todo of result.todos) {
      const todoRef = db.collection("todos").doc();
      todoBatch.set(todoRef, {
        customerId,
        salespersonId: salespersonId || null,
        conversationId: conversationRef.id,
        task: todo.task,
        priority: todo.priority,
        dueDate: addDays(today, todo.due_in_days),
        dueDateSuggestion: todo.due_date_suggestion,
        time: null,
        isDone: false,
        source: "ai",
        createdAt: timestamp,
      });
    }
    await todoBatch.commit();

    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + result.follow_up.suggested_date);

    await db.collection("followUps").add({
      customerId,
      salespersonId: salespersonId || null,
      followUpDate: Timestamp.fromDate(followUpDate),
      dueDate: addDays(today, result.follow_up.suggested_date),
      followUpScript: result.follow_up.follow_up_script,
      reason: result.follow_up.suggested_date_reason,
      isDone: false,
      createdAt: timestamp,
    });

    return res.status(200).json({
      success: true,
      conversationId: conversationRef.id,
      status: customerUpdate.status || (customerHistory && customerHistory.status) || null,
      data: result,
    });
  } catch (error) {
    console.error("analyzeAfterConversation error:", error);
    return res.status(500).json({ error: "AI 分析失敗，請稍後再試" });
  }
});


exports.generateQuotation = functions.https.onRequest(async (req, res) => {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(204).send("");

  try {
    const { customerId, carId, conversationText, optionItems, discount } = req.body;

    if (!customerId || !carId) {
      return res.status(400).json({ error: "customerId 和 carId 是必填欄位" });
    }

    const [customerDoc, carDoc] = await Promise.all([
      db.collection("customers").doc(customerId).get(),
      db.collection("cars").doc(carId).get(),
    ]);

    if (!customerDoc.exists) return res.status(404).json({ error: "找不到客戶資料" });
    if (!carDoc.exists) return res.status(404).json({ error: "找不到車款資料" });

    const car = { car_id: carId, ...carDoc.data() };
    const pricing = computeQuotation(car, {
      optionItems: Array.isArray(optionItems) ? optionItems : [],
      discount,
    });
    if (!pricing) {
      return res.status(400).json({ error: "這台車沒有價格資料（price 或 priceFrom），無法報價" });
    }

    const customer = customerDoc.data();
    const text = await generateQuotation(customer, car, pricing, conversationText || "");

    const today = toTaipeiDate(new Date());
    const quotation = {
      date: today,
      valid_until: addDays(today, 7),
      customer_name: customer.name || null,
      car_model: car.name || null,
      ...pricing,
      notes: text.notes,
      salesperson_message: text.salesperson_message,
    };

    const quotationRef = await db.collection("quotations").add({
      customerId,
      carId,
      quotation,
      createdAt: FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      success: true,
      quotationId: quotationRef.id,
      data: { quotation },
    });
  } catch (error) {
    console.error("generateQuotation error:", error);
    return res.status(500).json({ error: "報價單生成失敗，請稍後再試" });
  }
});


exports.getDashboard = functions.https.onRequest(async (req, res) => {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(204).send("");

  try {
    const { salespersonId } = req.query;

    if (!salespersonId) {
      return res.status(400).json({ error: "salespersonId 是必填參數" });
    }

    const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // todos、followUps 用了 where＋orderBy，需要 firestore.indexes.json 裡的複合索引
    const [customersSnap, todosSnap, followUpsSnap] = await Promise.all([
      db.collection("customers").where("salespersonId", "==", salespersonId).get(),
      db.collection("todos")
        .where("salespersonId", "==", salespersonId)
        .where("isDone", "==", false)
        .orderBy("createdAt", "desc")
        .get(),
      db.collection("followUps")
        .where("salespersonId", "==", salespersonId)
        .where("isDone", "==", false)
        .where("followUpDate", "<=", sevenDaysLater)
        .orderBy("followUpDate", "asc")
        .get(),
    ]);

    // 客戶在程式裡排序：用 orderBy 的話，還沒有 closeProbability 的新客戶會整個查不到
    const customers = customersSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (b.closeProbability ?? -1) - (a.closeProbability ?? -1));
    const todos = todosSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const followUps = followUpsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          totalCustomers: customers.length,
          highProbability: customers.filter((c) => c.closeProbability >= 70).length,
          pendingTodos: todos.length,
          upcomingFollowUps: followUps.length,
          byStatus: {
            new: customers.filter((c) => c.status === "new").length,
            following: customers.filter((c) => c.status === "following").length,
            won: customers.filter((c) => c.status === "won").length,
          },
        },
        customers,
        todos,
        followUps,
      },
    });
  } catch (error) {
    console.error("getDashboard error:", error);
    return res.status(500).json({ error: "Dashboard 資料載入失敗" });
  }
});


// 業務員註冊／修改資料：存 salespersons/{uid}，brand 決定推薦哪個品牌的車
exports.saveSalesperson = functions.https.onRequest(async (req, res) => {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(204).send("");

  try {
    const { salespersonId, name, phone, email, brand } = req.body;

    if (!salespersonId) return res.status(400).json({ error: "salespersonId 是必填欄位" });

    const update = { updatedAt: FieldValue.serverTimestamp() };
    if (name !== undefined) update.name = name;
    if (phone !== undefined) update.phone = phone;
    if (email !== undefined) update.email = email;
    if (brand !== undefined) {
      if (typeof brand !== "string" || brand.trim() === "") {
        return res.status(400).json({ error: "brand 不能是空的" });
      }
      update.brand = brand.trim();
    }

    const ref = db.collection("salespersons").doc(salespersonId);
    await ref.set(update, { merge: true });
    const saved = await ref.get();

    return res.status(200).json({ success: true, data: { id: saved.id, ...saved.data() } });
  } catch (error) {
    console.error("saveSalesperson error:", error);
    return res.status(500).json({ error: "業務員資料儲存失敗" });
  }
});


// 業務員手動改客戶狀態：標記 statusSource = manual，之後 AI 分析就不會蓋掉
// 傳 status: null 代表「交還給 AI 判斷」
exports.updateCustomerStatus = functions.https.onRequest(async (req, res) => {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(204).send("");

  try {
    const { customerId, status } = req.body;

    if (!customerId) return res.status(400).json({ error: "customerId 是必填欄位" });
    if (status !== null && !STATUSES.includes(status)) {
      return res.status(400).json({ error: "status 只能是 new / following / won，或 null（交還給 AI）" });
    }

    const update =
      status === null
        ? { statusSource: "ai" }
        : { status, statusSource: "manual", statusUpdatedAt: FieldValue.serverTimestamp() };

    await db.collection("customers").doc(customerId).set(update, { merge: true });
    return res.status(200).json({ success: true, data: { customerId, ...update, statusUpdatedAt: undefined } });
  } catch (error) {
    console.error("updateCustomerStatus error:", error);
    return res.status(500).json({ error: "客戶狀態更新失敗" });
  }
});


// 業務員自己新增或修改待辦（和 AI 產生的待辦放在同一個 todos collection）
// 沒帶 id = 新增；帶 id = 修改（例如打勾完成、改日期）
exports.saveTodo = functions.https.onRequest(async (req, res) => {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(204).send("");

  try {
    const { id, salespersonId, customerId, task, dueDate, time, priority, isDone } = req.body;

    if (dueDate !== undefined && !DATE_PATTERN.test(dueDate)) {
      return res.status(400).json({ error: "dueDate 格式要是 YYYY-MM-DD" });
    }
    if (priority !== undefined && !PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: "priority 只能是 high / medium / low" });
    }

    if (!id) {
      if (!salespersonId || !task || !dueDate) {
        return res.status(400).json({ error: "新增待辦需要 salespersonId、task、dueDate" });
      }
      const data = {
        salespersonId,
        customerId: customerId || null,
        task,
        dueDate,
        time: time || null,
        priority: priority || "medium",
        isDone: Boolean(isDone),
        source: "manual",
        createdAt: FieldValue.serverTimestamp(),
      };
      const ref = await db.collection("todos").add(data);
      return res.status(200).json({ success: true, data: { id: ref.id, ...data, createdAt: undefined } });
    }

    const ref = db.collection("todos").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "找不到這筆待辦" });

    const update = { updatedAt: FieldValue.serverTimestamp() };
    if (task !== undefined) update.task = task;
    if (customerId !== undefined) update.customerId = customerId || null;
    if (dueDate !== undefined) update.dueDate = dueDate;
    if (time !== undefined) update.time = time || null;
    if (priority !== undefined) update.priority = priority;
    if (isDone !== undefined) update.isDone = Boolean(isDone);

    await ref.set(update, { merge: true });
    const saved = await ref.get();
    return res.status(200).json({ success: true, data: { id, ...saved.data() } });
  } catch (error) {
    console.error("saveTodo error:", error);
    return res.status(500).json({ error: "待辦儲存失敗" });
  }
});


// ===== 以下為新增：硬需求標籤、情緒價值標籤、情緒分析、回訪軍師 =====

// 把這次對話的新標籤併入客戶原有的標籤
// - 同一類別、同一內容的標籤：用新的取代舊的
// - 只會有一個答案的類別（例如預算）：新的出現時，舊的整個換掉
// - 其他：新舊都保留
const SINGLE_VALUE_CATEGORIES = ["預算", "購車時間", "付款方式", "舊車換購"];

function mergeTags(oldTags, newTags, textField) {
  const incoming = Array.isArray(newTags) ? newTags.filter((t) => t && t.category && t[textField]) : [];
  const existing = Array.isArray(oldTags) ? oldTags : [];
  const incomingKeys = new Set(incoming.map((t) => `${t.category}|${t[textField]}`));
  const replacedCategories = new Set(
    incoming.map((t) => t.category).filter((c) => SINGLE_VALUE_CATEGORIES.includes(c))
  );
  const kept = existing.filter(
    (t) => !incomingKeys.has(`${t.category}|${t[textField]}`) && !replacedCategories.has(t.category)
  );
  return [...kept, ...incoming];
}

function mergeStrings(oldList, newList) {
  const all = [...(Array.isArray(oldList) ? oldList : []), ...(Array.isArray(newList) ? newList : [])];
  return [...new Set(all.filter((item) => typeof item === "string" && item.trim() !== ""))];
}

// 轉成台灣時區的日期字串，例如 2026-10-08
function toTaipeiDate(date) {
  return date.toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });
}

function toDateString(timestamp) {
  return timestamp && timestamp.toDate ? toTaipeiDate(timestamp.toDate()) : null;
}


exports.analyzeInsight = functions.https.onRequest(async (req, res) => {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(204).send("");

  try {
    const { conversationText, customerId, conversationId } = req.body;

    if (!conversationText) {
      return res.status(400).json({ error: "conversationText 是必填欄位" });
    }

    const result = await analyzeInsight(conversationText);

    // 有帶 conversationId 就把結果存回那筆對話紀錄
    if (conversationId) {
      await db.collection("conversations").doc(conversationId).set(
        { insight: result },
        { merge: true }
      );
    }

    // 有帶 customerId 就把新標籤併入客戶累積的標籤，並更新最新情緒
    if (customerId) {
      const customerRef = db.collection("customers").doc(customerId);
      const customerDoc = await customerRef.get();
      const current = customerDoc.exists ? customerDoc.data() : {};

      await customerRef.set(
        {
          hardNeeds: mergeTags(current.hardNeeds, result.hard_needs, "value"),
          emotionalValues: mergeTags(current.emotionalValues, result.emotional_values, "label"),
          concerns: mergeStrings(current.concerns, result.concerns),
          latestEmotion: result.emotion || null,
        },
        { merge: true }
      );
    }

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("analyzeInsight error:", error);
    return res.status(500).json({ error: "AI 分析失敗，請稍後再試" });
  }
});


exports.followUpAdvisor = functions.https.onRequest(async (req, res) => {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(204).send("");

  try {
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: "customerId 是必填欄位" });
    }

    const [customerDoc, conversationsSnap] = await Promise.all([
      db.collection("customers").doc(customerId).get(),
      db.collection("conversations").where("customerId", "==", customerId).get(),
    ]);

    if (!customerDoc.exists) return res.status(404).json({ error: "找不到客戶資料" });
    if (conversationsSnap.empty) {
      return res.status(404).json({ error: "這位客戶還沒有對話紀錄，無法產生回訪建議" });
    }

    // 在程式裡排序（由新到舊），只取最近 5 筆，這樣不用另外建 Firestore 複合索引
    const conversations = conversationsSnap.docs
      .map((doc) => doc.data())
      .sort((a, b) => {
        const aTime = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      })
      .slice(0, 5);

    // 只把分析結果交給 AI，不送完整逐字稿，節省免費額度
    const history = conversations.map((c) => ({
      date: toDateString(c.createdAt),
      summary: c.analysis ? c.analysis.summary : null,
      lifecycle_stage: c.analysis ? c.analysis.lifecycle_stage : null,
      close_probability: c.analysis ? c.analysis.close_probability : null,
      insight: c.insight || null,
    }));

    const customerData = customerDoc.data();
    const customer = {
      name: customerData.name || null,
      lifecycleStage: customerData.lifecycleStage || null,
      closeProbability: customerData.closeProbability ?? null,
      lastContactDate: toDateString(customerData.lastContactAt),
      hardNeeds: customerData.hardNeeds || [],
      emotionalValues: customerData.emotionalValues || [],
      concerns: customerData.concerns || [],
      latestEmotion: customerData.latestEmotion || null,
    };

    const today = toTaipeiDate(new Date());
    const result = await followUpAdvisor(customer, history, today);

    await db.collection("customers").doc(customerId).set(
      {
        followUpAdvice: result,
        followUpAdviceAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("followUpAdvisor error:", error);
    return res.status(500).json({ error: "回訪建議生成失敗，請稍後再試" });
  }
});
