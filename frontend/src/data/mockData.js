// 假資料：欄位設計對齊後端 API（analyzeAfterConversation / getDashboard）
// 之後接後端時，只要把這些換成 API 回傳的資料，畫面幾乎不用改

export const salesperson = {
  name: '張偉明',
  title: '資深業務 · 台北旗艦展間',
  email: 'wei.chang@carbrand.com',
  phone: '0912-345-678',
  dealsThisMonth: 2,
};

// 客戶生命週期（對應後端 lifecycle_stage.stage）
export const STAGES = ['初次接觸', '需求確認', '報價中', '決策中', '成交'];

// temperature：hot 熱 / warm 溫 / cold 冷
// closeProbability：AI 推估成交機率（%）
export const initialCustomers = [
  {
    id: 'c1',
    name: '陳志豪',
    phone: '0933-111-222',
    source: '展間來訪',
    temperature: 'hot',
    note: '太太預產 · 月底前要定車',
    interestedCar: 'BMW X5',
    stage: '決策中',
    closeProbability: 78,
    lastContactDays: 7,
  },
  {
    id: 'c4',
    name: '張美玲',
    phone: '0955-888-123',
    source: 'LINE',
    temperature: 'hot',
    note: '換車預算 120 萬 · 比較油電',
    interestedCar: 'Toyota RAV4 Hybrid',
    stage: '報價中',
    closeProbability: 66,
    lastContactDays: 2,
  },
  {
    id: 'c2',
    name: '林雅婷',
    phone: '0922-456-789',
    source: '電話詢問',
    temperature: 'warm',
    note: '喜歡喝紅酒 · GLC 試乘',
    interestedCar: 'Benz GLC',
    stage: '需求確認',
    closeProbability: 52,
    lastContactDays: 3,
  },
  {
    id: 'c3',
    name: '王建國',
    phone: '0910-246-810',
    source: '展間來訪',
    temperature: 'cold',
    note: '養貓 · 看過 Volvo XC60',
    interestedCar: 'Volvo XC60',
    stage: '初次接觸',
    closeProbability: 25,
    lastContactDays: 14,
  },
];

// 智慧待辦（對應後端 todos）
export const initialTodos = [
  { id: 'td1', customerId: 'c1', task: '確認白色 X5 現車與交車時間', priority: 'high', due: '今天', done: false },
  { id: 'td2', customerId: 'c1', task: '準備嬰兒座椅 ISOFIX 安裝示範', priority: 'medium', due: '3 天內', done: false },
  { id: 'td3', customerId: 'c4', task: '寄送 RAV4 油電版報價單', priority: 'high', due: '今天', done: false },
  { id: 'td4', customerId: 'c2', task: '安排 GLC 週末試乘', priority: 'medium', due: '本週內', done: false },
  { id: 'td5', customerId: 'c3', task: '傳 XC60 寵物友善配備資料', priority: 'low', due: '本週內', done: true },
];

// 自動回訪提醒（對應後端 followUps）
export const followUps = [
  { id: 'f1', customerId: 'c1', when: '今天', reason: '太太預產期將近，月底前是決策關鍵' },
  { id: 'f4', customerId: 'c4', when: '明天', reason: '報價單寄出後 1 天追蹤最有效' },
  { id: 'f2', customerId: 'c2', when: '10/9', reason: '試乘後 3 天內回訪，趁印象還深' },
];

// 互動紀錄（客戶詳情頁的時間軸）
export const interactions = {
  c1: [
    { id: 'i1', date: '10/05', type: '展間接待', text: 'VoiceRec 錄音 12 分鐘，確認白色 X5 與 ADAS 需求' },
    { id: 'i2', date: '09/28', type: '展間接待', text: '初次看車，比較 X5 與 GLC' },
  ],
  c4: [{ id: 'i3', date: '10/03', type: 'LINE', text: '詢問 RAV4 油電版價格與保固' }],
  c2: [{ id: 'i4', date: '10/02', type: '試乘', text: 'GLC 試乘 30 分鐘，在意後座空間' }],
  c3: [{ id: 'i5', date: '09/21', type: '展間接待', text: '看過 XC60，家裡有養貓' }],
};

// 錄音同意紀錄（隱私授權）
export const initialConsents = [
  {
    id: 'cs1',
    customerId: 'c1',
    customerName: '陳志豪',
    time: '2026/10/05 14:18',
    method: '口頭同意（錄音開頭留存）',
    status: 'active', // active 有效 / revoked 已撤回
  },
];

// 錄音／資料使用政策（同意頁與隱私頁共用）
export const privacyPolicy = [
  { icon: '🎯', title: '使用目的', text: '僅用於記錄您的購車需求，提供後續更貼心的服務' },
  { icon: '🗂️', title: '保存方式', text: '錄音檔 30 天後自動刪除，只保留文字摘要，資料加密存放於雲端' },
  { icon: '🙋', title: '您的權利', text: '可隨時要求查閱、更正或刪除您的資料，也可以拒絕錄音' },
];

// VoiceRec 即時逐字稿（confidence = 語音辨識信心值，低於 0.8 會提醒業務員確認）
export const transcript = [
  { id: 't1', speaker: 'sales', confidence: 0.96, text: '上次您說對 BMW X5 比較有興趣，今天想看看實車嗎？' },
  {
    id: 't2',
    speaker: 'customer',
    confidence: 0.92,
    text: '對，我太太說她喜歡白色的，不過她快生了，我想在她月子前就把車定下來。預算想控制在 170 萬左右，配備要有 ADAS。',
  },
  { id: 't3', speaker: 'customer', confidence: 0.71, text: '還有後面那台 G L C 的為門是電動的嗎？' },
];
export const detectedKeywords = ['太太快生了', '白色偏好', '170萬預算', 'ADAS需求', '電動尾門'];

