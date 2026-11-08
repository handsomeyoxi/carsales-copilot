/**
 * 直接呼叫 Gemini 原生 API（generateContent），不經過 OpenAI 相容端點
 *
 * 為什麼：Google AI Studio 現在發的金鑰是 AQ. 開頭的新格式（Auth key），
 * 原生 API 可以用，但 OpenAI 相容端點（/v1beta/openai/）可能不接受。functions 用官方 SDK 也是走原生 API。
 * 用 Node 內建的 fetch，不需要另外裝套件。
 */
import { callProvider } from './providers.js';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** 回傳模型輸出的文字（要求 JSON 格式） */
export async function geminiGenerateJson({ model, system, user, temperature = 0.2 }) {
  return callProvider('gemini', async () => {
    const res = await fetch(`${BASE}/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { temperature, responseMimeType: 'application/json' },
      }),
      signal: AbortSignal.timeout(120_000),
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
