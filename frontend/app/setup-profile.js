// 註冊第 2 步：填寫業務員資料（姓名、手機、代理品牌、展間、職稱）
// 註冊完一定會先到這頁，填完才進新手引導
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import SalespersonForm from '../src/components/SalespersonForm';
import { useCustomers } from '../src/context/CustomerContext';
import { colors } from '../src/theme';

export default function SetupProfileScreen() {
  const { profile, updateProfile } = useCustomers();

  function save(data) {
    updateProfile(data);
    router.replace('/onboarding');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.step}>步驟 2 / 2</Text>
        <Text style={styles.title}>填寫業務員資料</Text>
        <Text style={styles.sub}>讓 VoiceRec 知道你賣哪個品牌，才能推薦你家的車款給客戶</Text>
        <View style={{ height: 16 }} />
        <SalespersonForm initial={profile} submitText="完成，開始使用" onSubmit={save} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 24, paddingBottom: 40 },
  step: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginTop: 4 },
  sub: { fontSize: 14, color: colors.subText, marginTop: 6, lineHeight: 21 },
});
