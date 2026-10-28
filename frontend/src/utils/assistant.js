// AI 助理的回覆（示範版）：用關鍵字判斷問題，從 App 裡的資料組出回答
// 之後接後端時，把 askAssistant 改成呼叫 Gemini 的 API（把客戶資料一起當成 prompt 送出），
// 回傳一樣的格式 { text, actions } 就好，聊天畫面不用改。
// actions：回覆下方的按鈕，例如 { label: '看回訪話術', path: '/revisit', params: { id: 'c1' } }
import { followUps, revisit } from '../data/mockData';
import { compareWithRival, dealAnalysis, recommendCars } from './insights';
import { dayLabel, todayISO } from './date';

export const SUGGESTIONS = [
  '今天該先聯絡誰？',
  '陳志豪適合推哪台車？',
  'X5 跟 Benz GLE 差在哪？',
  '幫我寫給林雅婷的 LINE',
  '幫我新增待辦',
];

export function askAssistant(question, { customers, todos, profile }) {
  const q = question.trim();
  const brand = profile.brand || 'BMW';
  const customer = customers.find((c) => q.includes(c.name));

  // 1. 今天該聯絡誰
  if (/誰|先聯絡|回訪|今天/.test(q) && !customer) {
    const today = todayISO();
    // 依回訪日期排序，最急的排前面
    const list = [...followUps].sort((a, b) => (a.date > b.date ? 1 : -1)).slice(0, 3);
    const lines = list.map((f, i) => {
      const c = customers.find((x) => x.id === f.customerId);
      return `${i + 1}. ${c?.name}（${dayLabel(f.date)}，成交機率 ${c?.closeProbability}%）：${f.reason}`;
    });
    const todayTodos = todos.filter((t) => !t.done && t.date === today).length;
    return {
      text: `建議的聯絡順序：\n${lines.join('\n')}\n\n另外今天還有 ${todayTodos} 件待辦。先從成交機率最高、時間最急的開始。`,
      actions: list.slice(0, 1).map((f) => ({
        label: `看 ${customers.find((x) => x.id === f.customerId)?.name} 的話術`,
        path: '/revisit',
        params: { id: f.customerId },
      })),
    };
  }

  // 2. 某位客戶適合推哪台車
  if (customer && /推|車|適合|建議/.test(q) && !/LINE|訊息/.test(q)) {
    const recs = recommendCars(customer, brand);
    const lines = recs.map(
      (r, i) => `${i + 1}. ${r.name}（示範價格 ${r.priceFrom} 萬起）\n   理由：${r.reasons.join('、') || '同級熱門車款'}${r.overBudget ? '\n   ⚠️ 超出預算，可搭配分期方案' : ''}`
    );
    return {
      text: `${customer.name}的需求：${customer.needs?.type || '未知車型'}、預算${customer.needs?.budget || '未提及'}、${
        customer.needs?.usage || ''
      }。\n\n建議推薦 ${brand}：\n${lines.join('\n')}`,
      actions: [{ label: `打開${customer.name}的資料`, path: `/customer/${customer.id}` }],
    };
  }

  // 3. 競品比較
  if (/差|比較|對手|競品|GLE|GLC|RAV4|Tesla/.test(q)) {
    const target = customer || customers.find((c) => (c.needs?.lookingAt || []).some((n) => q.includes(n.split(' ').pop())));
    const cmp = target ? compareWithRival(target, brand) : null;
    if (cmp) {
      return {
        text: `${cmp.ours.name} vs ${cmp.rivalName}\n\n我們的優勢：\n${cmp.ourStrengths.map((s) => `＋ ${s}`).join('\n')}\n\n對手的優勢：\n${cmp.theirStrengths
          .map((s) => `－ ${s}`)
          .join('\n')}\n\n建議說法：「${cmp.pitch}」\n\n（示範內容，正式版會依原廠規格由 AI 產生）`,
        actions: [{ label: `打開${target.name}的資料`, path: `/customer/${target.id}` }],
      };
    }
  }

  // 4. 幫我寫 LINE 訊息
  if (customer && /LINE|訊息|寫/.test(q)) {
    const r = revisit[customer.id];
    const opener = r ? r.openers[0].text : `${customer.name}您好，最近好嗎？上次聊到的車款有新的優惠，想跟您分享一下。`;
    return {
      text: `可以這樣傳給${customer.name}：\n\n「${opener}${r ? ' 有空的話這週可以再來店裡坐坐，我幫您安排。' : ''}」\n\n你可以直接複製，或改成自己的語氣。`,
      actions: [{ label: '看完整回訪話術', path: '/revisit', params: { id: customer.id } }],
    };
  }

  // 5. 新增待辦
  if (/待辦|提醒我|記得/.test(q)) {
    const task = q.replace(/幫我|新增|待辦|提醒我|記得|[，。：:]/g, '').trim();
    return {
      text: task ? `好的，幫你準備好這件待辦：「${task}」，按下面按鈕選日期就完成了。` : '好的，按下面的按鈕，選好日期和內容就能加到行事曆。',
      actions: [{ label: '＋ 新增待辦', path: '/todo-add', params: { task, customerId: customer?.id || '' } }],
    };
  }

  // 6. 成交機率
  if (customer && /機率|成交|分析/.test(q)) {
    const d = dealAnalysis(customer);
    return {
      text: `${customer.name}目前成交機率 ${d.percentage}%（${d.level}）。\n\n${d.why}\n\n建議下一步：${d.suggestion}`,
      actions: [{ label: `打開${customer.name}的資料`, path: `/customer/${customer.id}` }],
    };
  }

  // 其他
  return {
    text: '我可以幫你：\n• 排今天的聯絡順序\n• 依客戶需求推薦自家車款\n• 比較自家車和對手車款\n• 寫回訪的 LINE 訊息\n• 新增待辦到行事曆\n\n問的時候帶上客戶名字，我會回答得更準。',
    actions: [],
  };
}
