// 錄音流程 ④：AI 分析進度
// 一步一步顯示分析到哪裡，完成後進入這位客戶的 AI 摘要
// 目前用計時器模擬每一步；之後改成等後端 analyzeAfterConversation API 回傳
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useCustomers } from '../../src/context/CustomerContext';
import { analysis } from '../../src/data/mockData';
import { colors, radius } from '../../src/theme';

const steps = ['語音轉文字', '硬需求 Agent', '情緒價值 Agent', '成交機率與生命週期', '產生待辦與回訪提醒'];

export default function AnalyzingScreen() {
  const { id, seconds = '0' } = useLocalSearchParams();
  const { getCustomer } = useCustomers();
  const [done, setDone] = useState(0); // 已完成幾步
  const customer = getCustomer(id);
  const isNew = id === 'new';
  const finished = done >= steps.length;
  const data = analysis[id];
  const lowTags = data ? [...data.hard, ...data.emotion].filter((t) => t.confidence < 0.75).length : 0;

  // 模擬：每 0.8 秒完成一步
  useEffect(() => {
    if (finished) return;
    const t = setTimeout(() => setDone((d) => d + 1), 800);
    return () => clearTimeout(t);
  }, [done, finished]);

  const mins = Math.floor(Number(seconds) / 60);
  const secs = Number(seconds) % 60;

  function goNext() {
    if (isNew) router.replace('/add-customer'); // 新客戶 → AI 預填好的建檔頁
    else router.replace({ pathname: '/summary', params: { id } });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.icon}>{finished ? '✅' : '🧠'}</Text>
        <Text style={styles.title}>{finished ? '分析完成！' : 'AI 分析中…'}</Text>
        <Text style={styles.sub}>
          {customer ? customer.name : '新客戶'} · 錄音 {mins} 分 {secs} 秒
        </Text>

        <View style={styles.card}>
          {steps.map((s, i) => {
            const state = i < done ? 'done' : i === done ? 'now' : 'wait';
            return (
              <View key={s} style={styles.step}>
                <View style={[styles.dot, styles[state]]}>
                  <Text style={styles.dotText}>{state === 'done' ? '✓' : state === 'now' ? '…' : i + 1}</Text>
                </View>
                <Text style={[styles.stepText, state === 'wait' && { color: colors.placeholder }]}>{s}</Text>
              </View>
            );
          })}
        </View>

        {finished && !isNew && lowTags > 0 && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>有 {lowTags} 個低信心標籤需要你確認</Text>
          </View>
        )}
        {finished && isNew && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>AI 已從對話預填客戶資料，請確認後建檔</Text>
          </View>
        )}

        <Pressable style={[styles.btn, !finished && { opacity: 0.4 }]} disabled={!finished} onPress={goNext}>
          <Text style={styles.btnText}>{isNew ? '確認並建立客戶' : '查看 AI 摘要'}</Text>
        </Pressable>
        {!finished && (
          <Pressable onPress={() => router.replace('/home')}>
            <Text style={styles.later}>先回首頁，分析好會通知你 🔔</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  icon: { fontSize: 52, textAlign: 'center' },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', color: colors.text, marginTop: 8 },
  sub: { fontSize: 13, color: colors.subText, textAlign: 'center', marginTop: 4 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginTop: 22 },
  step: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  done: { backgroundColor: colors.green },
  now: { backgroundColor: colors.primary },
  wait: { backgroundColor: colors.border },
  dotText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepText: { fontSize: 15, color: colors.text },
  notice: { backgroundColor: colors.orangeLight, borderRadius: radius.md, padding: 12, marginTop: 14 },
  noticeText: { color: colors.orange, fontSize: 13 },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  later: { color: colors.subText, fontSize: 13, textAlign: 'center', marginTop: 14 },
});
