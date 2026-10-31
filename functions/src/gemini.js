// E 組負責的 AI 功能：即時推薦、對話後分析、報價單訊息
// 呼叫 Gemini 統一走 ai.js 的 askGemini（JSON 模式＋自動重試），這裡只負責 prompt 和整理結果。
// AI 有時會少回欄位，所以每個結果都經過 normalize，確保後面的程式和前端拿到完整的格式。
const { askGemini } = require("./ai");

const STAGES = ["初次接觸", "需求確認", "報價中", "決策中", "成交", "流失"];
const PRIORITIES = ["high", "medium", "low"];

// ---------- 小工具：把 AI 回傳的值整理成固定型別 ----------

function asString(value, fallback = null) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
}

function asStringArray(value) {
  return Array.isArray(value) ? value.map((v) => asString(v)).filter(Boolean) : [];
}

function asInt(value, { min, max, fallback }) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function levelOf(percentage) {
  if (percentage === null) return null;
  return percentage >= 70 ? "高" : percentage >= 40 ? "中" : "低";
}

// 只把 AI 需要的車款欄位送出去，節省免費額度
function carsForPrompt(cars) {
  return cars.map((c) => ({
    car_id: c.car_id || c.id,
    brand: c.brand || null,
    name: c.name || null,
    type: c.type || null,
    priceFrom: c.priceFrom ?? null,
    strengths: c.strengths || undefined,
    rival: c.rival || undefined,
  }));
}

// ---------- 功能一：對話中即時推薦 ----------

function normalizeRealtime(raw, cars) {
  const r = raw && typeof raw === "object" ? raw : {};
  const needs = r.customer_needs || {};
  const validIds = new Set(cars.map((c) => c.car_id || c.id));

  return {
    customer_needs: {
      budget: asString(needs.budget),
      usage: asString(needs.usage),
      preferences: asStringArray(needs.preferences),
    },
    // 只保留真的在車款清單裡的車，避免 AI 推薦別家品牌或不存在的車
    recommended_cars: (Array.isArray(r.recommended_cars) ? r.recommended_cars : [])
      .filter((c) => c && validIds.has(c.car_id))
      .map((c) => ({
        car_id: c.car_id,
        car_name: asString(c.car_name, ""),
        reason: asString(c.reason, ""),
        key_selling_point: asString(c.key_selling_point, ""),
      })),
    suggested_scripts: asStringArray(r.suggested_scripts),
    objection_handler: asString(r.objection_handler),
  };
}

async function analyzeConversation(conversationText, carInventory, brand) {
  const brandLine = brand
    ? `業務員代理的品牌是「${brand}」，只能推薦下面清單裡的 ${brand} 車款，不可以推薦其他品牌。`
    : "只能推薦下面清單裡的車款。";

  const prompt = `
你是一位資深汽車銷售顧問 AI，正在即時輔助業務員與客戶的對話。
${brandLine}

【目前對話內容】
${conversationText}

【可推薦的車款】
${JSON.stringify(carsForPrompt(carInventory), null, 2)}

【規則】
1. car_id 必須是上面清單裡的 car_id；清單是空的或沒有合適的車時，recommended_cars 回傳 []。
2. 客戶沒提到的需求填 null（陣列填 []），不可以猜測。
3. 全部使用繁體中文。

請回傳以下 JSON 格式（只回傳純 JSON）：
{
  "customer_needs": {
    "budget": "客戶預算（若未提及填 null）",
    "usage": "用途（通勤、家庭、商務等，若未提及填 null）",
    "preferences": ["偏好列表，例如：省油、空間大、外觀運動"]
  },
  "recommended_cars": [
    {
      "car_id": "車款 ID",
      "car_name": "車款名稱",
      "reason": "推薦理由（30字內，針對客戶需求說明）",
      "key_selling_point": "針對這位客戶最有力的賣點（一句話）"
    }
  ],
  "suggested_scripts": [
    "建議業務員說的話（自然、不生硬，像真人在說）",
    "備用說法"
  ],
  "objection_handler": "若客戶有猶豫，建議業務員怎麼回應（若無猶豫則填 null）"
}
`.trim();

  const raw = await askGemini(prompt, { temperature: 0.4 });
  return normalizeRealtime(raw, carInventory);
}

