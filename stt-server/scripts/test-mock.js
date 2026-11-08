/**
 * 用「模擬對話」測試語音轉文字後面的流程：不需要錄音、不會有真實客戶的聲音
 *
 *   npm run test:mock                    全部模擬對話，整理用 .env 的 LLM_PROVIDER（例如 gemini，會用到免費額度）
 *   npm run test:mock -- --offline       完全不呼叫 AI（LLM 用 mock），只檢查流程與即時關鍵字
 *   npm run test:mock -- --id family-suv 只跑一段
 *
 * 模擬對話在 src/mock/conversations.json，可以自己加。
 * 流程跟正式 API 一樣：每段「辨識文字」→ 即時關鍵字 → 全部段落交給 LLM 整理 → 產生給 AI 分析的 conversationText
 * 結果存到 test-output/（已加進 .gitignore）。
 * 想再接著測品涵的標籤和 E 組的分析：functions 資料夾跑 npm run test:mock（讀這裡產生的 conversationText）。
 */
import fs from 'node:fs';
import { MOCK_CONVERSATIONS, segmentRawText } from '../src/mock/index.js';
import { detectKeywords, mergeKeywords } from '../src/vocab.js';
import { organizeTranscript, formatConversationText } from '../src/organize.js';

if (fs.existsSync('.env')) process.loadEnvFile('.env');

const args = process.argv.slice(2);
const offline = args.includes('--offline');
const onlyId = args.includes('--id') ? args[args.indexOf('--id') + 1] : null;
if (offline) process.env.LLM_PROVIDER = 'mock';
const llm = process.env.LLM_PROVIDER || 'gemini';

const list = onlyId ? MOCK_CONVERSATIONS.filter((c) => c.id === onlyId) : MOCK_CONVERSATIONS;
if (list.length === 0) {
  console.log(`找不到「${onlyId}」，可用：${MOCK_CONVERSATIONS.map((c) => c.id).join('、')}`);
  process.exit(1);
}

const line = '─'.repeat(50);
const who = { sales: '業務', customer: '客戶', unknown: '未知' };
fs.mkdirSync('test-output', { recursive: true });
console.log(`\n整理用 LLM：${llm}${llm === 'mock' ? '（不呼叫 AI）' : ''}`);

let problems = 0;
for (const conv of list) {
  console.log(`\n${line}\n【${conv.id}】${conv.title}\n${line}`);

  const segments = conv.segments.map((seg, seq) => {
    const text = segmentRawText(seg);
    return { seq, text, candidates: null, keywords: detectKeywords(text) };
  });
  for (const s of segments) console.log(`第${s.seq}段 辨識：${s.text}`);

  const keywords = mergeKeywords(segments.map((s) => s.keywords));
  console.log(`\n即時關鍵字：${keywords.map((k) => `${k.category}:${k.value}`).join('、') || '（無）'}`);
  const gotCats = new Set(keywords.map((k) => k.category));
  const missing = conv.expect.keywords.filter((c) => !gotCats.has(c));
  if (missing.length) {
    console.log(`  ✗ 預期要抓到但沒抓到的類別：${missing.join('、')}`);
    problems++;
  } else console.log('  ✓ 預期的關鍵字類別都有抓到');

  let organized;
  const t = Date.now();
  try {
    organized = await organizeTranscript(segments);
  } catch (err) {
    console.log(`\n✗ 整理失敗：${err.message}`);
    if (err.code === 'API_KEY_INVALID') console.log('  （先跑 npm run check:keys，或加 --offline 只測流程）');
    problems++;
    continue;
  }
  console.log(`\n整理後（${((Date.now() - t) / 1000).toFixed(1)} 秒）：`);
  for (const u of organized.utterances) {
    console.log(`  ${who[u.speaker]}：${u.text}${u.original ? `　（原話：${u.original}）` : ''}`);
  }
  console.log(`摘要：${organized.summary}`);
  if (organized.uncertain.length) console.log(`需要確認：${organized.uncertain.join('；')}`);

  // 說話者判斷：跟劇本比，對幾句
  const expectedSpeakers = conv.segments.flatMap((s) => s.lines.map((l) => l.speaker));
  const speakers = organized.utterances.map((u) => u.speaker);
  const same = expectedSpeakers.filter((sp, i) => speakers[i] === sp).length;
  console.log(`說話者判斷：${same}/${expectedSpeakers.length} 句跟劇本一致`);
  if (!speakers.includes('customer')) {
    console.log('  ✗ 一句客戶的話都沒有，說話者判斷可能有問題');
    problems++;
  }

  const conversationText = formatConversationText(organized.utterances);
  fs.writeFileSync(
    `test-output/${conv.id}.json`,
    JSON.stringify({ id: conv.id, title: conv.title, llm, segments, keywords, transcript: organized, conversationText, expect: conv.expect }, null, 2),
    'utf8'
  );
}

console.log(`\n${line}\n${problems ? `有 ${problems} 個問題` : '全部通過'}，結果在 test-output/\n`);
process.exit(problems ? 1 : 0);
