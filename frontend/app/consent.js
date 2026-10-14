// 錄音前的「客戶隱私授權」：說明用途／保存／權利 → 客戶逐項同意 → 選擇同意方式 → 開始錄音
// 同意紀錄（誰、何時、用什麼方式）會存起來，可在「我的 → 隱私與授權紀錄」查看
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import BackHeader from '../src/components/BackHeader';
import Chip from '../src/components/Chip';
import { useCustomers } from '../src/context/CustomerContext';
import { privacyPolicy } from '../src/data/mockData';
import { colors, radius } from '../src/theme';

const methods = ['口頭同意（錄音開頭留存）', '客戶在手機上勾選', '紙本簽名'];

export default function ConsentScreen() {
  const { customerId } = useLocalSearchParams();
  const { getCustomer, giveConsentAndStart } = useCustomers();
  const customer = getCustomer(customerId);
  const [checked, setChecked] = useState(privacyPolicy.map(() => false));
  const [method, setMethod] = useState(methods[0]);
  const allChecked = checked.every(Boolean);

  function toggle(i) {
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  }

  function agree() {
    giveConsentAndStart(customerId, method);
    router.replace('/record/live'); // 直接進全螢幕錄音
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <BackHeader title="錄音前客戶同意" />

        <Text style={styles.customer}>客戶：{customer ? customer.name : '新客戶'}</Text>

        {/* 給業務員照著唸的話術，資深業務也不用自己想怎麼開口 */}
        <View style={styles.scriptBox}>
          <Text style={styles.scriptTitle}>🗣️ 請對客戶說</Text>
          <Text style={styles.scriptText}>
            「為了記住您今天提到的需求，之後提供更貼心的服務，我想把這段對話錄音並轉成文字。錄音只會用在您的購車服務，您隨時可以要求刪除。請問可以嗎？」
          </Text>
        </View>

        <Text style={styles.sectionTitle}>請客戶逐項確認</Text>
        {privacyPolicy.map((p, i) => (
          <Pressable key={p.title} style={styles.item} onPress={() => toggle(i)}>
            <View style={[styles.box, checked[i] && styles.boxOn]}>
              {checked[i] && <Text style={styles.check}>✓</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>
                {p.icon} {p.title}
              </Text>
              <Text style={styles.itemText}>{p.text}</Text>
            </View>
          </Pressable>
        ))}

        <Text style={styles.sectionTitle}>同意方式</Text>
        <View style={styles.chipWrap}>
          {methods.map((m) => (
            <View key={m} style={{ marginBottom: 8 }}>
              <Chip label={m} selected={method === m} onPress={() => setMethod(m)} />
            </View>
          ))}
        </View>

        <Pressable style={[styles.agreeBtn, !allChecked && { opacity: 0.4 }]} disabled={!allChecked} onPress={agree}>
          <Text style={styles.agreeText}>客戶同意，開始錄音</Text>
        </Pressable>
        {!allChecked && <Text style={styles.hint}>三項都勾選後才能開始錄音</Text>}

        {/* 客戶不同意：新客戶 → 手動建檔；舊客戶 → 回到他的詳情頁手動記錄 */}
        <Pressable
          style={styles.declineBtn}
          onPress={() =>
            customerId === 'new' ? router.replace('/add-customer') : router.replace(`/customer/${customerId}`)
          }
        >
          <Text style={styles.declineText}>客戶不同意 → 改用手動筆記</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20 },
  customer: { fontSize: 15, color: colors.text, marginBottom: 12 },
  scriptBox: { backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: 14 },
  scriptTitle: { fontSize: 13, color: colors.primary, fontWeight: '600', marginBottom: 6 },
  scriptText: { fontSize: 15, lineHeight: 24, color: colors.text },
  sectionTitle: { fontSize: 13, color: colors.subText, marginTop: 18, marginBottom: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.placeholder,
    marginRight: 12,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.green, borderColor: colors.green },
  check: { color: '#fff', fontSize: 13, fontWeight: '700' },
  itemTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  itemText: { fontSize: 13, color: colors.subText, marginTop: 2, lineHeight: 19 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  agreeBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  agreeText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  hint: { fontSize: 12, color: colors.subText, textAlign: 'center', marginTop: 6 },
  declineBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  declineText: { color: colors.red, fontSize: 14 },
});
