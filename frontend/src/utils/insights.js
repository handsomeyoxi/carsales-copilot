// 客戶詳情頁用的「推薦自家車款」「成交機率分析」「競品比較」
// 目前是前端用規則算的示範版；之後可以改成呼叫後端 AI，回傳一樣的格式就好
import { analysis } from '../data/mockData';
import { brandOf, catalog } from '../data/cars';

// ① 推薦自家品牌車款：依車型、預算、在意的配備打分數，取前兩名
export function recommendCars(customer, brand) {
  const models = catalog[brand] || [];
  const needs = customer.needs || {};
  const scored = models.map((m) => {
    let score = 0;
    const reasons = [];
    if ((needs.lookingAt || []).includes(m.name)) {
      score += 5;
      reasons.push('客戶本來就在看這台');
    }
    if (needs.type && m.type === needs.type) {
      score += 3;
      reasons.push(`符合客戶要的${m.type}`);
    }
    if (needs.budgetMax) {
      if (m.priceFrom <= needs.budgetMax) {
        score += 3;
        reasons.push('在客戶預算內');
      } else {
        score -= Math.ceil((m.priceFrom - needs.budgetMax) / 50);
      }
    }
    (needs.features || []).forEach((f) => {
      const key = f.replace(/主動安全|大|空間|好/g, '').trim() || f;
      if (m.strengths.some((s) => s.includes(key))) {
        score += 1;
        reasons.push(`滿足「${f}」`);
      }
    });
    return { ...m, score, reasons, overBudget: needs.budgetMax ? m.priceFrom > needs.budgetMax : false };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, 2);
}

// ② 競品比較：客戶在看的別家車 vs 我們最推薦的車
export function compareWithRival(customer, brand) {
  const top = recommendCars(customer, brand)[0];
  if (!top) return null;
  const otherCar = (customer.needs?.lookingAt || []).find((c) => brandOf(c) !== brand);
  const rivalName = otherCar || top.rival.name;
  const sameAsCatalogRival = rivalName === top.rival.name;
  return {
    ours: top,
    rivalName,
    ourStrengths: top.strengths,
    theirStrengths: sameAsCatalogRival ? top.rival.strengths : ['（AI 會依對手規格表產生）'],
    pitch: top.pitch,
  };
}

// ③ 成交機率分析：有 AI 分析結果就用，沒有就依客戶狀態推估
export function dealAnalysis(customer) {
  const a = analysis[customer.id];
  if (a) return { ...a.probability, stage: a.lifecycle.stage, nextAction: a.lifecycle.nextAction };

  const p = customer.closeProbability;
  const positive = [];
  const risk = [];
  if (customer.status === 'won') positive.push('已成交');
  if (customer.temperature === 'hot') positive.push('購買意願高（熱客戶）');
  if (customer.lastContactDays <= 3) positive.push(`最近 ${customer.lastContactDays} 天內有聯絡`);
  if (customer.temperature === 'cold') risk.push('購買意願低（冷客戶）');
  if (customer.lastContactDays > 7) risk.push(`已經 ${customer.lastContactDays} 天沒聯絡`);
  if ((customer.needs?.lookingAt || []).some((c) => !c.startsWith('BMW'))) risk.push('正在看其他品牌');
  if (!customer.needs?.budgetMax) risk.push('預算未明');

  return {
    percentage: p,
    level: p >= 70 ? '高' : p >= 40 ? '中' : '低',
    positive,
    risk,
    stage: customer.stage,
    nextAction: risk.length ? '先錄一次對話，讓 AI 抓出需求後再評估' : '持續維繫關係',
    suggestion: customer.status === 'won' ? '提醒保養、邀請推薦親友' : '安排試乘或邀請到店，取得更多需求資訊',
    why: `這位客戶還沒有完整的對話分析，目前只依「${customer.stage}」階段、${
      { hot: '熱', warm: '溫', cold: '冷' }[customer.temperature]
    }客戶標籤和聯絡頻率推估。錄一段對話後，AI 會給出更準確的機率和原因。`,
  };
}
