// 首頁的新車幻燈片：依業務員的品牌，隨機順序輪播該品牌車款，每 4 秒換一張
// 版面：車名在上、整台車置中、下面一行簡短資訊
// 目前用通用的示意車圖（依 SUV / 轎車 / 電動車），之後在 cars.js 加上 image 網址就會改顯示原廠照片
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { catalog } from '../data/cars';
import { colors, radius } from '../theme';

const carImages = {
  SUV: require('../assets/cars/suv.png'),
  轎車: require('../assets/cars/sedan.png'),
  電動車: require('../assets/cars/ev.png'),
};

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function CarSlideshow({ brand, onPressCar }) {
  const cars = useMemo(() => {
    const list = catalog[brand];
    // 還沒有車款資料的品牌：先放一張品牌示意卡
    if (!list) return brand ? [{ id: 'placeholder', name: brand, type: '轎車', placeholder: true }] : [];
    return shuffle(list);
  }, [brand]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (cars.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % cars.length), 4000);
    return () => clearInterval(timer);
  }, [cars.length]);

  if (cars.length === 0) {
    return (
      <View style={[styles.slide, { justifyContent: 'center' }]}>
        <Text style={styles.sub}>到「我的」設定代理品牌後，這裡會輪播新車</Text>
      </View>
    );
  }

  const car = cars[index % cars.length];
  const go = (d) => setIndex((i) => (i + d + cars.length) % cars.length);
  const source = car.image ? { uri: car.image } : carImages[car.type] || carImages['轎車'];

  return (
    <View>
      <Pressable style={styles.slide} onPress={() => onPressCar && !car.placeholder && onPressCar(car)}>
        {/* 地板的光暈 */}
        <View style={styles.glow} />

        <Text style={styles.name}>{car.name}</Text>
        <Text style={styles.sub}>
          {car.placeholder ? '新車資料準備中' : `${car.type}・示範價格 ${car.priceFrom} 萬起`}
        </Text>

        <Image source={source} style={styles.car} resizeMode="contain" />

        {cars.length > 1 && (
          <>
            <Pressable style={[styles.arrow, { left: 8 }]} onPress={() => go(-1)} hitSlop={8}>
              <Text style={styles.arrowText}>‹</Text>
            </Pressable>
            <Pressable style={[styles.arrow, { right: 8 }]} onPress={() => go(1)} hitSlop={8}>
              <Text style={styles.arrowText}>›</Text>
            </Pressable>
          </>
        )}
      </Pressable>

      {cars.length > 1 && (
        <View style={styles.dots}>
          {cars.map((c, i) => (
            <View key={c.id} style={[styles.dot, i === index % cars.length && styles.dotOn]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    height: 200,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#1B2633',
    alignItems: 'center',
    paddingTop: 18,
  },
  glow: {
    position: 'absolute',
    bottom: -70,
    width: 340,
    height: 150,
    borderRadius: 170,
    backgroundColor: '#33475C',
  },
  name: { color: '#fff', fontSize: 22, fontWeight: '600', letterSpacing: 0.5 },
  sub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 4 },
  car: { width: '76%', height: 120, marginTop: 6 },
  arrow: {
    position: 'absolute',
    top: 110,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: { color: '#fff', fontSize: 18, marginTop: -2 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border, marginHorizontal: 3 },
  dotOn: { width: 18, backgroundColor: colors.primary },
});
