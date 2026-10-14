// ① 登入頁
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCustomers } from '../src/context/CustomerContext';
import { colors, radius } from '../src/theme';

export default function LoginScreen() {
  const { onboarded } = useCustomers();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 目前是假登入。之後換成 Firebase Auth
  // 第一次登入 → 先看新手引導；看過了 → 直接進客戶總覽
  function handleLogin() {
    router.replace(onboarded ? '/home' : '/onboarding'); // replace = 不能按返回鍵回到登入頁
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Logo 區 */}
        <View style={styles.logoBox}>
          <Text style={{ fontSize: 34 }}>🎙️</Text>
        </View>
        <Text style={styles.appName}>VoiceRec</Text>
        <Text style={styles.slogan}>汽車業務神器 · 請登入您的帳號</Text>

        {/* 帳號 */}
        <Text style={styles.label}>帳號（員工編號或 Email）</Text>
        <TextInput
          style={styles.input}
          placeholder="user@carbrand.com"
          placeholderTextColor={colors.placeholder}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {/* 密碼 */}
        <Text style={styles.label}>密碼</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor={colors.placeholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry // 輸入時顯示成圓點
        />

        <Pressable style={styles.forgot}>
          <Text style={styles.forgotText}>忘記密碼？</Text>
        </Pressable>

        {/* 登入按鈕 */}
        <Pressable style={styles.loginBtn} onPress={handleLogin}>
          <Text style={styles.loginText}>登入</Text>
        </Pressable>

        {/* 分隔線「或」 */}
        <View style={styles.dividerRow}>
          <View style={styles.line} />
          <Text style={styles.or}>或</Text>
          <View style={styles.line} />
        </View>

        {/* Google 登入 */}
        <Pressable style={styles.googleBtn} onPress={handleLogin}>
          <Text style={styles.googleText}>🔵 使用 Google 帳號登入</Text>
        </Pressable>

        {/* 註冊入口 */}
        <View style={styles.registerRow}>
          <Text style={styles.registerHint}>還沒有帳號？</Text>
          <Pressable onPress={() => router.push('/register')} hitSlop={8}>
            <Text style={styles.registerLink}>立即註冊</Text>
          </Pressable>
        </View>

        {/* 條款連結：Text 裡面再包 Text，就可以讓一部分文字變成可點的連結 */}
        <Text style={styles.terms}>
          登入即表示您同意
          <Text style={styles.link} onPress={() => router.push({ pathname: '/terms', params: { doc: 'terms' } })}>
            《服務條款》
          </Text>
          與
          <Text style={styles.link} onPress={() => router.push({ pathname: '/terms', params: { doc: 'privacy' } })}>
            《隱私權政策》
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  appName: { fontSize: 22, textAlign: 'center', marginTop: 12, color: colors.text },
  slogan: { fontSize: 13, textAlign: 'center', color: colors.subText, marginTop: 4, marginBottom: 28 },
  label: { fontSize: 14, color: colors.subText, marginBottom: 8 },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
    color: colors.text,
  },
  forgot: { alignSelf: 'flex-end', marginTop: -6, marginBottom: 16 },
  forgotText: { color: colors.primary, fontSize: 14 },
  loginBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  loginText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { marginHorizontal: 12, color: colors.subText },
  googleBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  googleText: { fontSize: 15, color: colors.text },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  registerHint: { fontSize: 14, color: colors.subText },
  registerLink: { fontSize: 14, color: colors.primary, fontWeight: '600', marginLeft: 4 },
  terms: { textAlign: 'center', fontSize: 12, color: colors.subText, marginTop: 12, lineHeight: 18 },
  link: { color: colors.primary, textDecorationLine: 'underline' },
});
