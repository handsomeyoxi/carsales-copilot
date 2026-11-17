// 共用的 Gemini 呼叫工具（gemini.js 與 advisor.js 都從這裡呼叫）
// - JSON 模式：要求模型直接回傳 JSON
// - 自動換模型（品涵 10/14 的做法搬過來）：模型塞車（503）、額度用完（429）、伺服器錯誤（500）、
//   太久沒回應，或回傳的 JSON 格式壞掉時，自動改用清單裡的下一個模型；全部失敗就等 3 秒再試一輪
// - 模型清單（functions/.env，兩種寫法擇一）：
//     GEMINI_MODELS=gemini-3.8-flash,gemini-3.7-flash,gemini-3.5-flash-lite   ← 完整清單，依序嘗試
//     GEMINI_MODEL=gemini-3.8-flash                                          ← 只指定第一個，後面接預設備援
// - 單一模型最多等 GEMINI_TIMEOUT_MS（預設 45 秒），超過就換下一個，不會整支 API 卡到超時
const { GoogleGenerativeAI } = require("@google/generative-ai");

const FALLBACK_MODELS = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.5-flash-lite"];

function modelList() {
  const fromList = (process.env.GEMINI_MODELS || "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  const list = fromList.length > 0 ? fromList : [process.env.GEMINI_MODEL || FALLBACK_MODELS[0], ...FALLBACK_MODELS];
  return [...new Set(list)];
}

const MODEL_LIST = modelList();
const MODEL = MODEL_LIST[0]; // 主要模型（check-key、log 用）
const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 45000;

// 遇到這些狀態碼就換下一個模型：429 額度用完、500 伺服器錯誤、503 塞車
const SWITCH_STATUS = [429, 500, 503];
// 所有模型都失敗時，等 3 秒再從頭試一輪（最多兩輪）
// 最壞情況：3 個模型 × 45 秒 × 2 輪 ≈ 4.5 分鐘，在 index.js 的 5 分鐘上限內
const ROUNDS = 2;
const ROUND_WAIT_MS = 3000;

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
// 這種錯誤換模型也沒用，直接丟出 code = "API_KEY_INVALID"，index.js 會回 503 並把訊息給前端
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

// 換下一個模型有機會成功的錯誤：塞車、額度、伺服器錯誤、逾時、網路中斷
// 其他錯誤（例如 400 請求內容有問題）換模型也一樣會錯，直接丟出
function shouldSwitch(error) {
  if (SWITCH_STATUS.includes(error.status)) return true;
  if (error.name === "AbortError" || /aborted|timed? ?out|fetch failed|ECONNRESET|ETIMEDOUT/i.test(String(error.message))) {
    return true;
  }
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// temperature：分析類任務用低溫（穩定），寫話術可以稍微調高
async function askGemini(prompt, { temperature = 0.2 } = {}) {
  let lastError;

  for (let round = 1; round <= ROUNDS; round++) {
    for (const modelName of MODEL_LIST) {
      const model = getClient().getGenerativeModel(
        { model: modelName, generationConfig: { temperature, responseMimeType: "application/json" } },
        { timeout: TIMEOUT_MS }
      );

      let text;
      const startedAt = Date.now();
      try {
        console.log(`呼叫 Gemini：${modelName}（第 ${round} 輪）…`);
        const result = await model.generateContent(prompt);
        text = result.response.text();
        console.log(`${modelName} 回覆完成，花了 ${Math.round((Date.now() - startedAt) / 1000)} 秒`);
      } catch (error) {
        if (isKeyError(error)) throw keyError(error);
        if (!shouldSwitch(error)) throw error;
        const why = error.status ? `回應 ${error.status}` : `${Math.round((Date.now() - startedAt) / 1000)} 秒沒回應或連線中斷`;
        console.warn(`${modelName} ${why}，改用下一個模型`);
        lastError = error;
        continue;
      }

      // 模型偶爾會回傳格式壞掉的 JSON（輕量模型比較常見），這時也改用下一個模型
      try {
        return safeParseJSON(text);
      } catch (error) {
        console.warn(`${modelName} 回傳的 JSON 格式有誤（${error.message}），改用下一個模型`);
        console.warn(`回傳內容開頭：${String(text).slice(0, 300)}`);
        lastError = error;
      }
    }

    if (round < ROUNDS) {
      console.warn(`所有模型都暫時無法使用，${ROUND_WAIT_MS / 1000} 秒後再試一輪`);
      await sleep(ROUND_WAIT_MS);
    }
  }

  throw lastError;
}

module.exports = { askGemini, MODEL, MODEL_LIST, isKeyError };
