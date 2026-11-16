// ① 登入頁（Firebase 帳號密碼登入）
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCustomers } from '../src/context/CustomerContext';
import { authErrorMessage } from '../src/firebase';
import { colors, radius } from '../src/theme';

export default function LoginScreen() {
  const { login, authUser, authReady } = useCustomers();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false); // 登入中，按鈕先鎖住
  const [notice, setNotice] = useState(''); // 還沒做的功能（忘記密碼、Google 登入）的提示

  // 上次登入過、還沒登出 → 打開 App 直接進首頁
  // 只在「剛打開 App、檢查完登入狀態」那一次判斷；之後的登入由 handleLogin、註冊頁自己決定要去哪
  useEffect(() => {
    if (authReady && authUser) router.replace('/home');
  }, [authReady]);

  // 沒填過業務員資料（沒有品牌）→ 先填資料；第一次登入 → 新手引導；看過了 → 首頁
  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('請輸入帳號和密碼');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { needsProfile } = await login(email, password);
      if (needsProfile) router.replace('/setup-profile');
        else router.replace('/home'); // 新手引導只在註冊完看一次；replace = 不能按返回鍵回到登入頁
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
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

        <Pressable style={styles.forgot} onPress={() => setNotice('忘記密碼功能還在製作中，請聯絡管理員重設密碼')}>
          <Text style={styles.forgotText}>忘記密碼？</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* 登入按鈕 */}
        <Pressable style={[styles.loginBtn, busy && { opacity: 0.6 }]} onPress={handleLogin} disabled={busy}>
          <Text style={styles.loginText}>{busy ? '登入中…' : '登入'}</Text>
        </Pressable>

        {/* 分隔線「或」 */}
        <View style={styles.dividerRow}>
          <View style={styles.line} />
          <Text style={styles.or}>或</Text>
          <View style={styles.line} />
        </View>

        {/* Google 登入 */}
        <Pressable style={styles.googleBtn} onPress={() => setNotice('Google 登入還在製作中，請先用 Email 登入')}>
          <Text style={styles.googleText}>🔵 使用 Google 帳號登入</Text>
        </Pressable>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

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
  error: { color: colors.red, fontSize: 13, marginBottom: 10 },
  notice: { color: colors.subText, fontSize: 12, textAlign: 'center', marginTop: 8 },
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
