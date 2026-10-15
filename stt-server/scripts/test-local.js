/**
 * 不需要前端、不需要 Firebase 的本機測試
 *
 * 用法：
 *   node scripts/test-local.js 錄音檔.m4a
 *   node scripts/test-local.js 錄音檔.m4a --raw     （只轉文字，不做 LLM 整理，比較省錢）
 *
 * 需要：backend/.env 裡有 GROQ_API_KEY（語音轉文字）和 GEMINI_API_KEY（文字整理），兩個都免費
 * 支援格式：m4a、mp3、wav、webm、mp4（單檔 25MB 以內，約 20 分鐘以上的錄音請先剪短）
 * 結果會印在終端機，並存成同檔名的 .result.json
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { transcribe } from '../src/stt/index.js';
import { detectKeywords } from '../src/vocab.js';
import { organizeTranscript } from '../src/organize.js';

const file = process.argv[2];
const rawOnly = process.argv.includes('--raw');

if (!file) {
  console.log('請指定音檔，例如：node scripts/test-local.js test.m4a');
  process.exit(1);
}
if (!fs.existsSync(file)) {
  console.log(`找不到檔案：${file}`);
  process.exit(1);
}
const sttName = process.env.STT_PROVIDER || 'groq';
const llmName = process.env.LLM_PROVIDER || 'gemini';
const keyOf = { groq: 'GROQ_API_KEY', gemini: 'GEMINI_API_KEY', openai: 'OPENAI_API_KEY' };
for (const name of [sttName, rawOnly ? null : llmName]) {
  if (keyOf[name] && !process.env[keyOf[name]]) {
    console.log(`請先在 backend/.env 填入 ${keyOf[name]}（目前設定使用 ${name}）`);
    process.exit(1);
  }
}

const buffer = fs.readFileSync(file);
const sizeMB = buffer.length / 1024 / 1024;
if (sizeMB > 25) {
  console.log(`檔案 ${sizeMB.toFixed(1)}MB 超過 25MB 上限，請先剪短`);
  process.exit(1);
}

const line = '─'.repeat(50);
console.log(`\n音檔：${path.basename(file)}（${sizeMB.toFixed(2)}MB）`);
console.log(`語音引擎：${sttName}　整理用 LLM：${rawOnly ? '（略過）' : llmName}\n`);

// 1. 語音轉文字
let t = Date.now();
const { text, candidates } = await transcribe(buffer, path.basename(file));
console.log(`${line}\n【1. 原始逐字稿】（${((Date.now() - t) / 1000).toFixed(1)} 秒）\n${line}`);
console.log(text || '（沒有辨識到內容）');
if (candidates) {
  console.log(`\n[雲端版本] ${candidates.cloud}\n[breeze 版本] ${candidates.breeze}`);
}

// 2. 規則式關鍵字（App 上的「即時偵測到」）
const keywords = detectKeywords(text);
console.log(`\n${line}\n【2. 即時偵測關鍵字】\n${line}`);
console.log(keywords.length ? keywords.map((k) => `${k.type}：${k.value}`).join('\n') : '（無）');

const output = { file: path.basename(file), text, candidates, keywords };

// 3. LLM 整理
if (!rawOnly && text) {
  t = Date.now();
  const organized = await organizeTranscript([{ seq: 0, text, candidates }]);
  output.organized = organized;

  console.log(`\n${line}\n【3. 整理後對話】（${((Date.now() - t) / 1000).toFixed(1)} 秒）\n${line}`);
  const who = { sales: '業務', customer: '客戶', unknown: '未知' };
  for (const u of organized.utterances) {
    console.log(`${who[u.speaker]}：${u.text}`);
    if (u.original) console.log(`      （原話：${u.original}）`);
  }
  console.log(`\n【摘要】\n${organized.summary}`);
  console.log(`\n【標籤】\n${organized.labels.map((l) => `${l.type}：${l.value}（${l.confidence}）`).join('\n')}`);
  if (organized.uncertain.length) {
    console.log(`\n【需要確認】\n${organized.uncertain.map((u) => `⚠ ${u}`).join('\n')}`);
  }
}

const outPath = file.replace(/\.[^.]+$/, '') + '.result.json';
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
console.log(`\n完整結果已存到：${outPath}\n`);
