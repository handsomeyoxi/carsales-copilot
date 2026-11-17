// 前端呼叫後端的地方都集中在這裡
// - 網址從環境變數讀（frontend/.env），沒設定就用本機 emulator
// - 後端存的欄位名稱和畫面用的不一樣，在這裡轉好（toCustomer、toTodo、toFollowUp），頁面就不用改
//
// frontend/.env 範例：
//   EXPO_PUBLIC_FUNCTIONS_URL=http://127.0.0.1:5001/carsales-copilot/us-central1
//   EXPO_PUBLIC_SALESPERSON_ID=demo-sales
//   EXPO_PUBLIC_USE_MOCK=false
// 用手機或 iPad 測試時，127.0.0.1 要換成電腦的區網 IP（例如 192.168.1.23）

import { dayLabel } from './utils/date';

export const FUNCTIONS_URL =
  process.env.EXPO_PUBLIC_FUNCTIONS_URL || 'http://127.0.0.1:5001/carsales-copilot/us-central1';

// 沒登入時用的示範業務員 id（和 functions/scripts/seed-emulator.js 一樣）
// 登入後會用 setSalespersonId(uid) 換成登入帳號的 uid（芷璇改：const → let，函式在檔案最後）
const DEFAULT_SALESPERSON_ID = process.env.EXPO_PUBLIC_SALESPERSON_ID || 'demo-sales';
export let SALESPERSON_ID = DEFAULT_SALESPERSON_ID;

// 設成 true 就完全不連後端，只用 mockData（後端掛掉或 demo 保險用）
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === 'true';

