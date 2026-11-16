// 標籤邏輯的單元測試（不需要 Firebase、不需要金鑰）：npm test
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { normalizeInsight, mergeTags, hardNeedsToNeeds } = require("../src/tags");

test("normalizeInsight：不在清單的類別、低信心、0~1 的信心值", () => {
  const r = normalizeInsight({
    hard_needs: [
      { category: "預算", value: "約 400 萬", confidence: 95, evidence: "預算大概400萬左右" },
      { category: "品牌", value: "BMW", confidence: 0.9 }, // 不在清單 → 其他，0.9 → 90
      { category: "顏色", value: "白色", confidence: 30 }, // 太低 → 丟掉
      { category: "配備", value: "" }, // 沒內容 → 丟掉
    ],
    emotional_values: [
      { category: "家庭", label: "太太快生了", confidence: 92 },
      { category: "興趣", label: "爬山", confidence: 80 }, // 不在清單 → 丟掉
      { category: "嗜好", label: "週末爬山", confidence: 85 },
    ],
    concerns: ["電池衰退", "", null],
    emotion: { interest_level: 9, mood: "有興趣", evidence: ["好啊"], empathy_script: "了解" },
  });
  assert.deepEqual(
    r.hard_needs.map((t) => [t.category, t.value, t.confidence]),
    [["預算", "約 400 萬", 95], ["其他", "BMW", 90]]
  );
  assert.deepEqual(r.emotional_values.map((t) => t.category), ["家庭", "嗜好"]);
  assert.deepEqual(r.concerns, ["電池衰退"]);
  assert.equal(r.emotion.interest_level, 5);
});

test("normalizeInsight：AI 回傳壞掉也不會丟錯", () => {
  const r = normalizeInsight(null);
  assert.deepEqual(r, { hard_needs: [], emotional_values: [], concerns: [], emotion: null });
});

test("mergeTags：手動標籤不會被 AI 蓋掉，單一答案類別會被取代", () => {
  const old = [
    { category: "預算", value: "300 萬", source: "ai" },
    { category: "配備", value: "ADAS", source: "manual" },
    { category: "購車時間", value: "年底", source: "manual" },
  ];
  const merged = mergeTags(
    old,
    [
      { category: "預算", value: "400 萬" },
      { category: "配備", value: "ADAS" },
      { category: "購車時間", value: "下個月" },
    ],
    "value"
  );
  assert.deepEqual(
    merged.map((t) => `${t.category}:${t.value}:${t.source}`).sort(),
    ["配備:ADAS:manual", "購車時間:年底:manual", "預算:400 萬:ai"].sort()
  );
});

test("hardNeedsToNeeds 轉成前端 needs 格式", () => {
  const needs = hardNeedsToNeeds([
    { category: "車款", value: "BMW X5" },
    { category: "預算", value: "350–400 萬" },
    { category: "車型", value: "SUV" },
    { category: "配備", value: "ADAS" },
    { category: "顏色", value: "白色" },
    { category: "用途", value: "家庭" },
  ]);
  assert.deepEqual(needs, {
    lookingAt: ["BMW X5"],
    budget: "350–400 萬",
    budgetMax: 400,
    type: "SUV",
    usage: "家庭",
    features: ["ADAS", "白色"],
  });
});