// AI 智慧摘要（硬需求 Agent + 情緒價值 Agent + 成交分析）
// confidence = AI 對這個標籤的信心，低於 0.75 標成「待確認」
export const analysis = {
  c1: {
    recordedAt: '10/05 14:20',
    duration: '12 分 40 秒',
    asrConfidence: 91,
    summary: [
      '主要考慮 BMW X5，GLC 為備選',
      '太太偏好白色，需有 ADAS 主動安全',
      '希望在太太坐月子前完成訂車',
    ],
    hard: [
      { id: 'h1', label: '車款', value: 'BMW X5 / Benz GLC', confidence: 0.95 },
      { id: 'h2', label: '顏色', value: '白色（太太偏好）', confidence: 0.93 },
      { id: 'h3', label: '預算', value: '150–170 萬', confidence: 0.88 },
      { id: 'h4', label: '配備', value: 'ADAS 主動安全系統', confidence: 0.9 },
      { id: 'h5', label: '用途', value: '家庭用、嬰兒車空間需求', confidence: 0.68 },
    ],
    emotion: [
      { id: 'e1', label: '家庭', value: '太太下個月中預產', confidence: 0.94 },
      { id: 'e2', label: '時間', value: '希望月子前定車', confidence: 0.86 },
      { id: 'e3', label: '心理', value: '決策壓力大，需快確認', confidence: 0.62 },
    ],
    lifecycle: {
      stage: '決策中',
      reason: '已鎖定車款與預算，只差交車時間確認',
      nextAction: '本週提供白色 X5 現車與交車時程',
    },
    probability: {
      percentage: 78,
      level: '高',
      positive: ['明確預算', '有時間壓力（預產期）', '已指定顏色與配備'],
      risk: ['仍在比較 GLC', '太太尚未到店看車'],
      suggestion: '邀請太太一起賞車，並提供月底前訂車的配件優惠',
    },
  },
  c2: {
    recordedAt: '10/02 16:05',
    duration: '8 分 12 秒',
    asrConfidence: 88,
    summary: ['GLC 試乘滿意', '在意後座空間與乘坐舒適', '尚未談到預算'],
    hard: [
      { id: 'h6', label: '車款', value: 'Benz GLC', confidence: 0.92 },
      { id: 'h7', label: '配備', value: '後座空間、氣氛燈', confidence: 0.74 },
      { id: 'h8', label: '預算', value: '尚未提及', confidence: 0.55 },
    ],
    emotion: [
      { id: 'e4', label: '嗜好', value: '喜歡喝紅酒', confidence: 0.9 },
      { id: 'e5', label: '家庭', value: '常載父母出門', confidence: 0.7 },
    ],
    lifecycle: {
      stage: '需求確認',
      reason: '試乘完成，但預算與購車時間未明',
      nextAction: '回訪時確認預算區間與購車時間',
    },
    probability: {
      percentage: 52,
      level: '中',
      positive: ['主動預約試乘', '對車款評價正面'],
      risk: ['預算未明', '可能同時看其他品牌'],
      suggestion: '提供 GLC 分期試算，順勢了解預算',
    },
  },
};

// 回訪軍師
export const revisit = {
  c1: {
    daysSinceLast: 7,
    nextVisit: '今天',
    summary: '太太預產期快到，是關鍵決策點。建議先問候，再切入報價。',
    openers: [
      { title: '情感開場', text: '上次聽你說太太快生了，這幾天狀況還好嗎？月子中心都安排好了嗎？' },
      { title: '需求確認', text: '白色 X5 的現車我幫你確認好了，嬰兒車放進去沒問題，我們去看看？' },
      { title: '時間緊迫感', text: '月底前訂車我可以幫你申請到額外的配件優惠，這週應該是最好的時機。' },
    ],
    avoid: ['預算 150–170萬', 'ADAS 配備', '白色偏好'],
  },
  c2: {
    daysSinceLast: 3,
    nextVisit: '10/9',
    summary: '試乘反應不錯，但還沒談預算。先聊生活話題，再自然帶到分期方案。',
    openers: [
      { title: '情感開場', text: '上次聊到你喜歡紅酒，最近有喝到什麼好酒嗎？' },
      { title: '需求確認', text: '你說常載爸媽出門，GLC 後座的空間跟上下車高度你覺得 OK 嗎？' },
      { title: '時間緊迫感', text: '這個月 GLC 有低利分期，我幫你算一下月付大概多少？' },
    ],
    avoid: ['試乘感想', '後座空間'],
  },
};

// 汽車專有名詞詞庫（提升台灣口音與專有名詞的語音辨識準確率）
export const initialVocabulary = [
  'BMW X5',
  'Benz GLC',
  'Volvo XC60',
  'RAV4',
  'ADAS',
  'ACC 跟車',
  '電動尾門',
  'ISOFIX',
  '油電',
  '牌照稅',
];

// CRM 串接
export const crmSystems = ['原廠 DMS', 'Salesforce', 'HubSpot', 'CSV 匯出'];
export const crmFieldMap = [
  { from: '姓名 / 電話', to: 'Contact' },
  { from: '生命週期階段', to: 'Deal Stage' },
  { from: '成交機率', to: 'Probability' },
  { from: 'AI 摘要 / 標籤', to: 'Notes' },
  { from: '智慧待辦', to: 'Tasks' },
];
