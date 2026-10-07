// D 組負責的 AI 功能：硬需求標籤、情緒價值標籤、情緒分析、回訪軍師
// 與 gemini.js 分開放，避免兩個人同時改同一個檔案。
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 要跟 gemini.js 裡的 MODEL 保持一致
const MODEL = "gemini-3.8-flash";

// 分析類任務要穩定，所以溫度調低，並要求直接回傳 JSON
const GENERATION_CONFIG = {
  temperature: 0.2,
  responseMimeType: "application/json",
};

function safeParseJSON(text) {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

// Gemini 暫時塞車（503）、伺服器錯誤（500）或太頻繁（429）時，等一下自動重試
const RETRY_STATUS = [429, 500, 503];
const RETRY_WAIT_MS = [2000, 4000]; // 第一次失敗等 2 秒，第二次失敗等 4 秒，總共最多試 3 次

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function askGemini(prompt) {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: GENERATION_CONFIG,
  });

  for (let attempt = 0; ; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return safeParseJSON(result.response.text());
    } catch (error) {
      const canRetry = RETRY_STATUS.includes(error.status) && attempt < RETRY_WAIT_MS.length;
      if (!canRetry) throw error;
      console.warn(`Gemini 回應 ${error.status}，${RETRY_WAIT_MS[attempt] / 1000} 秒後重試（第 ${attempt + 1} 次）`);
      await sleep(RETRY_WAIT_MS[attempt]);
    }
  }
}

// 功能一：從單次對話抓出「硬需求標籤」「情緒價值標籤」與「客戶情緒」
async function analyzeInsight(conversationText) {
  const prompt = `
你是一位資深汽車銷售顧問 AI，以下是業務員與客戶的對話逐字稿。
請把客戶的資訊整理成標籤，並判斷客戶的情緒狀態。

【對話逐字稿】
${conversationText}

【要整理的內容】
一、硬需求標籤（hard_needs）：客戶對車子本身的具體條件。
category 只能是以下其中之一：
車款、車型、顏色、預算、配備、用途、購車時間、付款方式、舊車換購、決策者、其他

二、情緒價值標籤（emotional_values）：客戶買車背後在意的感受與動機。
category 只能是以下三種之一：
- 家庭：與家人有關的在意點，例如小孩安全、長輩上下車、伴侶的意見
- 時間：與時間有關的在意點，例如急著用車、通勤太久、沒空保養、在意交車期
- 心理：與個人感受有關的在意點，例如怕買貴、怕後悔、想要安全感、在意面子或品牌

三、顧慮（concerns）：客戶擔心或猶豫的點。

四、情緒（emotion）：客戶這次對話的整體情緒。

【規則】
1. 只能根據逐字稿內容整理。逐字稿沒有提到的就不要產生標籤，不可以猜測或自行補充；沒有任何標籤時回傳空陣列 []。
2. evidence 必須是客戶在逐字稿中說過的原話，不可以改寫或捏造。
3. confidence 是 0 到 100 的整數，代表你對這個標籤的把握：
   - 90 以上：客戶明確說出口
   - 60 到 89：客戶沒有直接說，但從原話可以合理推得
   - 40 到 59：只是有跡象，需要業務再確認
   - 低於 40 的標籤不要輸出
4. 每個標籤只放一件事。同一個 category 可以有多個標籤（例如兩種配備就是兩個標籤）。
5. 全部使用繁體中文。

請回傳以下 JSON 格式（只回傳純 JSON）：
{
  "hard_needs": [
    {
      "category": "預算",
      "value": "標籤內容，簡短，例如：100 萬以內",
      "confidence": 95,
      "evidence": "客戶原話"
    }
  ],
  "emotional_values": [
    {
      "category": "家庭",
      "label": "標籤內容，簡短，例如：重視小孩乘車安全",
      "confidence": 80,
      "evidence": "客戶原話"
    }
  ],
  "concerns": ["客戶擔心或猶豫的點，簡短"],
  "emotion": {
    "interest_level": 3,
    "mood": "用一句話描述客戶的情緒，例如：有興趣但對價格猶豫",
    "evidence": ["支持這個判斷的客戶原話，1-3 句"],
    "empathy_script": "建議業務員如何回應這個情緒的一句話（自然、像真人在說）"
  }
}

interest_level 為 1 到 5 的整數：1 = 只是看看，3 = 有興趣但還在比較，5 = 非常想買。
`.trim();

  return askGemini(prompt);
}

// 功能二：回訪軍師，根據這位客戶累積的所有紀錄給三段話術與避免重提清單
async function followUpAdvisor(customer, history, today) {
  const prompt = `
你是一位資深汽車銷售主管，正在指導業務員準備回訪客戶。
請根據這位客戶累積的資料，給出這一次回訪的具體作戰建議。

【今天日期】
${today}

【客戶目前狀態】
（hardNeeds 是硬需求標籤，emotionalValues 是情緒價值標籤，confidence 是當時 AI 對該標籤的把握，0 到 100）
${JSON.stringify(customer, null, 2)}

【歷次對話紀錄（由新到舊）】
${JSON.stringify(history, null, 2)}

【規則】
1. 所有建議都必須對應到上面資料中實際出現的標籤、顧慮或情緒，不可以憑空捏造客戶沒說過的事。
2. 三段話術（scripts）是業務回訪時可以直接照著說的話，三段要連貫：
   - opening（開場）：破冰、拉近關係，優先從情緒價值標籤切入，不要一開口就談車或價格
   - core（核心）：回應客戶最在意的硬需求或顧慮，給出具體的資訊或解法
   - closing（收尾）：提出一個明確、門檻低的下一步，例如邀約試駕或帶家人來看車
3. 避免重提清單（avoid_repeating）：列出這次回訪不要再提的話題，包含客戶已經明確拒絕的、已經解決的、或再提會讓客戶反感的。只能根據紀錄列出，沒有就回傳 []。
4. confidence 低於 60 的標籤代表還不確定，話術中要用詢問的方式確認，不要當成事實來講。
5. 資料不足以判斷的欄位填 null（陣列填 []）。
6. 話術要自然、像真人在說，不要太制式。全部使用繁體中文。

請回傳以下 JSON 格式（只回傳純 JSON）：
{
  "timing": {
    "when": "建議什麼時候回訪，例如：3 天內",
    "reason": "為什麼是這個時間點"
  },
  "channel": "建議的聯絡方式：LINE / 電話 / 邀約到店",
  "scripts": {
    "opening": {
      "script": "開場要說的話",
      "based_on": "這段話是根據哪個標籤或紀錄"
    },
    "core": {
      "script": "核心要說的話",
      "based_on": "這段話是根據哪個標籤或顧慮"
    },
    "closing": {
      "script": "收尾要說的話",
      "based_on": "為什麼選這個下一步"
    }
  },
  "avoid_repeating": [
    {
      "topic": "不要再提的話題",
      "reason": "為什麼不要提"
    }
  ],
  "objection_prep": [
    {
      "objection": "客戶可能提出的疑慮",
      "response": "建議的回應方式"
    }
  ],
  "goal": "這次回訪要達成的具體目標，例如：約到本週末試駕"
}
`.trim();

  return askGemini(prompt);
}

module.exports = {
  analyzeInsight,
  followUpAdvisor,
};
