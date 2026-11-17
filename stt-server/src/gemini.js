/**
 * 直接呼叫 Gemini 原生 API（generateContent），不經過 OpenAI 相容端點
 *
 * 為什麼：Google AI Studio 現在發的金鑰是 AQ. 開頭的新格式（Auth key），
 * 原生 API 可以用，但 OpenAI 相容端點（/v1beta/openai/）可能不接受。functions 用官方 SDK 也是走原生 API。
 * 用 Node 內建的 fetch，不需要另外裝套件。
 */
import { callProvider } from './providers.js';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Gemini 常常 503（忙線）或卡住：依序換模型，每個模型有自己的逾時，全部失敗等一下再整輪重試一次
// （跟 functions/src/ai.js 同一套做法）
const FALLBACK_MODELS = ['gemini-3.7-flash', 'gemini-3.5-flash-lite'];

export function modelList(model) {
  const fromEnv = (process.env.GEMINI_MODELS || '').split(',').map((m) => m.trim()).filter(Boolean);
  const list = fromEnv.length ? fromEnv : [model, ...FALLBACK_MODELS];
  return [...new Set(list.filter(Boolean))];
}

/** 這種錯誤換模型可能就好：429 額度、5xx 忙線、逾時／斷線、沒回傳內容 */
function shouldTryNext(err) {
  if (err?.code === 'API_KEY_INVALID') return false;
  const s = err?.status;
  if (s === 429 || (s >= 500 && s < 600)) return true;
  if (s === undefined) return true; // 逾時（TimeoutError / AbortError）、網路錯誤、空回應
  return false;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callOnce({ model, system, user, temperature }) {
  return callProvider('gemini', async () => {
    const res = await fetch(`${BASE}/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { temperature, responseMimeType: 'application/json' },
      }),
      signal: AbortSignal.timeout(Number(process.env.GEMINI_TIMEOUT_MS) || 60_000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = body?.error?.message ?? res.statusText;
      const reason = body?.error?.details?.map((d) => d.reason).filter(Boolean).join(',') ?? '';
      const err = new Error(`Gemini ${res.status}：${detail}${reason ? `（${reason}）` : ''}`);
      err.status = res.status;
      throw err;
    }
    const candidate = body.candidates?.[0];
    const text = candidate?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text) throw new Error(`Gemini 沒有回傳內容（${candidate?.finishReason ?? body.promptFeedback?.blockReason ?? '原因不明'}）`);
    return text;
  });
}

/** 回傳模型輸出的文字（要求 JSON 格式）；主要模型忙線時自動換下一個 */
export async function geminiGenerateJson({ model, system, user, temperature = 0.2 }) {
  const models = modelList(model);
  const rounds = 2;
  const waitMs = process.env.GEMINI_RETRY_WAIT_MS !== undefined ? Number(process.env.GEMINI_RETRY_WAIT_MS) : 3000;
  let lastErr;
  for (let round = 0; round < rounds; round++) {
    if (round > 0) await sleep(waitMs);
    for (const m of models) {
      try {
        return await callOnce({ model: m, system, user, temperature });
      } catch (err) {
        lastErr = err;
        if (!shouldTryNext(err)) throw err;
        console.warn(`[gemini] ${m} 失敗（${err.status ?? err.name}：${err.message}），換下一個模型`);
      }
    }
  }
  throw lastErr;
}
