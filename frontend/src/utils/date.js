// 日期小工具：一律用「YYYY-MM-DD」字串存日期，畫面上再轉成「今天／明天／10/18」

const pad = (n) => String(n).padStart(2, '0');

export function toISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 今天往後 n 天的日期字串（n 可以是負數）
export function addDays(n, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + n);
  return toISO(d);
}

export function todayISO() {
  return toISO(new Date());
}

// 2026-10-18 → 今天 / 明天 / 後天 / 10/18
export function dayLabel(iso) {
  if (!iso) return '';
  if (iso === addDays(0)) return '今天';
  if (iso === addDays(1)) return '明天';
  if (iso === addDays(2)) return '後天';
  const [, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}`;
}

export const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
