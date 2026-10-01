const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


const MODEL = "gemini-1.5-flash";


function safeParseJSON(text) {

  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}


async function analyzeConversation(conversationText, carInventory) {
  const model = genAI.getGenerativeModel({ model: MODEL });

  const prompt = `
你是一位資深汽車銷售顧問 AI，正在即時輔助業務員與客戶的對話。

【目前對話內容】
${conversationText}

【目前可供推薦的車款庫存】
${JSON.stringify(carInventory, null, 2)}

請根據對話內容，用繁體中文回傳以下 JSON 格式（只回傳純 JSON，不要 markdown、不要其他文字）：
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

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return safeParseJSON(text);
}


async function analyzeAfterConversation(conversationText, customerHistory) {
  const model = genAI.getGenerativeModel({ model: MODEL });

  const prompt = `
你是一位資深汽車銷售顧問 AI，請分析以下業務員與客戶的完整對話紀錄。

【完整對話紀錄】
${conversationText}

【客戶歷史紀錄（若有）】
${customerHistory ? JSON.stringify(customerHistory, null, 2) : "無歷史紀錄，此為首次接觸"}

請用繁體中文回傳以下 JSON 格式（只回傳純 JSON，不要 markdown、不要其他文字）：
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
      "due_date_suggestion": "建議完成時間（例如：3天內、本週內）"
    }
  ],
  "follow_up": {
    "suggested_date": 3,
    "suggested_date_reason": "為什麼這個時間點回訪",
    "follow_up_script": "回訪時建議說的開場白"
  },
  "lifecycle_stage": {
    "stage": "初次接觸 / 需求確認 / 報價中 / 決策中 / 成交 / 流失",
    "stage_reason": "判斷理由（30字內）",
    "next_action": "建議業務員下一步做什麼"
  },
  "close_probability": {
    "percentage": 75,
    "level": "高 / 中 / 低",
    "positive_signals": ["有利成交的信號"],
    "risk_signals": ["可能流失的風險信號"],
    "suggestion": "提升成交機率的建議"
  }
}
`.trim();

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return safeParseJSON(text);
}


async function generateQuotation(customerInfo, selectedCar, conversationText) {
  const model = genAI.getGenerativeModel({ model: MODEL });

  const prompt = `
你是一位專業汽車銷售顧問 AI，請根據以下資訊生成一份正式的報價單草稿。

【客戶資訊】
${JSON.stringify(customerInfo, null, 2)}

【選定車款】
${JSON.stringify(selectedCar, null, 2)}

【對話中提及的特殊需求或備注】
${conversationText}

請用繁體中文回傳以下 JSON 格式（只回傳純 JSON，不要 markdown、不要其他文字）：
{
  "quotation": {
    "date": "今日日期",
    "valid_until": "報價有效期（7天後）",
    "customer_name": "客戶姓名",
    "car_model": "車款名稱",
    "base_price": "車輛定價",
    "options": [
      { "item": "選配項目名稱", "price": 價格 }
    ],
    "discount": 折扣金額,
    "final_price": 最終售價,
    "notes": ["備注事項"],
    "salesperson_message": "業務員給客戶的個人化訊息（50字內，溫暖自然）"
  }
}
`.trim();

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return safeParseJSON(text);
}

module.exports = {
  analyzeConversation,
  analyzeAfterConversation,
  generateQuotation,
};
