// CRM 串接：選擇要同步的系統、欄位對應、手動同步、匯出 CSV
// 目前「同步」是模擬的；之後由後端 API 實際呼叫 CRM。CSV 匯出是真的可以用（透過手機的分享選單）
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackHeader from '../src/components/BackHeader';
import Chip from '../src/components/Chip';
import SectionTitle from '../src/components/SectionTitle';
import { useCustomers } from '../src/context/CustomerContext';
import { crmFieldMap, crmSystems } from '../src/data/mockData';
import { colors, radius } from '../src/theme';

const tempLabel = { hot: '熱', warm: '溫', cold: '冷' };

export default function CrmScreen() {
  const { customers, crm, chooseCrm, syncCrm } = useCustomers();

  // 把客戶資料轉成 CSV 文字
  function buildCsv() {
    const header = '姓名,電話,來源,溫度,生命週期,成交機率,興趣車款,備註';
    const rows = customers.map((c) =>
      [c.name, c.phone, c.source, tempLabel[c.temperature], c.stage, `${c.closeProbability}%`, c.interestedCar, c.note]
        .map((v) => `"${v || ''}"`)
        .join(',')
    );
    return [header, ...rows].join('\n');
  }

  async function exportCsv() {
    await Share.share({ title: '客戶資料.csv', message: buildCsv() });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <BackHeader title="CRM 串接" />

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            把 VoiceRec 整理好的客戶資料同步到公司現有的 CRM，業務員不用重複建檔，主管也能在原系統看到進度。
          </Text>
        </View>

        <SectionTitle title="同步目標" />
        <View style={styles.chipWrap}>
          {crmSystems.map((s) => (
            <View key={s} style={{ marginBottom: 8 }}>
              <Chip label={s} selected={crm.system === s} onPress={() => chooseCrm(s)} />
            </View>
          ))}
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>🔗 {crm.system}</Text>
          <Text style={styles.statusText}>上次同步：{crm.lastSync}</Text>
          <Text style={styles.statusText}>將同步 {customers.length} 位客戶</Text>
        </View>

        <SectionTitle title="欄位對應" />
        <View style={styles.card}>
          {crmFieldMap.map((f, i) => (
            <View key={f.from} style={[styles.mapRow, i < crmFieldMap.length - 1 && styles.divider]}>
              <Text style={styles.mapFrom}>{f.from}</Text>
              <Text style={styles.mapArrow}>→</Text>
              <Text style={styles.mapTo}>{f.to}</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.primaryBtn} onPress={syncCrm}>
          <Text style={styles.primaryText}>立即同步</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={exportCsv}>
          <Text style={styles.secondaryText}>匯出客戶資料（CSV）</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20 },
  infoBox: { backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: 12 },
  infoText: { fontSize: 13, lineHeight: 20, color: colors.text },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  statusCard: { backgroundColor: colors.greenLight, borderRadius: radius.md, padding: 14, marginTop: 4 },
  statusTitle: { fontSize: 15, fontWeight: '600', color: colors.green },
  statusText: { fontSize: 13, color: colors.text, marginTop: 4 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: 14 },
  mapRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  mapFrom: { flex: 1, fontSize: 13, color: colors.text },
  mapArrow: { fontSize: 13, color: colors.placeholder, marginHorizontal: 8 },
  mapTo: { flex: 1, fontSize: 13, color: colors.primary, textAlign: 'right' },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryText: { color: colors.text, fontSize: 15 },
});
