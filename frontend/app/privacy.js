// 隱私與授權紀錄：資料使用政策 + 每一筆錄音同意紀錄（可依客戶要求撤回並刪除資料）
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackHeader from '../src/components/BackHeader';
import SectionTitle from '../src/components/SectionTitle';
import Tag from '../src/components/Tag';
import { useCustomers } from '../src/context/CustomerContext';
import { privacyPolicy } from '../src/data/mockData';
import { colors, radius } from '../src/theme';

export default function PrivacyScreen() {
  const { consents, revokeConsent } = useCustomers();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <BackHeader title="隱私與授權紀錄" />

        <SectionTitle title="資料使用政策" />
        <View style={styles.card}>
          {privacyPolicy.map((p) => (
            <View key={p.title} style={styles.policyRow}>
              <Text style={styles.policyTitle}>
                {p.icon} {p.title}
              </Text>
              <Text style={styles.policyText}>{p.text}</Text>
            </View>
          ))}
        </View>

        <SectionTitle title={`錄音同意紀錄（${consents.length}）`} />
        {consents.map((c) => (
          <View key={c.id} style={styles.record}>
            <View style={styles.recordTop}>
              <Text style={styles.recordName}>{c.customerName}</Text>
              <Tag label={c.status === 'active' ? '有效' : '已撤回'} tone={c.status === 'active' ? 'green' : 'hot'} />
            </View>
            <Text style={styles.recordMeta}>{c.time}</Text>
            <Text style={styles.recordMeta}>方式：{c.method}</Text>
            {c.status === 'active' && (
              <Pressable style={styles.revokeBtn} onPress={() => revokeConsent(c.id)}>
                <Text style={styles.revokeText}>客戶要求撤回並刪除錄音</Text>
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14 },
  policyRow: { paddingVertical: 6 },
  policyTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  policyText: { fontSize: 13, color: colors.subText, marginTop: 2, lineHeight: 19 },
  record: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14, marginBottom: 8 },
  recordTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recordName: { fontSize: 15, fontWeight: '600', color: colors.text },
  recordMeta: { fontSize: 12, color: colors.subText, marginTop: 4 },
  revokeBtn: { marginTop: 10, alignSelf: 'flex-start' },
  revokeText: { fontSize: 13, color: colors.red },
});
