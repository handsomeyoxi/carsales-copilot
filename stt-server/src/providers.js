import OpenAI from 'openai';

/**
 * 三家服務都相容 OpenAI 的 API 寫法，只要換 baseURL 和金鑰就能切換。
 *
 * | 名稱   | 免費？ | 語音轉文字            | 文字整理 LLM             |
 * |--------|--------|-----------------------|--------------------------|
 * | groq   | 有免費額度 | whisper-large-v3   | llama-3.3-70b-versatile  |
 * | gemini | 有免費額度 | （不使用）          | gemini-3.8-flash 等      |
 * | openai | 付費   | gpt-4o-transcribe     | gpt-4o                   |
 */
const PROVIDERS = {
  groq: {
    baseURL: 'https://api.groq.com/openai/v1',
    keyEnv: 'GROQ_API_KEY',
    sttModel: 'whisper-large-v3',
    llmModel: 'llama-3.3-70b-versatile',
  },
  gemini: {
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    keyEnv: 'GEMINI_API_KEY',
    sttModel: null,
    llmModel: 'gemini-3.8-flash',
  },
  openai: {
    baseURL: undefined,
    keyEnv: 'OPENAI_API_KEY',
    sttModel: 'gpt-4o-transcribe',
    llmModel: 'gpt-4o',
  },
};

const clients = {};

export function getProvider(name) {
  const p = PROVIDERS[name];
  if (!p) throw new Error(`不支援的服務：${name}（可用：${Object.keys(PROVIDERS).join('、')}）`);
  const apiKey = process.env[p.keyEnv];
  if (!apiKey) throw new Error(`使用 ${name} 需要在 .env 設定 ${p.keyEnv}`);
  clients[name] ??= new OpenAI({ apiKey, baseURL: p.baseURL });
  return { client: clients[name], ...p };
}