// ---------- 功能二：對話結束後分析 ----------

function normalizeCompetitor(raw) {
  if (!raw || typeof raw !== "object") return null;
  const ourCar = asString(raw.our_car);
  const rivalCar = asString(raw.rival_car);
  // 對話沒提到對手車時 AI 應該回 null；兩台車都沒有就視為沒有比較
  if (!ourCar && !rivalCar) return null;
  return {
    our_car: ourCar,
    rival_car: rivalCar,
    our_strengths: asStringArray(raw.our_strengths),
    rival_strengths: asStringArray(raw.rival_strengths),
    pitch: asString(raw.pitch),
  };
}

function normalizeAfterAnalysis(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const summary = r.summary || {};
  const followUp = r.follow_up || {};
  const stage = r.lifecycle_stage || {};
  const prob = r.close_probability || {};

  const percentage = asInt(prob.percentage, { min: 0, max: 100, fallback: null });

  return {
    summary: {
      customer_name: asString(summary.customer_name),
      key_points: asStringArray(summary.key_points),
      interested_cars: asStringArray(summary.interested_cars),
      concerns: asStringArray(summary.concerns),
    },
    todos: (Array.isArray(r.todos) ? r.todos : [])
      .filter((t) => t && asString(t.task))
      .map((t) => ({
        task: asString(t.task),
        priority: PRIORITIES.includes(t.priority) ? t.priority : "medium",
        due_in_days: asInt(t.due_in_days, { min: 0, max: 60, fallback: 3 }),
        due_date_suggestion: asString(t.due_date_suggestion, "3天內"),
      })),
    follow_up: {
      suggested_date: asInt(followUp.suggested_date, { min: 0, max: 60, fallback: 3 }),
      suggested_date_reason: asString(followUp.suggested_date_reason),
      follow_up_script: asString(followUp.follow_up_script),
    },
    lifecycle_stage: {
      // 不在清單裡的階段一律當作 null，避免存進奇怪的值
      stage: STAGES.includes(stage.stage) ? stage.stage : null,
      stage_reason: asString(stage.stage_reason),
      next_action: asString(stage.next_action),
    },
    close_probability: {
      percentage,
      level: ["高", "中", "低"].includes(prob.level) ? prob.level : levelOf(percentage),
      why: asString(prob.why),
      positive_signals: asStringArray(prob.positive_signals),
      risk_signals: asStringArray(prob.risk_signals),
      suggestion: asString(prob.suggestion),
    },
    competitor_comparison: normalizeCompetitor(r.competitor_comparison),
  };
}

