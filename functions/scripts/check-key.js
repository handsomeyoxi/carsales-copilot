// 檢查 functions/.env 的 GEMINI_API_KEY 還能不能用、GEMINI_MODEL 這個模型在不在（只列模型清單，不花額度）
//
//   npm run check:key
//
// 換新金鑰的步驟：
//   1. https://aistudio.google.com/apikey 建立新金鑰
//   2. 貼到 functions/.env 的 GEMINI_API_KEY=（.env 不會上傳 GitHub）
//   3. npm run check:key 確認 ✓
//   4. firebase deploy --only functions（部署時會把 functions/.env 一起帶上去）
const fs = require("node:fs");
const path = require("node:path");

const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) process.loadEnvFile(envPath);

const key = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

async function main() {
  if (!key) {
    console.log("✗ functions/.env 沒有 GEMINI_API_KEY，請到 https://aistudio.google.com/apikey 建立");
    process.exit(1);
  }
  let res;
  try {
    res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", {
      headers: { "x-goog-api-key": key },
    });
  } catch (err) {
    console.log(`✗ 連不上 Gemini（${(err.cause && err.cause.code) || err.message}），請確認網路`);
    process.exit(1);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = (body.error && body.error.message) || `${res.status} ${res.statusText}`;
    console.log(`✗ GEMINI_API_KEY 無效或已失效（${reason}）`);
    console.log("  → 到 https://aistudio.google.com/apikey 建立新金鑰，更新 functions/.env");
    process.exit(1);
  }
  console.log(`✓ GEMINI_API_KEY 有效（尾碼 …${key.slice(-4)}）`);
  const ids = (body.models || []).map((m) => m.name.replace(/^models\//, ""));
  if (ids.includes(model)) {
    console.log(`✓ 模型 ${model} 可以用`);
  } else {
    console.log(`✗ 找不到模型 ${model}，請確認 functions/.env 的 GEMINI_MODEL`);
    process.exit(1);
  }
}

main();
