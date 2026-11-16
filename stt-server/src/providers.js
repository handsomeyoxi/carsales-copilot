/**
 * 三家服務都相容 OpenAI 的 API 寫法，只要換 baseURL 和金鑰就能切換。
 *
 * | 名稱   | 免費？     | 語音轉文字          | 文字整理 LLM            |
 * |--------|------------|---------------------|-------------------------|
 * | groq   | 有免費額度 | whisper-large-v3    | llama-3.3-70b-versatile |
 * | gemini | 有免費額度 | （不使用）          | gemini-3.8-flash 等（原生 API，見 gemini.js）|
 * | openai | 付費       | gpt-4o-transcribe   | gpt-4o                  |
 * | mock   | 不用金鑰   | 模擬對話（不聽音檔）| 模擬整理                |
 *
 * mock 是測試用：STT_PROVIDER=mock / LLM_PROVIDER=mock，不呼叫任何外部服務，見 src/mock/。
 */
export const PROVIDERS = {
  groq: {
    baseURL: 'https://api.groq.com/openai/v1',
    keyEnv: 'GROQ_API_KEY',
    keyUrl: 'https://console.groq.com/keys',
    sttModel: 'whisper-large-v3',
    llmModel: 'llama-3.3-70b-versatile',
  },
  gemini: {
    // organize.js 實際是用 gemini.js 走原生 API；這個 baseURL 只在有人改用 OpenAI 寫法時才會用到
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    keyEnv: 'GEMINI_API_KEY',
    keyUrl: 'https://aistudio.google.com/apikey',
    sttModel: null,
    llmModel: 'gemini-3.8-flash',
  },
  openai: {
    baseURL: undefined,
    keyEnv: 'OPENAI_API_KEY',
    keyUrl: 'https://platform.openai.com/api-keys',
    sttModel: 'gpt-4o-transcribe',
    llmModel: 'gpt-4o',
  },
  mock: {
    baseURL: undefined,
    keyEnv: null,
    keyUrl: null,
    sttModel: 'mock',
    llmModel: 'mock',
  },
};

const clients = {};

export async function getProvider(name) {
  const p = PROVIDERS[name];
  if (!p) throw new Error(`不支援的服務：${name}（可用：${Object.keys(PROVIDERS).join('、')}）`);
  if (name === 'mock') return { name, client: null, ...p };
  if (name === 'gemini' && !process.env.GEMINI_API_KEY) {
    throw new Error(`使用 gemini 需要在 .env 設定 GEMINI_API_KEY（申請：${p.keyUrl}）`);
  }
  // Gemini 用原生 API（gemini.js），不需要建立 OpenAI client
  if (name === 'gemini') return { name, client: null, ...p };

  const apiKey = process.env[p.keyEnv];
  if (!apiKey) throw new Error(`使用 ${name} 需要在 .env 設定 ${p.keyEnv}（申請：${p.keyUrl}）`);
  if (!clients[name]) {
    // 用到才載入 openai 套件：mock 模式和單元測試不需要裝它
    const { default: OpenAI } = await import('openai');
    clients[name] = new OpenAI({ apiKey, baseURL: p.baseURL });
  }
  return { name, client: clients[name], ...p };
}

/**
 * 判斷是不是「金鑰無效／過期／沒權限」：
 *   Groq / OpenAI 回 401；Gemini 回 400 並寫 "API key not valid" 或 "API key expired"
 * 這種錯誤重試沒用，要換金鑰。
 */
export function isKeyError(err) {
  const status = err?.status;
  const text = `${err?.message ?? ''} ${JSON.stringify(err?.error ?? '')}`;
  return (
    status === 401 ||
    status === 403 ||
    /API[_ ]KEY[_ ]INVALID|API key not valid|API key expired|API_KEY_EXPIRED|ACCESS_TOKEN_TYPE_UNSUPPORTED|invalid[_ ]api[_ ]key|Incorrect API key/i.test(text)
  );
}

export class ApiKeyError extends Error {
  constructor(providerName, cause) {
    const p = PROVIDERS[providerName] ?? {};
    super(
      `${p.keyEnv ?? providerName} 無效或已失效：請到 ${p.keyUrl} 建立新金鑰，` +
        '更新 stt-server/.env 後重新啟動（可先跑 npm run check:keys 確認）'
    );
    this.code = 'API_KEY_INVALID';
    this.provider = providerName;
    this.cause = cause;
  }
}

/** 包住一次 API 呼叫：遇到金鑰錯誤就換成清楚的 ApiKeyError */
export async function callProvider(providerName, fn) {
  try {
    return await fn();
  } catch (err) {
    if (isKeyError(err)) throw new ApiKeyError(providerName, err);
    throw err;
  }
}
