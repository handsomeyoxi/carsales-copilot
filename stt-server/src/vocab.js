/**
 * 領域詞彙與「即時關鍵字偵測」規則
 *
 * 1. STT_HINT：餵給語音模型當 prompt，提高車款、配備等專有名詞的辨識率。
 *    用繁體中文撰寫，也能讓模型傾向輸出繁體。
 * 2. detectKeywords()：每段轉寫完成後立刻用規則比對，
 *    對應 App 畫面上的「即時偵測到」標籤（不花 LLM 費用、零延遲）。
 *    類別和 AI 的硬需求／情緒價值標籤是同一套（tagCategories.js）。
 */

export const CAR_MODELS = [
  'GLC', 'GLE', 'C-Class', 'E-Class', 'X1', 'X3', 'X5', 'iX', '3系列', '5系列',
  'XC40', 'XC60', 'XC90', 'RAV4', 'Corolla Cross', 'Camry', 'CR-V', 'HR-V',
  'Model 3', 'Model Y', 'Kuga', 'CX-5', 'Tucson', 'Sportage', 'Altis',
];

export const BRANDS = [
  'BMW', 'Benz', '賓士', 'Volvo', 'Toyota', 'Lexus', 'Honda', 'Tesla',
  'Mazda', 'Ford', 'Hyundai', 'Kia', 'Audi', 'Porsche', 'Nissan', 'Luxgen',
];

export const FEATURES = [
  'ADAS', 'ACC', '主動車距', '車道維持', '盲點偵測', '360環景', '環景影像',
  'CarPlay', '電動尾門', '全景天窗', '座椅加熱', '油電', '插電', '純電', '四驅',
];

// 給 STT 的提示詞：用繁體、像對話的句子，模型會傾向輸出繁體並認得這些專有名詞。
// Whisper 提示詞上限約 224 tokens（中文一個字約 1～2 tokens），所以只放最常出現的詞，
// 你們可以依實際展間的品牌換掉。
export const STT_HINT =
  '台灣汽車展間業務與客戶的對話，國語台語英文夾雜。' +
  '品牌車款：BMW X5、Benz GLC、Volvo XC60、Toyota RAV4、Lexus、Tesla Model Y。' +
  '配備：ADAS、CarPlay、360環景、電動尾門。試乘、交車、頭期款、月付、預產期。';

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// 前後不能接英數字，避免「iX」吃到「Mix」、「X1」吃到「iX1」的一半
const listRegex = (list) =>
  new RegExp(`(?<![A-Za-z0-9])(?:${list.map(escape).join('|')})(?![A-Za-z0-9])`, 'gi');

/**
 * 即時關鍵字規則：類別跟 AI 標籤是同一套（見 tagCategories.js）
 *   group = 'hardNeeds'（硬需求）或 'emotionalValues'（情緒價值）
 * 這裡只是「提示」：規則抓得到字，抓不到語意。正式的標籤由錄音結束後的 AI 分析（functions 的 analyzeInsight）產生。
 */
const RULES = [
  { group: 'hardNeeds', category: '車款', regex: listRegex([...BRANDS, ...CAR_MODELS]) },
  { group: 'hardNeeds', category: '車型', regex: /(SUV|休旅車?|轎車|掀背車?|旅行車|MPV|七人座|五人座|跑車)/gi },
  { group: 'hardNeeds', category: '配備', regex: listRegex([...FEATURES, 'ISOFIX', '安全座椅']) },
  // 預算：170萬、150到170萬、一百五十萬
  {
    group: 'hardNeeds',
    category: '預算',
    regex: /(\d{2,4}\s*(?:[-~到至]\s*\d{2,4}\s*)?萬|[一二三四五六七八九十百兩]+萬)(?:左右|以內|上下)?/g,
  },
  { group: 'hardNeeds', category: '顏色', regex: /[白黑灰銀紅藍綠棕金]色/g },
  { group: 'hardNeeds', category: '用途', regex: /(通勤|上下班|接送|載小孩|載爸媽|載長輩|出遊|露營|跑長途|載貨|商務)/g },
  {
    group: 'hardNeeds',
    category: '購車時間',
    regex: /(下個?月|下禮拜|下週|月底|年底|過年前|月中|\d{1,2}月\d{1,2}[日號]?|\d{1,2}月)/g,
  },
  { group: 'hardNeeds', category: '付款方式', regex: /(分期|貸款|零利率|頭期款?|月付|現金|付清)/g },
  { group: 'hardNeeds', category: '舊車換購', regex: /(舊車|換購|估車|折抵|中古車|二手車)/g },
  {
    group: 'hardNeeds',
    category: '決策者',
    regex: /(要問(?:我|一下)?(?:太太|老婆|老公|爸媽|家人)|(?:太太|老婆|老公|爸媽)(?:決定|說了算|點頭|同意))/g,
  },
  // 「先生」不放：業務常用「陳先生」稱呼客戶，會誤判
  {
    group: 'emotionalValues',
    category: '家庭',
    regex: /(太太|老婆|老公|小孩|囡仔|兒子|女兒|寶寶|懷孕|預產期|坐月子|月子|爸媽|長輩|寵物|狗|貓)/g,
  },
  {
    group: 'emotionalValues',
    category: '嗜好',
    regex: /(紅酒|威士忌|咖啡|釣魚|高爾夫|爬山|棒球|中信兄弟|統一獅|樂天桃猿|富邦悍將|味全龍|台鋼雄鷹)/g,
  },
];

/** 回傳 [{ group, category, value }]，同類別同值只留一個 */
export function detectKeywords(text) {
  const found = new Map();
  for (const { group, category, regex } of RULES) {
    for (const m of String(text ?? '').matchAll(regex)) {
      const value = m[0].trim();
      found.set(`${category}:${value.toLowerCase()}`, { group, category, value });
    }
  }
  return [...found.values()];
}

/** 合併多段的關鍵字（去重複），存在對話紀錄上給前端顯示 */
export function mergeKeywords(lists) {
  const found = new Map();
  for (const list of lists) {
    for (const k of list ?? []) found.set(`${k.category}:${String(k.value).toLowerCase()}`, k);
  }
  return [...found.values()];
}
