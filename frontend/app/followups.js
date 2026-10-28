// 回訪提醒清單（首頁方格「回訪提醒」點進來）
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import BackHeader from '../src/components/BackHeader';
import CustomerTags from '../src/components/CustomerTags';
import { probabilityColor } from '../src/components/ProbabilityBar';
import { useCustomers } from '../src/context/CustomerContext';
import { followUps } from '../src/data/mockData';
import { colors, radius } from '../src/theme';
import { dayLabel } from '../src/utils/date';

export default function FollowUpsScreen() {
  const { getCustomer } = useCustomers();
  const list = [...followUps].sort((a, b) => (a.date > b.date ? 1 : -1));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <BackHeader title="回訪提醒" />
        <Text style={styles.hint}>AI 依每位客戶的狀況，自動排出建議回訪時間</Text>

        {list.map((f) => {
          const c = getCustomer(f.customerId);
          if (!c) return null;
          return (
            <View key={f.id} style={styles.card}>
              <View style={styles.top}>
                <View style={styles.dateBox}>
                  <Text style={styles.dateText}>{dayLabel(f.date)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {c.name}
                    <Text style={{ color: probabilityColor(c.closeProbability), fontSize: 13 }}>
                      {'  '}
                      {c.closeProbability}%
                    </Text>
                  </Text>
                  <CustomerTags customer={c} style={{ marginTop: 4 }} />
                </View>
              </View>
              <Text style={styles.reason}>{f.reason}</Text>
              <View style={styles.btnRow}>
                <Pressable
                  style={styles.btnPrimary}
                  onPress={() => router.push({ pathname: '/revisit', params: { id: c.id } })}
                >
                  <Text style={styles.btnPrimaryText}>💡 看回訪話術</Text>
                </Pressable>
                <Pressable style={styles.btn} onPress={() => router.push(`/customer/${c.id}`)}>
                  <Text style={styles.btnText}>客戶資料</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 32 },
  hint: { fontSize: 13, color: colors.subText, marginTop: -8, marginBottom: 12 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, marginBottom: 10 },
  top: { flexDirection: 'row', alignItems: 'center' },
  dateBox: {
    width: 56,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.orangeLight,
    alignItems: 'center',
    marginRight: 12,
  },
  dateText: { fontSize: 14, fontWeight: '700', color: colors.orange },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  reason: { fontSize: 13, color: colors.text, marginTop: 10, lineHeight: 20 },
  btnRow: { flexDirection: 'row', marginTop: 10 },
  btnPrimary: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center', marginRight: 8 },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  btn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', backgroundColor: '#fff' },
  btnText: { color: colors.text, fontSize: 14 },
});
