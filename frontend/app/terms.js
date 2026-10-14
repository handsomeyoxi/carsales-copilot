// 服務條款 / 隱私權政策 閱讀頁
// 從登入頁、註冊頁、「我的」都可以打開
// params：doc = 'terms' 或 'privacy'（先顯示哪一份）；from = 'register' 時底部顯示「同意並返回」
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import BackHeader from '../src/components/BackHeader';
import { useCustomers } from '../src/context/CustomerContext';
import { LEGAL_VERSION, legalDocs } from '../src/data/legal';
import { colors, radius } from '../src/theme';

const tabs = [
  { key: 'terms', label: '服務條款' },
  { key: 'privacy', label: '隱私權政策' },
];

export default function TermsScreen() {
  const { doc = 'terms', from } = useLocalSearchParams();
  const { setTermsAgreed } = useCustomers();
  const [tab, setTab] = useState(doc);
  const current = legalDocs[tab];

  function agreeAndBack() {
    setTermsAgreed(true); // 註冊頁的勾選框會自動打勾
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <BackHeader title="條款與政策" />
        <View style={styles.segment}>
          {tabs.map((t) => (
            <Pressable
              key={t.key}
              style={[styles.segBtn, tab === t.key && styles.segActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.segText, tab === t.key && styles.segTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.version}>{LEGAL_VERSION}</Text>
        <Text style={styles.intro}>{current.intro}</Text>

        {current.sections.map((s) => (
          <View key={s.heading} style={styles.section}>
            <Text style={styles.heading}>{s.heading}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>

      {/* 從註冊頁進來才顯示 */}
      {from === 'register' && (
        <View style={styles.bottom}>
          <Pressable style={styles.agreeBtn} onPress={agreeAndBack}>
            <Text style={styles.agreeText}>我已閱讀並同意，返回註冊</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: { paddingHorizontal: 20, paddingTop: 20 },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 3,
  },
  segBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  segActive: { backgroundColor: colors.primaryLight },
  segText: { fontSize: 14, color: colors.subText },
  segTextActive: { color: colors.primary, fontWeight: '600' },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  version: { fontSize: 12, color: colors.subText, marginTop: 4 },
  intro: { fontSize: 14, lineHeight: 23, color: colors.text, marginTop: 12 },
  section: { marginTop: 18 },
  heading: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 23, color: colors.subText },
  bottom: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
  agreeBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  agreeText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
