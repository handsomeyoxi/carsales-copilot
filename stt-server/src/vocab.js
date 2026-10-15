/**
 * 領域詞彙與「即時關鍵字偵測」規則
 *
 * 1. STT_HINT：餵給語音模型當 prompt，提高車款、配備等專有名詞的辨識率。
 *    用繁體中文撰寫，也能讓模型傾向輸出繁體。
 * 2. detectKeywords()：每段轉寫完成後立刻用規則比對，
 *    對應 App 畫面上的「即時偵測到」標籤（不花 LLM 費用、零延遲）。
 *    錄音結束後的「整理」才交給 LLM 做完整分析。
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
const listRegex = (list) => new RegExp(list.map(escape).join('|'), 'gi');

const RULES = [
  { type: 'brand', regex: listRegex(BRANDS) },
  { type: 'model', regex: listRegex(CAR_MODELS) },
  { type: 'feature', regex: listRegex(FEATURES) },
  // 預算：170萬、150到170萬、一百五十萬
  { type: 'budget', regex: /(\d{2,4}\s*(?:[-~到至]\s*\d{2,4}\s*)?萬|[一二三四五六七八九十百兩]+萬)(?:左右|以內|上下)?/g },
  { type: 'color', regex: /[白黑灰銀紅藍綠棕金]色/g },
  { type: 'family', regex: /(太太|老婆|先生|老公|小孩|囡仔|兒子|女兒|寶寶|懷孕|預產期|坐月子|月子|爸媽|長輩|狗|貓|寵物)/g },
  { type: 'time', regex: /(下個?月|下禮拜|下週|月底|年底|過年前|月中|\d{1,2}月\d{1,2}[日號]?|\d{1,2}月)/g },
  { type: 'hobby', regex: /(紅酒|威士忌|咖啡|露營|釣魚|高爾夫|爬山|棒球|中信兄弟|統一獅|樂天桃猿|富邦悍將|味全龍|台鋼雄鷹)/g },
];

/** 回傳 [{ type, value }]，同類型同值只留一個 */
export function detectKeywords(text) {
  const found = new Map();
  for (const { type, regex } of RULES) {
    for (const m of text.matchAll(regex)) {
      const value = m[0].trim();
      found.set(`${type}:${value.toLowerCase()}`, { type, value });
    }
  }
  return [...found.values()];
}