// ---- 共用的呼叫方式 ----
async function request(name, { method = 'POST', body, query } = {}) {
  const qs = query ? '?' + new URLSearchParams(query).toString() : '';
  const res = await fetch(`${FUNCTIONS_URL}/${name}${qs}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // 後端沒回 JSON（例如 emulator 沒開），下面統一丟錯
  }
  if (!res.ok || !json || json.success === false) {
    throw new Error((json && json.error) || `${name} 失敗（HTTP ${res.status}）`);
  }
  return json;
}

// ---- 後端格式 → 畫面格式 ----

// Firestore 的時間傳過來會變成 { _seconds } 或字串，統一轉成毫秒
function toMillis(value) {
  if (!value) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Date.parse(value) || null;
  if (value._seconds !== undefined) return value._seconds * 1000;
  if (value.seconds !== undefined) return value.seconds * 1000;
  return null;
}

function daysSince(value) {
  const ms = toMillis(value);
  if (!ms) return null;
  return Math.max(0, Math.floor((Date.now() - ms) / (24 * 60 * 60 * 1000)));
}

// 後端：lifecycleStage、lastContactAt   →   畫面：stage、lastContactDays
export function toCustomer(c) {
  const needs = c.needs || {};
  return {
    ...c,
    stage: c.lifecycleStage || c.stage || '初次接觸',
    status: c.status || 'new',
    closeProbability: c.closeProbability ?? 0,
    lastContactDays: daysSince(c.lastContactAt) ?? c.lastContactDays ?? 0,
    needs: {
      ...needs,
      lookingAt: needs.lookingAt || [],
      features: needs.features || [],
      budget: needs.budget || '尚未提及',
    },
  };
}

// 後端：dueDate、isDone   →   畫面：date、done
export function toTodo(t) {
  return {
    id: t.id,
    customerId: t.customerId || null,
    task: t.task,
    priority: t.priority || 'medium',
    date: t.dueDate,
    time: t.time || '',
    done: Boolean(t.isDone),
    source: t.source,
  };
}

// 後端：dueDate   →   畫面：date、when（今天／明天／11/20）
export function toFollowUp(f) {
  return {
    id: f.id,
    customerId: f.customerId,
    date: f.dueDate,
    when: dayLabel(f.dueDate),
    reason: f.reason || '',
    script: f.followUpScript || null,
  };
}

// ---- API ----

// 首頁、客戶列表、待辦、回訪一次拿
export async function fetchDashboard(salespersonId = SALESPERSON_ID) {
  const { data } = await request('getDashboard', { method: 'GET', query: { salespersonId } });
  return {
    stats: data.stats,
    salesperson: data.salesperson || null, // 芷璇加：登入後用來載入業務員資料
    customers: data.customers.map(toCustomer),
    todos: data.todos.map(toTodo),
    followUps: data.followUps.map(toFollowUp),
  };
}

// 新增或修改待辦（沒帶 id = 新增）
// 畫面的 { date, done } 在這裡轉回後端的 { dueDate, isDone }
export async function saveTodo({ id, customerId, task, date, time, priority, done }, salespersonId = SALESPERSON_ID) {
  const body = { id, salespersonId, customerId, task, dueDate: date, time, priority, isDone: done };
  Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);
  const { data } = await request('saveTodo', { body });
  return toTodo(data);
}


// 新增或修改客戶（customerId 不存在 = 新增）
// 畫面上的 status 不從這裡存，請用 updateCustomerStatus
export async function saveCustomer({ id, name, phone, source, temperature, note, interestedCar, needs }, salespersonId = SALESPERSON_ID) {
  const body = { customerId: id, salespersonId, name, phone, source, temperature, note, interestedCar, needs };
  Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);
  const { data } = await request('saveCustomer', { body });
  return toCustomer(data);
}

// 業務員手動改客戶狀態（new / following / won），之後 AI 分析不會蓋掉
export async function updateCustomerStatus(customerId, status) {
  await request('updateCustomerStatus', { body: { customerId, status } });
}
// ---- AI 摘要頁（summary.js）----

// 客戶資料（後端格式）→ AI 摘要頁用的格式（跟 mockData 的 analysis[id] 一樣，畫面就不用大改）
// 還沒有任何 AI 分析結果的客戶回傳 null
export function toAnalysis(c) {
  if (!c) return null;
  const hardNeeds = Array.isArray(c.hardNeeds) ? c.hardNeeds : [];
  const emotional = Array.isArray(c.emotionalValues) ? c.emotionalValues : [];
  const close = c.closeAnalysis || {};
  const latest = c.latestAnalysis || {};
  if (hardNeeds.length === 0 && emotional.length === 0 && !c.closeAnalysis) return null;

  // 後端的信心值是 0~100，畫面用 0~1
  const tagOf = (type, t, text) => ({
    id: `${type}|${t.category}|${text}`,
    type, // hardNeeds / emotionalValues，存檔時要傳給後端
    label: t.category,
    value: text,
    confidence: Number.isFinite(Number(t.confidence)) ? Number(t.confidence) / 100 : 0.5,
    evidence: t.evidence || '',
    // 業務員確認或修正過的標籤（source: manual）
    review: t.source === 'manual' ? { status: t.review || 'confirmed', value: text } : null,
  });

  const analyzedAt = latest.analyzedAt ? new Date(latest.analyzedAt) : null;
  const pad = (n) => String(n).padStart(2, '0');
  const sec = Number(latest.durationSec) || 0;

  return {
    recordedAt: analyzedAt
      ? `${analyzedAt.getMonth() + 1}/${pad(analyzedAt.getDate())} ${pad(analyzedAt.getHours())}:${pad(analyzedAt.getMinutes())}`
      : null,
    duration: sec ? `${Math.floor(sec / 60)} 分 ${sec % 60} 秒` : null,
    asrConfidence: null,
    summary: (latest.summary && latest.summary.key_points) || [],
    hard: hardNeeds.filter((t) => t && t.value).map((t) => tagOf('hardNeeds', t, t.value)),
    emotion: emotional.filter((t) => t && t.label).map((t) => tagOf('emotionalValues', t, t.label)),
    lifecycle: {
      stage: c.lifecycleStage || (latest.lifecycle && latest.lifecycle.stage) || null,
      reason: (latest.lifecycle && latest.lifecycle.stage_reason) || '',
      nextAction: (latest.lifecycle && latest.lifecycle.next_action) || '',
    },
    probability: {
      percentage: close.percentage ?? c.closeProbability ?? null,
      level: close.level || '',
      positive: close.positive_signals || [],
      risk: close.risk_signals || [],
      suggestion: close.suggestion || '',
      why: close.why || '',
    },
  };
}

// 業務員按「✓ 正確」或「✎ 修正」：標籤存成 source: manual，之後 AI 不會蓋掉
// tag 是 toAnalysis 產生的標籤；value 是業務員確認或改過的內容
export async function saveCustomerTag(customerId, tag, value) {
  const body = { customerId, type: tag.type, category: tag.label, value };
  if (value !== tag.value) body.oldValue = tag.value;
  const { data } = await request('saveCustomerTag', { body });
  return data; // { customerId, hardNeeds 或 emotionalValues, needs? }
}

// ===== 以下由芷璇新增：登入、業務員資料、回訪話術 =====

// 登入後換成登入帳號的 uid；登出時傳 null，換回示範帳號
// 其他 API 的預設參數 salespersonId = SALESPERSON_ID 會在呼叫當下讀取，所以全部都會跟著換
export function setSalespersonId(id) {
  SALESPERSON_ID = id || DEFAULT_SALESPERSON_ID;
}

// 註冊後填業務員資料、編輯個人資料：存到 salespersons/{uid}
// brand 決定 AI 推薦哪個品牌的車
export async function saveSalesperson({ name, phone, email, brand }, salespersonId = SALESPERSON_ID) {
  const body = { salespersonId, name, phone, email, brand };
  Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);
  const { data } = await request('saveSalesperson', { body });
  return data;
}

// 回訪軍師：請 AI 依這位客戶的對話紀錄產生回訪建議（大約要 30 秒～1 分鐘）
// 回傳格式：{ timing: { when, reason }, channel, scripts: { opening, core, closing }, avoid_repeating, objection_prep, goal }
export async function fetchFollowUpAdvice(customerId, salespersonId = SALESPERSON_ID) {
  const { data } = await request('followUpAdvisor', { body: { customerId, salespersonId } });
  return data;
}

// ===== 以下由芷璇新增：錄音（stt-server）＋錄音後 AI 分析 =====
// 流程：startRecording → 每 30 秒 uploadSegment 一段 → finishRecording → analyzeRecording
// 錄音本身（MediaRecorder、每 30 秒切一段）寫在 src/utils/recorder.js

// import 放在這裡是為了不動到檔案上面別人的程式；JavaScript 的 import 寫在檔案任何頂層位置都可以
import { auth } from './firebase';

// stt-server 的網址：frontend/.env 設 EXPO_PUBLIC_STT_URL，沒設就用本機
export const STT_URL = process.env.EXPO_PUBLIC_STT_URL || 'http://127.0.0.1:3000';

// stt-server 每個請求都要帶登入憑證（Firebase ID token）
async function sttRequest(path, { json, form } = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('請先登入再錄音');
  const headers = { Authorization: `Bearer ${await user.getIdToken()}` };
  // 用 FormData 上傳音檔時不要自己設 Content-Type，瀏覽器會自動加上 boundary
  if (json) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${STT_URL}${path}`, { method: 'POST', headers, body: form || JSON.stringify(json || {}) });
  } catch {
    throw new Error('連不上語音伺服器，請確認 stt-server 有沒有開（npm run dev）');
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    // 沒回 JSON，下面統一處理
  }
  if (!res.ok) {
    const error = new Error((data && data.error) || `語音伺服器錯誤（HTTP ${res.status}）`);
    error.status = res.status;
    error.missing = data && data.missing; // finalize 回 409 時，列出還沒上傳的段數
    throw error;
  }
  return data;
}