async function analyzeAfterConversation(conversationText, customerHistory, { today, brand, carInventory = [] } = {}) {
  const prompt = `
你是一位資深汽車銷售顧問 AI，請分析以下業務員與客戶的完整對話紀錄。

【今天日期】
${today}

【業務員代理的品牌】
${brand || "未設定"}

【自家品牌車款】
${JSON.stringify(carsForPrompt(carInventory), null, 2)}

【完整對話紀錄】
${conversationText}

【客戶歷史紀錄（若有）】
${customerHistory ? JSON.stringify(customerHistory, null, 2) : "無歷史紀錄，此為首次接觸"}

【規則】
1. 只能根據對話與歷史紀錄判斷，不可以捏造客戶沒說過的事；資料不足的欄位填 null（陣列填 []）。
2. todos 的 due_in_days 是「從今天算起幾天內要完成」的整數（今天要做填 0）。
3. lifecycle_stage.stage 只能是：${STAGES.join(" / ")}。
4. close_probability.why 用一句話說明為什麼是這個機率，要同時講加分和扣分的原因。
5. competitor_comparison：只有客戶在對話中提到正在比較其他品牌的車時才填，否則整個填 null。
   our_car 要從【自家品牌車款】挑最適合跟對手比的那台；our_strengths 和 rival_strengths 要具體，
   pitch 是業務員可以直接說的一句話。
6. 全部使用繁體中文。

請回傳以下 JSON 格式（只回傳純 JSON）：
{
  "summary": {
    "customer_name": "客戶姓名（若有提及）",
    "key_points": ["對話重點整理，條列式，3-5點"],
    "interested_cars": ["客戶感興趣的車款"],
    "concerns": ["客戶的顧慮或問題"]
  },
  "todos": [
    {
      "task": "待辦事項內容",
      "priority": "high / medium / low",
      "due_in_days": 3,
      "due_date_suggestion": "建議完成時間的文字說法（例如：3天內、本週內）"
    }
  ],
  "follow_up": {
    "suggested_date": 3,
    "suggested_date_reason": "為什麼這個時間點回訪",
    "follow_up_script": "回訪時建議說的開場白"
  },
  "lifecycle_stage": {
    "stage": "${STAGES.join(" / ")}",
    "stage_reason": "判斷理由（30字內）",
    "next_action": "建議業務員下一步做什麼"
  },
  "close_probability": {
    "percentage": 75,
    "level": "高 / 中 / 低",
    "why": "為什麼是這個機率（一句話，含加分與扣分原因）",
    "positive_signals": ["有利成交的信號"],
    "risk_signals": ["可能流失的風險信號"],
    "suggestion": "提升成交機率的建議"
  },
  "competitor_comparison": {
    "our_car": "自家車款名稱",
    "rival_car": "客戶在比較的對手車款",
    "our_strengths": ["自家車的優勢"],
    "rival_strengths": ["對手車的優勢"],
    "pitch": "建議業務員的說法"
  }
}
`.trim();

  const raw = await askGemini(prompt);
  return normalizeAfterAnalysis(raw);
}

// ---------- 功能三：報價單 ----------
// 定價、選配、折扣、售價由 index.js 依 cars 資料計算，AI 只負責寫給客戶的文字，不碰任何數字

async function generateQuotation(customerInfo, selectedCar, pricing, conversationText) {
  const prompt = `
你是一位專業汽車銷售顧問 AI，業務員要寄一份報價單給客戶，請幫忙寫報價單上的文字。

【客戶資訊】
${JSON.stringify(
  {
    name: customerInfo.name || null,
    needs: customerInfo.needs || null,
    concerns: customerInfo.concerns || [],
  },
  null,
  2
)}

【車款】
${JSON.stringify({ brand: selectedCar.brand || null, name: selectedCar.name || null, type: selectedCar.type || null }, null, 2)}

【報價內容（已由系統計算，單位：新台幣元）】
${JSON.stringify(pricing, null, 2)}

【對話中提及的特殊需求或備注】
${conversationText || "無"}

【規則】
1. 不要在文字中自己算或改任何金額；需要提到金額時，只能使用上面報價內容裡的數字。
2. notes 只寫和這位客戶有關的備注（例如交車時間、客戶在意的配備），沒有就回傳 []。
3. 全部使用繁體中文。

請回傳以下 JSON 格式（只回傳純 JSON）：
{
  "notes": ["備注事項"],
  "salesperson_message": "業務員給客戶的個人化訊息（50字內，溫暖自然）"
}
`.trim();

  const raw = (await askGemini(prompt, { temperature: 0.6 })) || {};
  return {
    notes: asStringArray(raw.notes),
    salesperson_message: asString(raw.salesperson_message, ""),
  };
}

module.exports = {
  STAGES,
  analyzeConversation,
  analyzeAfterConversation,
  generateQuotation,
  // 匯出給測試用
  normalizeAfterAnalysis,
  normalizeRealtime,
};
