// 新手引導：用「接待前 → 接待中 → 接待後」的情境，帶不熟手機 App 的資深業務員上手
// 第一次登入會自動出現；之後可以在「我的 → 使用教學」重看
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useCustomers } from '../src/context/CustomerContext';
import { colors, radius } from '../src/theme';

const slides = [
  {
    emoji: '👋',
    title: '歡迎使用 VoiceRec',
    text: '把以前記在筆記本、LINE、腦袋裡的客戶資訊，集中在一個地方。不用打字，系統幫你記。',
    tip: '只要會用 LINE，就會用這個 App',
  },
  {
    emoji: '💡',
    title: '接待前：先看「回訪軍師」',
    text: '客戶到店前打開回訪軍師，系統會提醒你上次聊了什麼、這次可以怎麼開場。',
    tip: '打開 App 的首頁，就會告訴你今天該聯絡誰',
  },
  {
    emoji: '🎙️',
    title: '接待中：取得同意後一鍵錄音',
    text: '按下方中間的 🎙️、選好客戶，系統會跳出同意說明，你照著唸給客戶聽，客戶同意後才開始錄音。',
    tip: '客戶不同意也沒關係，可以改用手動新增客戶',
  },
  {
    emoji: '✅',
    title: '接待後：確認 AI 整理的重點',
    text: 'AI 會把對話整理成需求標籤和待辦事項。不確定的標籤會標成「待確認」，你按一下確認或修正就好。',
    tip: '你修正得越多，AI 會越懂你的客戶',
  },
];

export default function OnboardingScreen() {
  const { replay } = useLocalSearchParams(); // 從「使用教學」進來時 replay = '1'
  const { setOnboarded } = useCustomers();
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  function finish() {
    setOnboarded(true);
    if (replay) router.back();
    else router.replace('/home');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Pressable style={styles.skip} onPress={finish} hitSlop={10}>
          <Text style={styles.skipText}>略過</Text>
        </Pressable>

        <View style={styles.body}>
          <View style={styles.emojiBox}>
            <Text style={{ fontSize: 56 }}>{slide.emoji}</Text>
          </View>
          <Text style={styles.step}>
            {index + 1} / {slides.length}
          </Text>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.text}>{slide.text}</Text>
          <View style={styles.tipBox}>
            <Text style={styles.tipText}>💬 {slide.tip}</Text>
          </View>
        </View>

        {/* 下方圓點 */}
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.btnRow}>
          {index > 0 && (
            <Pressable style={styles.secondaryBtn} onPress={() => setIndex(index - 1)}>
              <Text style={styles.secondaryText}>上一步</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.primaryBtn, { flex: 1 }]}
            onPress={() => (isLast ? finish() : setIndex(index + 1))}
          >
            <Text style={styles.primaryText}>{isLast ? '開始使用' : '下一步'}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: 24 },
  skip: { alignSelf: 'flex-end' },
  skipText: { color: colors.subText, fontSize: 14 },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emojiBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  step: { fontSize: 13, color: colors.primary, marginBottom: 6 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center' },
  text: { fontSize: 16, lineHeight: 26, color: colors.subText, textAlign: 'center', marginTop: 12 },
  tipBox: { backgroundColor: colors.card, borderRadius: radius.md, padding: 12, marginTop: 20 },
  tipText: { fontSize: 14, color: colors.text },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border, marginHorizontal: 4 },
  dotActive: { width: 22, backgroundColor: colors.primary },
  btnRow: { flexDirection: 'row' },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginRight: 10,
  },
  secondaryText: { color: colors.text, fontSize: 16 },
});