// 1. 開始錄音：建立一筆對話紀錄 → { conversationId }
export async function startRecording(customerId) {
  const { conversationId } = await sttRequest('/api/conversations', { json: { customerId } });
  return { conversationId };
}

// 2. 上傳一段音檔（30 秒左右）→ { seq, text, keywords }
//    keywords 長這樣：[{ category: 'budget', value: '400萬' }, …]
export async function uploadSegment(conversationId, { blob, filename, seq, startSec, durationSec }) {
  const form = new FormData();
  form.append('audio', blob, filename);
  form.append('seq', String(seq));
  form.append('startSec', String(startSec));
  form.append('durationSec', String(durationSec));
  return sttRequest(`/api/conversations/${conversationId}/segments`, { form });
}

// 3. 結束錄音：後端把所有段落整理成「業務／客戶」對話 → { conversationText, utterances }
export async function finishRecording(conversationId, { totalSegments, durationSec }) {
  return sttRequest(`/api/conversations/${conversationId}/finalize`, { json: { totalSegments, durationSec } });
}

// 4. AI 分析：analyzeAfterConversation（成交分析、待辦、回訪）、analyzeInsight（硬需求、情緒價值標籤）
//    兩個要同時呼叫；分析頁會分開呼叫，哪一個失敗就只重試那一個
export const ANALYZE_APIS = ['analyzeInsight', 'analyzeAfterConversation'];
export async function analyzeRecording(conversationId, name) {
  const { data } = await request(name, { body: { conversationId } });
  return data;
}
