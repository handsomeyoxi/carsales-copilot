// 芷璇新增：本機測試「登入」和「回訪軍師」用的示範資料
//
// 做兩件事（只寫入本機 emulator，不會碰到正式環境）：
// 1. 在 Auth emulator 建立示範帳號 demo@carsales.test / demo1234，uid 固定是 demo-sales
//    → 登入後看到的就是 seed-emulator.js 塞的那 6 位客戶
// 2. 幫陳志豪（c1）、林雅婷（c2）各加一筆「已分析過的對話」
//    → 回訪軍師（followUpAdvisor）要有分析過的對話才能產生建議
//
// 用法（emulator 要先開：firebase emulators:start --only functions,firestore,auth）：
//   cd functions
//   node scripts/seed-emulator.js      ← 先塞客戶資料
//   node scripts/seed-demo-login.js    ← 再跑這個
// 可以重複執行

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
const LOCAL = /^(127\.0\.0\.1|localhost):\d+$/;
for (const name of ["FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST"]) {
  if (!LOCAL.test(process.env[name])) {
    console.error(`${name}=${process.env[name]} 不是本機位址，為了安全不執行`);
    process.exit(1);
  }
}

const admin = require("firebase-admin");
const { Timestamp } = require("firebase-admin/firestore");

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || "carsales-copilot" });
const db = admin.firestore();

const SALES_ID = "demo-sales";
const DEMO_EMAIL = "demo@carsales.test";
const DEMO_PASSWORD = "demo1234";
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n) => Timestamp.fromDate(new Date(Date.now() - n * DAY));

// 格式和 analyzeAfterConversation、analyzeInsight 存進 conversations 的一樣
const conversations = [
  {
    id: "conv-demo-c1",
    customerId: "c1",
    daysAgo: 7,
    conversationText:
      "業務：上次您說對 BMW X5 比較有興趣，今天想看看實車嗎？\n客戶：對，我太太說她喜歡白色的，不過她快生了，我想在她月子前就把車定下來。預算想控制在 400 萬左右，配備要有 ADAS。\n客戶：還有後面那台 GLC 的尾門是電動的嗎？",
    analysis: {
      summary: {
        customer_name: "陳志豪",
        key_points: ["主要考慮 BMW X5，Benz GLE 為備選", "太太偏好白色，需有 ADAS 主動安全", "希望在太太坐月子前完成訂車"],
        interested_cars: ["BMW X5", "Mercedes-Benz GLE"],
        concerns: ["太太還沒來看過車"],
      },
      lifecycle_stage: { stage: "決策中", stage_reason: "已鎖定車款與預算", next_action: "提供白色 X5 現車與交車時程" },
      close_probability: {
        percentage: 78,
        level: "高",
        positive_signals: ["明確預算", "有時間壓力（預產期）"],
        risk_signals: ["仍在比較 Benz GLE", "太太尚未到店看車"],
        suggestion: "邀請太太一起賞車",
      },
    },
    insight: {
      hard_needs: [
        { category: "車款", value: "BMW X5", confidence: 95, evidence: "對，我太太說她喜歡白色的" },
        { category: "預算", value: "400 萬左右", confidence: 92, evidence: "預算想控制在 400 萬左右" },
        { category: "配備", value: "ADAS", confidence: 95, evidence: "配備要有 ADAS" },
      ],
      emotional_values: [
        { category: "家庭", label: "太太即將生產", confidence: 95, evidence: "不過她快生了" },
        { category: "時間", label: "希望月子前定車", confidence: 90, evidence: "我想在她月子前就把車定下來" },
      ],
      concerns: ["太太還沒看過車"],
      emotion: { interest_level: 4, mood: "有興趣，時間有點趕", evidence: ["我想在她月子前就把車定下來"], empathy_script: "恭喜你們！交車時間我幫你抓好。" },
    },
  },
  {
    id: "conv-demo-c2",
    customerId: "c2",
    daysAgo: 3,
    conversationText:
      "業務：X3 開起來感覺如何？\n客戶：還不錯，後座空間比我想像的大，我常載爸媽出門，這點很重要。\n客戶：不過我也在看 GLC，預算還沒想好。",
    analysis: {
      summary: {
        customer_name: "林雅婷",
        key_points: ["X3 試乘反應不錯，也在比較 Benz GLC", "常載父母，在意後座空間", "尚未談到預算"],
        interested_cars: ["BMW X3", "Mercedes-Benz GLC"],
        concerns: ["預算未定"],
      },
      lifecycle_stage: { stage: "需求確認", stage_reason: "試乘完成，預算未明", next_action: "確認預算區間與購車時間" },
      close_probability: {
        percentage: 52,
        level: "中",
        positive_signals: ["試乘反應佳"],
        risk_signals: ["仍在比較 GLC", "預算未定"],
        suggestion: "提供低利分期試算",
      },
    },
    insight: {
      hard_needs: [{ category: "車款", value: "BMW X3", confidence: 90, evidence: "還不錯，後座空間比我想像的大" }],
      emotional_values: [{ category: "家庭", label: "常載父母出門", confidence: 92, evidence: "我常載爸媽出門，這點很重要" }],
      concerns: ["預算還沒想好"],
      emotion: { interest_level: 3, mood: "有興趣但還在比較", evidence: ["不過我也在看 GLC"], empathy_script: "多比較是對的，我幫你整理兩台的差異。" },
    },
  },
];

async function ensureDemoUser() {
  try {
    await admin.auth().updateUser(SALES_ID, { email: DEMO_EMAIL, password: DEMO_PASSWORD, displayName: "張偉明" });
  } catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
    await admin.auth().createUser({ uid: SALES_ID, email: DEMO_EMAIL, password: DEMO_PASSWORD, displayName: "張偉明" });
  }
}

async function main() {
  await ensureDemoUser();

  const batch = db.batch();
  for (const { id, daysAgo: n, ...c } of conversations) {
    batch.set(db.collection("conversations").doc(id), { ...c, salespersonId: SALES_ID, createdAt: daysAgo(n) });
  }
  // 業務員資料補上登入用的 Email
  batch.set(db.collection("salespersons").doc(SALES_ID), { email: DEMO_EMAIL }, { merge: true });
  await batch.commit();

  console.log("✅ 已建立示範帳號（本機 emulator）：");
  console.log(`   Email：${DEMO_EMAIL}　密碼：${DEMO_PASSWORD}（uid：${SALES_ID}）`);
  console.log(`   已分析的對話 ${conversations.length} 筆（陳志豪、林雅婷），可以測回訪軍師`);
}

main().catch((error) => {
  console.error("❌ 失敗：", error.message);
  console.error("   請確認 emulator 有開，而且有包含 auth：firebase emulators:start --only functions,firestore,auth");
  process.exit(1);
});
