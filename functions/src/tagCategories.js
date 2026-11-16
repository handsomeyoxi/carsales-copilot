// 標籤類別：全專案唯一的一套（硬需求 hardNeeds ＋ 情緒價值 emotionalValues）
//
// ⚠️ stt-server/src/tagCategories.js 有一份一模一樣的清單（那邊是 ES Module、要另外部署，沒辦法直接 require 這個檔）
//    改這裡就要一起改那邊；stt-server 的 npm test 會檢查兩邊是否一致。
//
// 用在哪裡：
// - advisor.js 的 analyzeInsight prompt（AI 只能用這些類別）
// - tags.js 的 normalizeInsight（AI 回傳不在清單的類別會被修正）
// - index.js 的 saveCustomerTag（業務員手動加的標籤也要是這些類別）
// - stt-server 錄音時的「即時偵測到」關鍵字

const HARD_NEED_CATEGORIES = [
  "車款",
  "車型",
  "顏色",
  "預算",
  "配備",
  "用途",
  "購車時間",
  "付款方式",
  "舊車換購",
  "決策者",
  "其他",
];

const EMOTIONAL_VALUE_CATEGORIES = ["家庭", "時間", "心理", "嗜好"];

// 每類只會有一個答案（新的 AI 標籤會整個取代舊的）
const SINGLE_VALUE_CATEGORIES = ["預算", "購車時間", "付款方式", "舊車換購"];

// 標籤種類 → 文字放在哪個欄位（硬需求用 value，情緒價值用 label）
const TAG_TEXT_FIELDS = { hardNeeds: "value", emotionalValues: "label" };

const CATEGORIES_BY_GROUP = {
  hardNeeds: HARD_NEED_CATEGORIES,
  emotionalValues: EMOTIONAL_VALUE_CATEGORIES,
};

module.exports = {
  HARD_NEED_CATEGORIES,
  EMOTIONAL_VALUE_CATEGORIES,
  SINGLE_VALUE_CATEGORIES,
  TAG_TEXT_FIELDS,
  CATEGORIES_BY_GROUP,
};
