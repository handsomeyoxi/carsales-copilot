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


exports.analyzeConversation = functions.https.onRequest(async (req, res) => {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(204).send("");

  try {
    const { conversationText, customerId } = req.body;

    if (!conversationText) {
      return res.status(400).json({ error: "conversationText 是必填欄位" });
    }

    
    const inventorySnapshot = await db.collection("cars").get();
    const carInventory = inventorySnapshot.docs.map((doc) => ({
      car_id: doc.id,
      ...doc.data(),
    }));

    
    const result = await analyzeConversation(conversationText, carInventory);

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("analyzeConversation error:", error);
    return res.status(500).json({ error: "AI 分析失敗，請稍後再試" });
  }
});


exports.analyzeAfterConversation = functions.https.onRequest(async (req, res) => {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(204).send("");

  try {
    const { conversationText, customerId, salespersonId } = req.body;

    if (!conversationText || !customerId) {
      return res.status(400).json({ error: "conversationText 和 customerId 是必填欄位" });
    }

    
    let customerHistory = null;
    const customerDoc = await db.collection("customers").doc(customerId).get();
    if (customerDoc.exists) customerHistory = customerDoc.data();

    
    const result = await analyzeAfterConversation(conversationText, customerHistory);

    const timestamp = FieldValue.serverTimestamp();

    
    const conversationRef = await db.collection("conversations").add({
      customerId,
      salespersonId,
      conversationText,
      analysis: result,
      createdAt: timestamp,
    });

    
    await db.collection("customers").doc(customerId).set(
      {
        lifecycleStage: result.lifecycle_stage.stage,
        closeProbability: result.close_probability.percentage,
        lastContactAt: timestamp,
        latestConversationId: conversationRef.id,
      },
      { merge: true }
    );

    
    const todoBatch = db.batch();
    for (const todo of result.todos) {
      const todoRef = db.collection("todos").doc();
      todoBatch.set(todoRef, {
        customerId,
        salespersonId,
        task: todo.task,
        priority: todo.priority,
        dueDateSuggestion: todo.due_date_suggestion,
        isDone: false,
        createdAt: timestamp,
      });
    }
    await todoBatch.commit();

    
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + (result.follow_up.suggested_date || 3));

    await db.collection("followUps").add({
      customerId,
      salespersonId,
      followUpDate: Timestamp.fromDate(followUpDate),
      followUpScript: result.follow_up.follow_up_script,
      reason: result.follow_up.suggested_date_reason,
      isDone: false,
      createdAt: timestamp,
    });

    return res.status(200).json({
      success: true,
      conversationId: conversationRef.id,
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
    const { customerId, carId, conversationText } = req.body;

    if (!customerId || !carId) {
      return res.status(400).json({ error: "customerId 和 carId 是必填欄位" });
    }

    const [customerDoc, carDoc] = await Promise.all([
      db.collection("customers").doc(customerId).get(),
      db.collection("cars").doc(carId).get(),
    ]);

    if (!customerDoc.exists) return res.status(404).json({ error: "找不到客戶資料" });
    if (!carDoc.exists) return res.status(404).json({ error: "找不到車款資料" });

    const result = await generateQuotation(
      customerDoc.data(),
      { car_id: carId, ...carDoc.data() },
      conversationText || ""
    );

    const quotationRef = await db.collection("quotations").add({
      customerId,
      carId,
      quotation: result.quotation,
      createdAt: FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      success: true,
      quotationId: quotationRef.id,
      data: result,
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

    const [customersSnap, todosSnap, followUpsSnap] = await Promise.all([
      db.collection("customers")
        .where("salespersonId", "==", salespersonId)
        .orderBy("closeProbability", "desc")
        .get(),
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

    const customers = customersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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
