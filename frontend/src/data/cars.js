// 各品牌車款目錄（首頁幻燈片、推薦自家車款、競品比較都用這份）
// ⚠️ 示範資料：價格是大約的「示範價格」，優勢描述也是示範內容，
//    正式版請改成原廠公告的資料，或由後端 AI 依規格表產生。
// image：之後可以換成原廠的車款圖片網址，沒有圖片時用色塊＋圖示代替

// 台灣常見的汽車品牌（註冊時選；不在清單裡的可以自己輸入）
// 有車款目錄的品牌：首頁會輪播該品牌車款，AI 也能推薦；其他品牌之後由後端補資料
export const BRANDS = [
  'Toyota', 'Lexus', 'Honda', 'Nissan', 'Mazda', 'Mitsubishi', 'Subaru', 'Suzuki',
  'Ford', 'Hyundai', 'Kia', 'Luxgen', 'BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen',
  'Porsche', 'Volvo', 'Tesla', 'Skoda', 'Peugeot', 'MINI', 'Land Rover', 'Jaguar',
];

// type：SUV / 轎車 / 電動車；priceFrom：示範價格（萬元起）
export const catalog = {
  BMW: [
    {
      id: 'bmw-x5',
      name: 'BMW X5',
      type: 'SUV',
      priceFrom: 400,
      tagline: '豪華大型休旅，全家出遊的旗艦選擇',
      colors: ['#1C3D6E', '#3E6FB0'],
      icon: '🚙',
      strengths: ['七人座選配，後座與行李廂空間大', '駕駛輔助系統完整', '操控與舒適兼顧'],
      rival: { name: 'Mercedes-Benz GLE', strengths: ['內裝豪華感強', '品牌形象穩重'] },
      pitch: '同級空間更大、駕駛樂趣更好，適合常載家人又自己愛開車的客戶。',
    },
    {
      id: 'bmw-x3',
      name: 'BMW X3',
      type: 'SUV',
      priceFrom: 260,
      tagline: '中型豪華休旅，城市與郊外都好開',
      colors: ['#23395B', '#5B7DB1'],
      icon: '🚙',
      strengths: ['尺寸好停車，日常通勤方便', '後座可放兒童座椅與嬰兒車', '油耗表現佳'],
      rival: { name: 'Mercedes-Benz GLC', strengths: ['內裝設計精緻', '乘坐較柔和'] },
      pitch: '開起來更有操控感，空間足夠小家庭使用，價格比大型休旅親民。',
    },
    {
      id: 'bmw-x1',
      name: 'BMW X1',
      type: 'SUV',
      priceFrom: 200,
      tagline: '入門豪華休旅，首購也能入手',
      colors: ['#2E4A62', '#6F8FAF'],
      icon: '🚙',
      strengths: ['豪華品牌入門價格', '車身小巧好駕馭', '科技配備齊全'],
      rival: { name: 'Toyota RAV4', strengths: ['價格較低', '油電車型省油'] },
      pitch: '多一點預算就能升級豪華品牌，保值性與駕駛質感都更好。',
    },
    {
      id: 'bmw-i4',
      name: 'BMW i4',
      type: '電動車',
      priceFrom: 280,
      tagline: '純電四門跑車，安靜又有力',
      colors: ['#0F4C5C', '#2A9D8F'],
      icon: '⚡',
      strengths: ['純電免油錢、保養費低', '加速快、安靜', '牌照稅與燃料費優惠'],
      rival: { name: 'Tesla Model 3', strengths: ['充電網路普及', '價格較低'] },
      pitch: '品牌質感與內裝做工更好，適合想換電動車又重視質感的客戶。',
    },
  ],
  'Mercedes-Benz': [
    { id: 'benz-gle', name: 'Mercedes-Benz GLE', type: 'SUV', priceFrom: 410, tagline: '大型豪華休旅，舒適穩重', colors: ['#2B2D42', '#6C7086'], icon: '🚙', strengths: ['乘坐舒適', '內裝豪華', '品牌形象穩重'], rival: { name: 'BMW X5', strengths: ['操控較好', '空間選擇多'] }, pitch: '乘坐舒適度與豪華感是同級標竿，適合重視體面的商務客戶。' },
    { id: 'benz-glc', name: 'Mercedes-Benz GLC', type: 'SUV', priceFrom: 280, tagline: '中型豪華休旅銷售常勝軍', colors: ['#3D405B', '#81839B'], icon: '🚙', strengths: ['內裝設計精緻', '乘坐柔和', '品牌好感度高'], rival: { name: 'BMW X3', strengths: ['操控更靈活', '油耗表現佳'] }, pitch: '內裝質感和乘坐舒適是最大賣點，適合常載家人或長輩的客戶。' },
    { id: 'benz-c', name: 'Mercedes-Benz C-Class', type: '轎車', priceFrom: 230, tagline: '豪華中型轎車，入門賓士', colors: ['#22223B', '#4A4E69'], icon: '🚗', strengths: ['入門豪華品牌', '科技座艙', '外型優雅'], rival: { name: 'BMW 3 Series', strengths: ['操控性佳'] }, pitch: '用合理預算享受賓士品牌與科技座艙。' },
  ],
  Toyota: [
    { id: 'toyota-rav4', name: 'Toyota RAV4', type: 'SUV', priceFrom: 110, tagline: '國民休旅，油電省油又耐用', colors: ['#7A1C1C', '#C0392B'], icon: '🚙', strengths: ['油電車型省油', '妥善率高、保養便宜', '二手保值'], rival: { name: 'Honda CR-V', strengths: ['車室空間大', '座椅舒適'] }, pitch: '省油、耐用、好保養，長期持有成本最低。' },
    { id: 'toyota-cc', name: 'Toyota Corolla Cross', type: 'SUV', priceFrom: 80, tagline: '首購休旅首選', colors: ['#8D2B0B', '#E07A5F'], icon: '🚙', strengths: ['價格親民', '油電車型', '安全配備齊全'], rival: { name: 'Honda HR-V', strengths: ['內裝空間靈活'] }, pitch: '首購族最安心的選擇，預算內就有完整安全配備。' },
    { id: 'toyota-camry', name: 'Toyota Camry', type: '轎車', priceFrom: 110, tagline: '舒適大型房車', colors: ['#5C1A1B', '#A4161A'], icon: '🚗', strengths: ['後座寬敞', '油電省油', '乘坐舒適'], rival: { name: 'Honda Accord', strengths: ['操控較靈活'] }, pitch: '寬敞舒適又省油，適合家庭與商務兼用。' },
  ],
  Lexus: [
    { id: 'lexus-nx', name: 'Lexus NX', type: 'SUV', priceFrom: 180, tagline: '日系豪華中型休旅', colors: ['#3A3A3A', '#8D8D8D'], icon: '🚙', strengths: ['油電省油', '妥善率高', '服務口碑好'], rival: { name: 'BMW X3', strengths: ['操控較好'] }, pitch: '豪華、省油又可靠，售後服務是最大加分。' },
    { id: 'lexus-rx', name: 'Lexus RX', type: 'SUV', priceFrom: 260, tagline: '豪華大型休旅', colors: ['#2F2F2F', '#6B6B6B'], icon: '🚙', strengths: ['乘坐安靜舒適', '油電動力', '保值'], rival: { name: 'BMW X5', strengths: ['空間更大'] }, pitch: '安靜舒適又保值，適合重視長期持有的客戶。' },
    { id: 'lexus-es', name: 'Lexus ES', type: '轎車', priceFrom: 190, tagline: '豪華舒適房車', colors: ['#404040', '#9A9A9A'], icon: '🚗', strengths: ['後座舒適', '油電省油', '安靜'], rival: { name: 'Mercedes-Benz E-Class', strengths: ['品牌形象'] }, pitch: '同級最安靜舒適的豪華房車之一。' },
  ],
  Volvo: [
    { id: 'volvo-xc60', name: 'Volvo XC60', type: 'SUV', priceFrom: 230, tagline: '北歐安全休旅', colors: ['#1D3557', '#457B9D'], icon: '🚙', strengths: ['主動安全配備完整', '北歐簡約內裝', '座椅舒適'], rival: { name: 'BMW X3', strengths: ['操控性佳'] }, pitch: '安全是 Volvo 的招牌，適合有小孩或寵物的家庭。' },
    { id: 'volvo-xc90', name: 'Volvo XC90', type: 'SUV', priceFrom: 330, tagline: '七人座安全旗艦', colors: ['#14213D', '#3A6EA5'], icon: '🚙', strengths: ['七人座', '安全配備', '內裝質感'], rival: { name: 'BMW X5', strengths: ['操控與動力'] }, pitch: '大家庭最安心的七人座豪華休旅。' },
    { id: 'volvo-xc40', name: 'Volvo XC40', type: 'SUV', priceFrom: 160, tagline: '城市小型休旅', colors: ['#264653', '#2A9D8F'], icon: '🚙', strengths: ['好停車', '安全配備', '設計年輕'], rival: { name: 'BMW X1', strengths: ['操控'] }, pitch: '城市代步也能擁有 Volvo 的安全感。' },
  ],
  Honda: [
    { id: 'honda-crv', name: 'Honda CR-V', type: 'SUV', priceFrom: 110, tagline: '空間大的家庭休旅', colors: ['#6A040F', '#D00000'], icon: '🚙', strengths: ['車室空間大', '座椅舒適', '油電車型'], rival: { name: 'Toyota RAV4', strengths: ['妥善率口碑'] }, pitch: '同級空間最大，全家出遊最舒服。' },
    { id: 'honda-hrv', name: 'Honda HR-V', type: 'SUV', priceFrom: 90, tagline: '年輕人的第一台休旅', colors: ['#9D0208', '#E85D04'], icon: '🚙', strengths: ['座椅變化靈活', '價格親民', '外型年輕'], rival: { name: 'Toyota Corolla Cross', strengths: ['油電省油'] }, pitch: '空間靈活好用，年輕家庭也適合。' },
    { id: 'honda-civic', name: 'Honda Civic', type: '轎車', priceFrom: 110, tagline: '操控好的跑格轎車', colors: ['#370617', '#9D0208'], icon: '🚗', strengths: ['操控靈活', '外型跑格', '油耗佳'], rival: { name: 'Toyota Corolla Altis', strengths: ['價格較低'] }, pitch: '開起來最有樂趣的國產轎車。' },
  ],
};

// 從「BMW X5」這種字串找出品牌
export function brandOf(carName = '') {
  return BRANDS.find((b) => carName.startsWith(b + ' ')) || carName.split(' ')[0];
}
