// 最近錄音清單（首頁方格「最近錄音」點進來）
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import BackHeader from '../src/components/BackHeader';
import Tag from '../src/components/Tag';
import { useCustomers } from '../src/context/CustomerContext';
import { analysis } from '../src/data/mockData';
import { colors, radius } from '../src/theme';

export default function RecordingsScreen() {
  const { getCustomer, tagReviews } = useCustomers();
  const list = Object.entries(analysis).map(([id, a]) => ({
    id,
    ...a,
    unchecked: [...a.hard, ...a.emotion].filter((t) => t.confidence < 0.75 && !tagReviews[t.id]).length,
  }));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <BackHeader title="最近錄音" />
        {list.map((r) => (
          <Pressable key={r.id} style={styles.row} onPress={() => router.push({ pathname: '/summary', params: { id: r.id } })}>
            <Text style={{ fontSize: 22, marginRight: 12 }}>🎙️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{getCustomer(r.id)?.name}</Text>
              <Text style={styles.meta}>
                {r.recordedAt} · {r.duration} · 辨識信心 {r.asrConfidence}%
              </Text>
              <Text style={styles.summary} numberOfLines={1}>
                {r.summary[0]}
              </Text>
            </View>
            {r.unchecked > 0 ? <Tag label={`${r.unchecked} 待確認`} tone="warm" /> : <Tag label="已確認" tone="green" />}
          </Pressable>
        ))}
        <Text style={styles.foot}>按下方中間的 🎙️ 可以開始新的錄音</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, marginBottom: 10 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.subText, marginTop: 2 },
  summary: { fontSize: 13, color: colors.text, marginTop: 4 },
  foot: { fontSize: 12, color: colors.subText, textAlign: 'center', marginTop: 12 },
});
