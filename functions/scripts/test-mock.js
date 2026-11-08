// 用「模擬對話」測試 AI 分析（品涵的硬需求／情緒價值標籤、E 組的對話後分析），不用真實客戶錄音
//
//   npm run test:mock                     全部模擬對話
//   npm run test:mock -- --id family-suv  只跑一段
//
// 對話文字來源：
//   - stt-server 先跑過 npm run test:mock → 讀 stt-server/test-output/<id>.json（真的走過語音整理那一步）
//   - 沒有的話 → 直接用 stt-server/src/mock/conversations.json 裡寫好的「整理後」句子
// 需要 functions/.env 的 GEMINI_API_KEY（會用到免費額度，每段對話呼叫 2 次）。不寫入 Firestore。
const fs = require("node:fs");
const path = require("node:path");

const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) process.loadEnvFile(envPath);

const { analyzeInsight } = require("../src/advisor");
const { analyzeAfterConversation } = require("../src/gemini");
const { HARD_NEED_CATEGORIES, EMOTIONAL_VALUE_CATEGORIES } = require("../src/tagCategories");

const sttDir = path.join(__dirname, "..", "..", "stt-server");
const mock = JSON.parse(fs.readFileSync(path.join(sttDir, "src", "mock", "conversations.json"), "utf8"));
const who = { sales: "業務", customer: "客戶" };

function conversationTextOf(conv) {
  const fromStt = path.join(sttDir, "test-output", `${conv.id}.json`);
  if (fs.existsSync(fromStt)) {
    return { text: JSON.parse(fs.readFileSync(fromStt, "utf8")).conversationText, from: "stt-server 整理結果" };
  }
  const text = conv.segments
    .flatMap((s) => s.lines)
    .map((l) => `${who[l.speaker] || "（未知）"}：${l.clean}`)
    .join("\n");
  return { text, from: "模擬劇本" };
}

async function main() {
  const args = process.argv.slice(2);
  const onlyId = args.includes("--id") ? args[args.indexOf("--id") + 1] : null;
  const list = mock.conversations.filter((c) => !onlyId || c.id === onlyId);
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });
  const line = "─".repeat(50);
  let problems = 0;

  for (const conv of list) {
    const { text, from } = conversationTextOf(conv);
    console.log(`\n${line}\n【${conv.id}】${conv.title}（文字來源：${from}）\n${line}`);

    try {
      const insight = await analyzeInsight(text);
      console.log("硬需求：");
      for (const t of insight.hard_needs) console.log(`  ${t.category}：${t.value}（${t.confidence}）`);
      console.log("情緒價值：");
      for (const t of insight.emotional_values) console.log(`  ${t.category}：${t.label}（${t.confidence}）`);
      if (insight.emotion) console.log(`情緒：${insight.emotion.mood}（興趣 ${insight.emotion.interest_level}/5）`);

      const bad = [
        ...insight.hard_needs.filter((t) => !HARD_NEED_CATEGORIES.includes(t.category)),
        ...insight.emotional_values.filter((t) => !EMOTIONAL_VALUE_CATEGORIES.includes(t.category)),
      ];
      if (bad.length) {
        console.log(`  ✗ 有不在清單裡的類別：${bad.map((t) => t.category).join("、")}`);
        problems++;
      }
      const gotHard = new Set(insight.hard_needs.map((t) => t.category));
      const gotEmo = new Set(insight.emotional_values.map((t) => t.category));
      const missing = [
        ...conv.expect.hardNeeds.filter((c) => !gotHard.has(c)),
        ...conv.expect.emotionalValues.filter((c) => !gotEmo.has(c)),
      ];
      if (missing.length) {
        console.log(`  ✗ 預期要有但 AI 沒給的類別：${missing.join("、")}`);
        problems++;
      } else console.log("  ✓ 預期的標籤類別都有");

      const after = await analyzeAfterConversation(text, null, { today, brand: null, carInventory: [] });
      console.log(`\n對話後分析：階段 ${after.lifecycle_stage.stage}、成交機率 ${after.close_probability.percentage}%`);
      console.log(`重點：${after.summary.key_points.join("；")}`);
      console.log(`待辦：${after.todos.map((t) => t.task).join("；") || "（無）"}`);
    } catch (err) {
      console.log(`✗ 失敗：${err.message}`);
      problems++;
      if (err.code === "API_KEY_INVALID") break;
    }
  }

  console.log(`\n${line}\n${problems ? `有 ${problems} 個問題` : "全部通過"}\n`);
  process.exit(problems ? 1 : 0);
}

main();
