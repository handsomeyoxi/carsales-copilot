// 把示範資料寫進「本機 emulator」的 Firestore，前端接 API 時畫面才有東西看
// 內容對照 frontend/src/data/mockData.js，但欄位改成後端實際存的格式
//
// 用法（先在另一個終端機啟動 firebase emulators:start --only functions,firestore）：
//   cd functions
//   node scripts/seed-emulator.js
//
// 只會寫入本機 emulator，不會碰到正式資料庫；可以重複執行（同一個 id 會覆蓋）
// 業務員 id 是 demo-sales，測試 getDashboard 時用：?salespersonId=demo-sales

// 一定連本機 emulator：程式一開始就設定，避免不小心寫進正式資料庫
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
const host = process.env.FIRESTORE_EMULATOR_HOST;
if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host)) {
  console.error(`FIRESTORE_EMULATOR_HOST=${host} 不是本機位址，為了安全不執行`);
  process.exit(1);
}

const admin = require("firebase-admin");
const { Timestamp } = require("firebase-admin/firestore");
const { hardNeedsToNeeds } = require("../src/tags");

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || "carsales-copilot" });
const db = admin.firestore();

const SALES_ID = "demo-sales";
const DAY = 24 * 60 * 60 * 1000;

function daysAgo(n) {
  return Timestamp.fromDate(new Date(Date.now() - n * DAY));
}
function daysLater(n) {
  return Timestamp.fromDate(new Date(Date.now() + n * DAY));
}
// 台灣時區的 YYYY-MM-DD，和後端 dueDate 格式一樣
function dateAfter(n) {
  return new Date(Date.now() + n * DAY).toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });
}
// 快速做硬需求標籤：[類別, 內容, 來源]
function tags(list) {
  return list.map(([category, value, source = "ai"]) => ({ category, value, confidence: 85, source }));
}

const salesperson = {
  name: "張偉明",
  brand: "BMW",
  email: "wei.chang@example.com",
  phone: "0912-345-678",
};

const cars = [
  { id: "bmw-x5", brand: "BMW", name: "BMW X5", type: "SUV", priceFrom: 400, features: ["七人座選配", "駕駛輔助系統"], usage: "家庭" },
  { id: "bmw-x3", brand: "BMW", name: "BMW X3", type: "SUV", priceFrom: 260, features: ["好停車", "後座可放兒童座椅"], usage: "家庭、通勤" },
  { id: "bmw-x1", brand: "BMW", name: "BMW X1", type: "SUV", priceFrom: 200, features: ["省油", "好停車"], usage: "通勤" },
  { id: "bmw-i4", brand: "BMW", name: "BMW i4", type: "電動車", priceFrom: 280, features: ["純電", "加速感"], usage: "通勤" },
];

// 前端會用到、但後端 AI 不會產生的欄位（temperature、source、note、interestedCar）也一起放
const customers = [
  {
    id: "c1", name: "陳志豪", phone: "0933-111-222", source: "展間來訪", temperature: "hot",
    note: "太太預產 · 月底前要定車", interestedCar: "BMW X5",
    status: "following", lifecycleStage: "決策中", closeProbability: 78, lastContactDays: 7,
    hardNeeds: tags([["車款", "BMW X5"], ["車款", "Mercedes-Benz GLE"], ["預算", "約 400 萬", "manual"],
      ["車型", "SUV"], ["用途", "家庭用，要放嬰兒車"], ["配備", "ADAS 主動安全"], ["配備", "後座空間大"], ["顏色", "白色"]]),
    emotionalValues: [{ category: "家庭", label: "太太快生了，重視安全", confidence: 90, source: "ai" }],
  },
  {
    id: "c4", name: "張美玲", phone: "0955-888-123", source: "LINE", temperature: "hot",
    note: "換車預算 120 萬 · 比較油電", interestedCar: "Toyota RAV4",
    status: "following", lifecycleStage: "報價中", closeProbability: 66, lastContactDays: 2,
    hardNeeds: tags([["車款", "Toyota RAV4"], ["車款", "Honda CR-V"], ["預算", "120 萬內"],
      ["車型", "SUV"], ["用途", "通勤＋週末出遊"], ["配備", "省油"], ["配備", "好停車"]]),
    emotionalValues: [],
  },
  {
    id: "c2", name: "林雅婷", phone: "0922-456-789", source: "電話詢問", temperature: "warm",
    note: "喜歡喝紅酒 · 比較 X3 與 GLC", interestedCar: "Mercedes-Benz GLC",
    status: "following", lifecycleStage: "需求確認", closeProbability: 52, lastContactDays: 3,
    hardNeeds: tags([["車款", "Mercedes-Benz GLC"], ["車型", "SUV"], ["用途", "常載父母出門"], ["配備", "後座舒適"]]),
    emotionalValues: [{ category: "嗜好", label: "喜歡喝紅酒", confidence: 80, source: "ai" }],
  },
  {
    id: "c3", name: "王建國", phone: "0910-246-810", source: "展間來訪", temperature: "cold",
    note: "養貓 · 看過 Volvo XC60", interestedCar: "Volvo XC60",
    status: "new", lifecycleStage: "初次接觸", closeProbability: 25, lastContactDays: 14,
    hardNeeds: tags([["車款", "Volvo XC60"], ["預算", "250 萬內"], ["車型", "SUV"], ["用途", "帶寵物出遊"]]),
    emotionalValues: [],
  },
  {
    id: "c6", name: "黃子軒", phone: "0978-321-654", source: "官網預約", temperature: "warm",
    note: "對電動車有興趣 · 預約試乘", interestedCar: "BMW i4",
    status: "new", lifecycleStage: "初次接觸", closeProbability: 35, lastContactDays: 1,
    hardNeeds: tags([["車款", "BMW i4"], ["車款", "Tesla Model 3"], ["預算", "300 萬內"], ["車型", "電動車"], ["用途", "通勤"]]),
    emotionalValues: [],
  },
  {
    id: "c5", name: "李承恩", phone: "0920-777-888", source: "舊客介紹", temperature: "hot",
    note: "9/30 交車 X3 · 下個月首次保養", interestedCar: "BMW X3",
    status: "won", lifecycleStage: "成交", closeProbability: 100, lastContactDays: 10,
    hardNeeds: tags([["車款", "BMW X3"], ["預算", "約 270 萬"], ["車型", "SUV"], ["用途", "家庭"]]),
    emotionalValues: [],
  },
];

