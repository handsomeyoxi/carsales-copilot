// 編輯個人資料：跟註冊後填的業務員資料用同一個表單（含代理品牌）
// Email 是登入帳號，這裡不能改
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import BackHeader from '../src/components/BackHeader';
import SalespersonForm from '../src/components/SalespersonForm';
import { useCustomers } from '../src/context/CustomerContext';
import { colors, radius } from '../src/theme';

export default function ProfileEditScreen() {
  const { profile, saveProfile } = useCustomers();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // 存到後端（salespersons/{uid}），成功才回上一頁；改品牌會影響 AI 推薦的車
  async function save(data) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await saveProfile(data);
      router.back();
    } catch (e) {
      setError(`儲存失敗：${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <BackHeader title="編輯個人資料" />
        <View style={styles.emailBox}>
          <Text style={styles.emailLabel}>登入帳號（不可修改）</Text>
          <Text style={styles.email}>{profile.email}</Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <SalespersonForm initial={profile} submitText={busy ? '儲存中…' : '儲存'} onSubmit={save} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 32 },
  error: { color: colors.red, fontSize: 13, marginBottom: 10 },
  emailBox: { backgroundColor: colors.card, borderRadius: radius.md, padding: 12, marginBottom: 16 },
  emailLabel: { fontSize: 11, color: colors.subText },
  email: { fontSize: 15, color: colors.text, marginTop: 2 },
});
