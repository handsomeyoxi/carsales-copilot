/**
 * 檢查 .env 裡的金鑰還能不能用（換新金鑰後先跑這支）
 *
 *   npm run check:keys
 *
 * 只會列出模型清單，不會轉錄或生成任何內容，不花額度。
 * 會檢查：目前 STT_PROVIDER / LLM_PROVIDER / HYBRID_CLOUD 用到的服務，以及 .env 裡有填的其他金鑰。
 */
import fs from 'node:fs';
import { PROVIDERS } from '../src/providers.js';

if (fs.existsSync('.env')) process.loadEnvFile('.env');

const stt = process.env.STT_PROVIDER || 'groq';
const llm = process.env.LLM_PROVIDER || 'gemini';
const used = new Set([stt, llm, stt === 'hybrid' ? process.env.HYBRID_CLOUD || 'groq' : null]);
const toCheck = Object.keys(PROVIDERS).filter(
  (name) => name !== 'mock' && (used.has(name) || process.env[PROVIDERS[name].keyEnv])
);

// 各家「列出模型」的 API：金鑰錯會回 400 / 401 / 403
async function listModels(name, key) {
  if (name === 'gemini') {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', {
      headers: { 'x-goog-api-key': key },
    });
    const body = await res.json().catch(() => ({}));
    return { res, body, ids: (body.models ?? []).map((m) => m.name.replace(/^models\//, '')) };
  }
  const base = name === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1';
  const res = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${key}` } });
  const body = await res.json().catch(() => ({}));
  return { res, body, ids: (body.data ?? []).map((m) => m.id) };
}

console.log(`\n目前設定：STT_PROVIDER=${stt}　LLM_PROVIDER=${llm}\n`);
if (toCheck.length === 0) console.log('目前都用 mock，不需要金鑰。');

let failed = 0;
for (const name of toCheck) {
  const p = PROVIDERS[name];
  const key = process.env[p.keyEnv];
  const label = `${p.keyEnv}（${name}）`;
  if (!key) {
    console.log(`✗ ${label}：.env 沒有填。申請：${p.keyUrl}`);
    failed++;
    continue;
  }
  try {
    const { res, body, ids } = await listModels(name, key);
    if (!res.ok) {
      const reason = body?.error?.message ?? `${res.status} ${res.statusText}`;
      console.log(`✗ ${label}：金鑰無效或已失效（${reason}）\n    → 到 ${p.keyUrl} 建立新金鑰，貼到 stt-server/.env`);
      failed++;
      continue;
    }
    console.log(`✓ ${label}：金鑰有效（尾碼 …${key.slice(-4)}）`);

    // 順便確認要用的模型在不在
    const wanted = [];
    if (name === llm) wanted.push(process.env.LLM_MODEL || p.llmModel);
    if ((name === stt || (stt === 'hybrid' && name === (process.env.HYBRID_CLOUD || 'groq'))) && p.sttModel) {
      wanted.push(process.env.STT_MODEL || p.sttModel);
    }
    for (const model of wanted) {
      if (ids.includes(model)) console.log(`    ✓ 模型 ${model} 可以用`);
      else {
        console.log(`    ✗ 找不到模型 ${model}，請確認名稱（.env 的 LLM_MODEL / STT_MODEL）`);
        failed++;
      }
    }
  } catch (err) {
    console.log(`✗ ${label}：連不上服務（${err.cause?.code ?? err.message}），請確認網路`);
    failed++;
  }
}

console.log(failed ? `\n有 ${failed} 個問題要處理。\n` : '\n全部正常。\n');
process.exit(failed ? 1 : 0);
