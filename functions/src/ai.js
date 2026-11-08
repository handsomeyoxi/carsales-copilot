// 共用的 Gemini 呼叫工具（gemini.js 與 advisor.js 都從這裡呼叫）
// - JSON 模式：要求模型直接回傳 JSON
// - 自動重試：Gemini 暫時塞車（503）、伺服器錯誤（500）或太頻繁（429）時等一下再試
// - 模型名稱讀環境變數 GEMINI_MODEL（functions/.env），沒設定就用預設值
const { GoogleGenerativeAI } = require("@google/generative-ai");

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const RETRY_STATUS = [429, 500, 503];
const RETRY_WAIT_MS = [2000, 4000]; // 第一次失敗等 2 秒，第二次失敗等 4 秒，總共最多試 3 次

let genAI = null;
function getClient() {
  // 第一次呼叫時才建立，這樣沒設定金鑰時不會在載入階段就讓所有 function 掛掉
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("缺少 GEMINI_API_KEY，請在 functions/.env 設定");
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

function safeParseJSON(text) {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

// 金鑰錯誤：Gemini 會回 400（API key not valid / API key expired）或 401、403。
// 這種錯誤重試沒用，直接丟出 code = "API_KEY_INVALID"，index.js 會回 503 並把訊息給前端
function isKeyError(error) {
  const message = String((error && error.message) || "");
  return (
    (error && (error.status === 401 || error.status === 403)) ||
    /API_KEY_INVALID|API key not valid|API key expired|API_KEY_EXPIRED|ACCESS_TOKEN_TYPE_UNSUPPORTED|PERMISSION_DENIED/i.test(message)
  );
}

function keyError(cause) {
  const error = new Error(
    "GEMINI_API_KEY 無效或已失效：請到 https://aistudio.google.com/apikey 建立新金鑰，" +
      "更新 functions/.env 後重新部署（本機可先跑 npm run check:key 確認）"
  );
  error.code = "API_KEY_INVALID";
  error.cause = cause;
  return error;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// temperature：分析類任務用低溫（穩定），寫話術可以稍微調高
async function askGemini(prompt, { temperature = 0.2 } = {}) {
  const model = getClient().getGenerativeModel({
    model: MODEL,
    generationConfig: { temperature, responseMimeType: "application/json" },
  });

  for (let attempt = 0; ; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return safeParseJSON(result.response.text());
    } catch (error) {
      if (isKeyError(error)) throw keyError(error);
      const canRetry = RETRY_STATUS.includes(error.status) && attempt < RETRY_WAIT_MS.length;
      if (!canRetry) throw error;
      console.warn(`Gemini 回應 ${error.status}，${RETRY_WAIT_MS[attempt] / 1000} 秒後重試（第 ${attempt + 1} 次）`);
      await sleep(RETRY_WAIT_MS[attempt]);
    }
  }
}

module.exports = { askGemini, MODEL, isKeyError };
