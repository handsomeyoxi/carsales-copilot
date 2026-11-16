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

// 還沒接 Firebase 登入前，先用固定的業務員 id（和 functions/scripts/seed-emulator.js 一樣）
export const SALESPERSON_ID = process.env.EXPO_PUBLIC_SALESPERSON_ID || 'demo-sales';

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