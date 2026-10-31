// 幫 cars collection 裡還沒有 brand 的車補上品牌（從車名開頭判斷，例如 "BMW X5" → "BMW"）
//
// 用法（在 functions 資料夾下執行）：
//   node scripts/backfill-car-brands.js            只列出會改什麼，不寫入
//   node scripts/backfill-car-brands.js --write    真的寫入 Firestore
//
// 連正式資料庫前要先登入：gcloud auth application-default login
// 想改 emulator 的資料：先設定 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
const admin = require("firebase-admin");

// 和前端 frontend/src/data/cars.js 的 BRANDS 相同；長的名字排前面，避免 "MINI" 之類被誤判
const BRANDS = [
  "Toyota", "Lexus", "Honda", "Nissan", "Mazda", "Mitsubishi", "Subaru", "Suzuki",
  "Ford", "Hyundai", "Kia", "Luxgen", "BMW", "Mercedes-Benz", "Audi", "Volkswagen",
  "Porsche", "Volvo", "Tesla", "Skoda", "Peugeot", "MINI", "Land Rover", "Jaguar",
].sort((a, b) => b.length - a.length);

function guessBrand(name) {
  if (typeof name !== "string") return null;
  const lower = name.toLowerCase();
  return BRANDS.find((b) => lower.startsWith(b.toLowerCase())) || null;
}

async function main() {
  const write = process.argv.includes("--write");
  admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || "carsales-copilot" });
  const db = admin.firestore();

  const snap = await db.collection("cars").get();
  const batch = db.batch();
  let changes = 0;

  for (const doc of snap.docs) {
    const car = doc.data();
    if (car.brand) continue;
    const brand = guessBrand(car.name);
    if (!brand) {
      console.log(`⚠️  ${doc.id}（${car.name || "沒有 name"}）判斷不出品牌，請手動補`);
      continue;
    }
    console.log(`${doc.id}：${car.name} → brand = ${brand}`);
    batch.update(doc.ref, { brand });
    changes++;
  }

  if (!write) {
    console.log(`\n共 ${changes} 台會補上 brand。確認沒問題後加上 --write 再執行一次。`);
    return;
  }
  if (changes > 0) await batch.commit();
  console.log(`\n已更新 ${changes} 台車。`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
