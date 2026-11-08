/**
 * 標籤類別：和 functions/src/tagCategories.js 是同一套（品涵的硬需求／情緒價值類別）
 *
 * ⚠️ 兩邊要一模一樣。stt-server 和 functions 是分開部署的（一個是 ES Module 的 Express，一個是 Firebase Functions），
 *    所以沒辦法共用同一個檔案；npm test 的 test/tagCategories.test.js 會檢查兩邊有沒有對齊。
 */

export const HARD_NEED_CATEGORIES = [
  '車款',
  '車型',
  '顏色',
  '預算',
  '配備',
  '用途',
  '購車時間',
  '付款方式',
  '舊車換購',
  '決策者',
  '其他',
];

export const EMOTIONAL_VALUE_CATEGORIES = ['家庭', '時間', '心理', '嗜好'];

export const SINGLE_VALUE_CATEGORIES = ['預算', '購車時間', '付款方式', '舊車換購'];

export const TAG_TEXT_FIELDS = { hardNeeds: 'value', emotionalValues: 'label' };