const todos = [
  { id: "td1", customerId: "c1", task: "確認白色 X5 現車與交車時間", priority: "high", due: 0, time: "10:00", isDone: false },
  { id: "td2", customerId: "c1", task: "準備嬰兒座椅 ISOFIX 安裝示範", priority: "medium", due: 2, time: null, isDone: false },
  { id: "td3", customerId: "c4", task: "寄送 X1 與 RAV4 比較報價單", priority: "high", due: 0, time: "15:00", isDone: false },
  { id: "td4", customerId: "c2", task: "邀請父母一起試乘 X3", priority: "medium", due: 4, time: null, isDone: false },
  { id: "td6", customerId: "c5", task: "提醒李先生首次保養", priority: "medium", due: 9, time: null, isDone: false },
];

const followUps = [
  { id: "f1", customerId: "c1", due: 0, reason: "太太預產期將近，月底前是決策關鍵" },
  { id: "f4", customerId: "c4", due: 1, reason: "報價單寄出後 1 天追蹤最有效" },
  { id: "f2", customerId: "c2", due: 3, reason: "試乘後 3 天內回訪，趁印象還深" },
];

async function main() {
  const batch = db.batch();
  const now = Timestamp.now();

  batch.set(db.collection("salespersons").doc(SALES_ID), { ...salesperson, updatedAt: now });

  for (const { id, ...car } of cars) {
    batch.set(db.collection("cars").doc(id), car);
  }

  for (const { id, lastContactDays, ...c } of customers) {
    batch.set(db.collection("customers").doc(id), {
      ...c,
      salespersonId: SALES_ID,
      statusSource: "ai",
      needs: hardNeedsToNeeds(c.hardNeeds),
      concerns: [],
      lastContactAt: daysAgo(lastContactDays),
      createdAt: daysAgo(lastContactDays + 7),
    });
  }

  for (const { id, due, ...t } of todos) {
    batch.set(db.collection("todos").doc(id), {
      ...t,
      salespersonId: SALES_ID,
      dueDate: dateAfter(due),
      source: "ai",
      createdAt: now,
    });
  }

  for (const { id, due, reason, customerId } of followUps) {
    batch.set(db.collection("followUps").doc(id), {
      customerId,
      salespersonId: SALES_ID,
      followUpDate: daysLater(due),
      dueDate: dateAfter(due),
      reason,
      followUpScript: null,
      isDone: false,
      createdAt: now,
    });
  }

  await batch.commit();
  console.log(`✅ 已寫入本機 emulator（${host}）：`);
  console.log(`   業務員 1 位（id: ${SALES_ID}，品牌 BMW）、車款 ${cars.length} 台、客戶 ${customers.length} 位、待辦 ${todos.length} 筆、回訪 ${followUps.length} 筆`);
  console.log(`   測試網址：http://127.0.0.1:5001/carsales-copilot/us-central1/getDashboard?salespersonId=${SALES_ID}`);
}

main().catch((error) => {
  console.error("寫入失敗：", error.message);
  console.error("請確認 emulator 有在跑：firebase emulators:start --only functions,firestore");
  process.exit(1);
});