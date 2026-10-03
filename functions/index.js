const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { analyzeConversation, analyzeAfterConversation, generateQuotation } = require("./gemini");

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

    const timestamp = admin.firestore.FieldValue.serverTimestamp();

   
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
      followUpDate: admin.firestore.Timestamp.fromDate(followUpDate),
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
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
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
