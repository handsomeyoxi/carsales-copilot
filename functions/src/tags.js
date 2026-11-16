// 標籤的共用邏輯（原本寫在 index.js，搬出來是為了可以單獨測試：這個檔不需要 Firebase 也能載入）
// - normalizeInsight：整理 analyzeInsight 的 AI 回傳，類別一定在 tagCategories.js 的清單裡
// - mergeTags：新舊標籤合併（手動標籤不會被 AI 蓋掉）
// - hardNeedsToNeeds：硬需求標籤 → 前端客戶頁用的 needs 格式
const {
  HARD_NEED_CATEGORIES,
  EMOTIONAL_VALUE_CATEGORIES,
  SINGLE_VALUE_CATEGORIES,
} = require("./tagCategories");

const MIN_CONFIDENCE = 40; // prompt 規定低於 40 不輸出，這裡再擋一次

function asText(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

// AI 偶爾回 0~1 的小數，統一換成 0~100 的整數
function asConfidence(value) {
  let n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n > 0 && n <= 1) n *= 100;
  return Math.min(100, Math.max(0, Math.round(n)));
}

// 一個標籤：類別不在清單 → 硬需求改成「其他」、情緒價值直接丟掉（情緒價值沒有「其他」）
function normalizeTag(raw, { categories, textField, fallbackCategory }) {
  if (!raw || typeof raw !== "object") return null;
  const text = asText(raw[textField]) || asText(raw.value) || asText(raw.label);
  if (!text) return null;
  const confidence = asConfidence(raw.confidence);
  if (confidence !== null && confidence < MIN_CONFIDENCE) return null;

  let category = asText(raw.category);
  if (!categories.includes(category)) {
    if (!fallbackCategory) return null;
    category = fallbackCategory;
  }
  return {
    category,
    [textField]: text,
    confidence: confidence ?? 50,
    evidence: asText(raw.evidence) || "",
  };
}

// analyzeInsight 的 AI 回傳 → 固定格式
function normalizeInsight(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const emotion = r.emotion && typeof r.emotion === "object" ? r.emotion : null;
  const interest = Math.round(Number(emotion && emotion.interest_level));

  return {
    hard_needs: (Array.isArray(r.hard_needs) ? r.hard_needs : [])
      .map((t) =>
        normalizeTag(t, { categories: HARD_NEED_CATEGORIES, textField: "value", fallbackCategory: "其他" })
      )
      .filter(Boolean),
    emotional_values: (Array.isArray(r.emotional_values) ? r.emotional_values : [])
      .map((t) => normalizeTag(t, { categories: EMOTIONAL_VALUE_CATEGORIES, textField: "label" }))
      .filter(Boolean),
    concerns: (Array.isArray(r.concerns) ? r.concerns : []).map(asText).filter(Boolean),
    emotion: emotion
      ? {
          interest_level: Number.isFinite(interest) ? Math.min(5, Math.max(1, interest)) : null,
          mood: asText(emotion.mood),
          evidence: (Array.isArray(emotion.evidence) ? emotion.evidence : []).map(asText).filter(Boolean),
          empathy_script: asText(emotion.empathy_script),
        }
      : null,
  };
}

// 把這次對話的新標籤併入客戶原有的標籤
// - 業務員手動加的標籤（source: "manual"）永遠保留，AI 不能蓋掉
// - 只會有一個答案的類別（例如預算）：有手動標籤時，AI 在這個類別的新標籤直接忽略
// - 同一類別、同一內容的 AI 標籤：用新的取代舊的
// - 只會有一個答案的類別：AI 的新標籤出現時，舊的 AI 標籤整個換掉
// - 其他：新舊都保留
// - 以前沒有 source 的舊資料，當成 AI 標籤處理
function mergeTags(oldTags, newTags, textField) {
  const keyOf = (t) => `${t.category}|${t[textField]}`;
  const existing = Array.isArray(oldTags) ? oldTags : [];

  const manualTags = existing.filter((t) => t && t.source === "manual");
  const manualKeys = new Set(manualTags.map(keyOf));
  const lockedCategories = new Set(
    manualTags.map((t) => t.category).filter((c) => SINGLE_VALUE_CATEGORIES.includes(c))
  );

  const incoming = (Array.isArray(newTags) ? newTags : [])
    .filter((t) => t && t.category && t[textField])
    .filter((t) => !manualKeys.has(keyOf(t)) && !lockedCategories.has(t.category))
    .map((t) => ({ ...t, source: "ai" }));

  const incomingKeys = new Set(incoming.map(keyOf));
  const replacedCategories = new Set(
    incoming.map((t) => t.category).filter((c) => SINGLE_VALUE_CATEGORIES.includes(c))
  );

  const kept = existing.filter(
    (t) =>
      t &&
      (t.source === "manual" ||
        (!incomingKeys.has(keyOf(t)) && !replacedCategories.has(t.category)))
  );

  return [...kept, ...incoming];
}

function mergeStrings(oldList, newList) {
  const all = [...(Array.isArray(oldList) ? oldList : []), ...(Array.isArray(newList) ? newList : [])];
  return [...new Set(all.filter((item) => typeof item === "string" && item.trim() !== ""))];
}

// 從「約 400 萬」「150–170 萬」抓出預算上限（萬元，取最大的數字），跟前端 parseBudgetMax 一樣
function parseBudgetMax(text) {
  const nums = (String(text).replace(/,/g, "").match(/\d+(\.\d+)?/g) || []).map(Number);
  return nums.length ? Math.max(...nums) : null;
}

// 硬需求標籤 → 前端的 needs 格式
// { lookingAt, budget, budgetMax, type, usage, features }
// 同一類別有多個標籤時，手動的優先，其次是最新的（mergeTags 會把新的放在後面）
function hardNeedsToNeeds(hardNeeds) {
  const tags = (Array.isArray(hardNeeds) ? hardNeeds : []).filter(
    (t) => t && typeof t.value === "string" && t.value.trim() !== ""
  );
  const valuesOf = (category) => {
    const list = tags.filter((t) => t.category === category);
    const manual = list.filter((t) => t.source === "manual");
    const others = list.filter((t) => t.source !== "manual").reverse();
    return [...new Set([...manual, ...others].map((t) => t.value.trim()))];
  };

  const budget = valuesOf("預算")[0] || null;
  return {
    lookingAt: valuesOf("車款"),
    budget,
    budgetMax: budget ? parseBudgetMax(budget) : null,
    type: valuesOf("車型")[0] || null,
    usage: valuesOf("用途").join("、") || null,
    features: [...valuesOf("配備"), ...valuesOf("顏色")],
  };
}

module.exports = {
  normalizeInsight,
  mergeTags,
  mergeStrings,
  parseBudgetMax,
  hardNeedsToNeeds,
};
