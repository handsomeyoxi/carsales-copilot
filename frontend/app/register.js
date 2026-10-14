// 註冊頁：業務員建立帳號
// 目前是假註冊（資料只存在 App 裡），之後換成 Firebase Auth
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import BackHeader from '../src/components/BackHeader';
import Chip from '../src/components/Chip';
import { useCustomers } from '../src/context/CustomerContext';
import { colors, radius } from '../src/theme';

const branches = ['台北旗艦展間', '新北展間', '桃園展間', '台中展間', '其他'];

// 有標題、可顯示錯誤訊息的輸入框
function Field({ label, error, ...inputProps }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholderTextColor={colors.placeholder}
        {...inputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export default function RegisterScreen() {
  const { register, termsAgreed: agreed, setTermsAgreed: setAgreed } = useCustomers();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [branch, setBranch] = useState(branches[0]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false); // 按過註冊才顯示錯誤，不要一進來就一片紅

  // 檢查每個欄位，有問題就回傳錯誤文字
  const errors = {
    name: !name.trim() ? '請輸入姓名' : '',
    email: !/^\S+@\S+\.\S+$/.test(email) ? '請輸入正確的 Email' : '',
    phone: !/^09\d{2}-?\d{3}-?\d{3}$/.test(phone) ? '請輸入 09 開頭的手機號碼' : '',
    password: password.length < 8 ? '密碼至少 8 個字元' : '',
    confirm: confirm !== password ? '兩次輸入的密碼不一樣' : '',
    agreed: !agreed ? '請先同意服務條款與隱私政策' : '',
  };
  const hasError = Object.values(errors).some(Boolean);
  const show = (key) => (submitted ? errors[key] : '');

  function handleRegister() {
    setSubmitted(true);
    if (hasError) return;
    register({ name: name.trim(), email, phone, branch });
    router.replace('/onboarding'); // 註冊完 → 新手引導 → 客戶總覽
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <BackHeader title="建立帳號" />
        <Text style={styles.subtitle}>填寫基本資料，30 秒完成註冊</Text>

        <Field label="姓名 *" value={name} onChangeText={setName} placeholder="例如：張偉明" error={show('name')} />
        <Field
          label="Email（員工信箱）*"
          value={email}
          onChangeText={setEmail}
          placeholder="user@carbrand.com"
          autoCapitalize="none"
          keyboardType="email-address"
          error={show('email')}
        />
        <Field
          label="手機 *"
          value={phone}
          onChangeText={setPhone}
          placeholder="0912-345-678"
          keyboardType="phone-pad"
          error={show('phone')}
        />

        <Text style={styles.label}>所屬展間</Text>
        <View style={styles.chipWrap}>
          {branches.map((b) => (
            <View key={b} style={{ marginBottom: 8 }}>
              <Chip label={b} selected={branch === b} onPress={() => setBranch(b)} />
            </View>
          ))}
        </View>

        <Field
          label="密碼 *"
          value={password}
          onChangeText={setPassword}
          placeholder="至少 8 個字元"
          secureTextEntry
          error={show('password')}
        />
        <Field
          label="確認密碼 *"
          value={confirm}
          onChangeText={setConfirm}
          placeholder="再輸入一次密碼"
          secureTextEntry
          error={show('confirm')}
        />

        {/* 同意條款 */}
        {/* 點方框 = 勾選；點《》裡的字 = 打開條款全文 */}
        <View style={styles.agreeRow}>
          <Pressable onPress={() => setAgreed(!agreed)} hitSlop={10}>
            <View style={[styles.box, agreed && styles.boxOn]}>
              {agreed && <Text style={styles.check}>✓</Text>}
            </View>
          </Pressable>
          <Text style={styles.agreeText}>
            我已閱讀並同意
            <Text
              style={styles.link}
              onPress={() => router.push({ pathname: '/terms', params: { doc: 'terms', from: 'register' } })}
            >
              《服務條款》
            </Text>
            與
            <Text
              style={styles.link}
              onPress={() => router.push({ pathname: '/terms', params: { doc: 'privacy', from: 'register' } })}
            >
              《隱私權政策》
            </Text>
          </Text>
        </View>
        {show('agreed') ? <Text style={styles.error}>{show('agreed')}</Text> : null}

        <Pressable style={styles.primaryBtn} onPress={handleRegister}>
          <Text style={styles.primaryText}>註冊</Text>
        </Pressable>

        <View style={styles.loginRow}>
          <Text style={styles.loginHint}>已經有帳號了？</Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.loginLink}>回到登入</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 24 },
  subtitle: { fontSize: 14, color: colors.subText, marginTop: -8, marginBottom: 20 },
  label: { fontSize: 14, color: colors.subText, marginBottom: 8 },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  inputError: { borderColor: colors.red },
  error: { fontSize: 12, color: colors.red, marginTop: 4 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  agreeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.placeholder,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  check: { color: '#fff', fontSize: 13, fontWeight: '700' },
  agreeText: { flex: 1, fontSize: 14, lineHeight: 21, color: colors.text },
  link: { color: colors.primary, textDecorationLine: 'underline' },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  loginHint: { fontSize: 14, color: colors.subText },
  loginLink: { fontSize: 14, color: colors.primary, fontWeight: '600', marginLeft: 4 },
});
