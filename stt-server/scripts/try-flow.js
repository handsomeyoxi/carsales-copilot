/**
 * 不用前端、不用真的錄音，直接打 API 把「錄音 → 轉文字 → 整理」跑一遍，確認 stt-server 正常
 * 跟前端之後要做的事情一模一樣：建立對話 → 一段一段上傳音檔 → 結束整理
 *
 * 先啟動 stt-server（npm run dev），再開另一個終端機：
 *   node scripts/try-flow.js                      用模擬對話 family-suv、客戶 c1
 *   node scripts/try-flow.js --script commuter-ev --customer c6
 *   node scripts/try-flow.js --analyze            整理完再呼叫 functions 的 analyzeAfterConversation（需要 GEMINI_API_KEY）
 *
 * 建議 .env：STT_PROVIDER=mock、LLM_PROVIDER=mock、SKIP_AUTH=true（不需要金鑰、不需要登入）
 */
const args = process.argv.slice(2);
const arg = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);

const STT_URL = arg('--stt', 'http://127.0.0.1:3000');
const FUNCTIONS_URL = arg('--functions', 'http://127.0.0.1:5001/carsales-copilot/us-central1');
const script = arg('--script', 'family-suv');
const customerId = arg('--customer', 'c1');
const segments = Number(arg('--segments', 3));

async function call(url, options = {}) {
  const res = await fetch(url, options);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${options.method || 'GET'} ${url} → HTTP ${res.status}：${json.error || '沒有錯誤訊息'}`);
  return json;
}

async function main() {
  const health = await call(`${STT_URL}/health`);
  console.log(`stt-server 正常：STT=${health.stt}、LLM=${health.llm}`);

  // 1. 開始錄音
  const { conversationId } = await call(`${STT_URL}/api/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId, mockScript: script }),
  });
  console.log(`1. 建立對話：${conversationId}（客戶 ${customerId}、模擬對話 ${script}）`);

  // 2. 上傳音檔：模擬模式不會聽內容，送一小段假的音檔就好
  for (let seq = 0; seq < segments; seq++) {
    const form = new FormData();
    form.append('audio', new Blob([new Uint8Array(1024)], { type: 'audio/m4a' }), `seg-${seq}.m4a`);
    form.append('seq', String(seq));
    form.append('startSec', String(seq * 30));
    form.append('durationSec', '30');
    const r = await call(`${STT_URL}/api/conversations/${conversationId}/segments`, { method: 'POST', body: form });
    const keywords = (r.keywords || []).map((k) => `${k.category}:${k.value}`).join('、');
    console.log(`2. 第 ${seq + 1} 段：${r.text.slice(0, 40)}…${keywords ? `（關鍵字：${keywords}）` : ''}`);
  }

  // 3. 結束 → 整理
  const done = await call(`${STT_URL}/api/conversations/${conversationId}/finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ totalSegments: segments, durationSec: segments * 30 }),
  });
  console.log(`3. 整理完成，共 ${done.utterances.length} 句：\n`);
  console.log(done.conversationText);

  if (!args.includes('--analyze')) {
    console.log(`\n✅ stt-server 流程正常。要接著測 AI 分析：node scripts/try-flow.js --analyze`);
    return;
  }

  // 4. AI 分析：只帶 conversationId，逐字稿和客戶由 functions 從同一筆對話紀錄讀
  console.log('\n4. 呼叫 analyzeAfterConversation…');
  const analysis = await call(`${FUNCTIONS_URL}/analyzeAfterConversation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId }),
  });
  const a = analysis.data;
  console.log(`   摘要：${a.summary}`);
  console.log(`   階段：${a.lifecycle_stage?.stage}、成交機率：${a.close_probability?.percentage}%`);
  console.log(`   待辦：${(a.todos || []).map((t) => t.task).join('、')}`);
  console.log('\n✅ 錄音 → 轉文字 → AI 分析 全部接通');
}

main().catch((error) => {
  console.error(`\n❌ ${error.message}`);
  if (/fetch failed|ECONNREFUSED/.test(error.message)) {
    console.error('   連不上：stt-server（npm run dev）或 emulator 有在跑嗎？');
  }
  process.exit(1);
});