// 編輯個人資料：姓名、職稱、所屬展間、Email、手機
// 按「儲存」才會真的改；按返回就放棄修改
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import BackHeader from '../src/components/BackHeader';
import Chip from '../src/components/Chip';
import { useCustomers } from '../src/context/CustomerContext';
import { colors, radius } from '../src/theme';

const branches = ['台北旗艦展間', '新北展間', '桃園展間', '台中展間', '其他'];

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

export default function ProfileEditScreen() {
  const { profile, updateProfile } = useCustomers();
  // title 的格式是「職稱 · 展間」，拆開來分別編輯
  const [oldJob, oldBranch] = (profile.title || '').split(' · ');

  const [name, setName] = useState(profile.name);
  const [job, setJob] = useState(oldJob || '');
  const [branch, setBranch] = useState(branches.includes(oldBranch) ? oldBranch : '其他');
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);
  const [submitted, setSubmitted] = useState(false);

  const errors = {
    name: !name.trim() ? '請輸入姓名' : '',
    email: !/^\S+@\S+\.\S+$/.test(email) ? '請輸入正確的 Email' : '',
    phone: !/^09\d{2}-?\d{3}-?\d{3}$/.test(phone) ? '請輸入 09 開頭的手機號碼' : '',
  };
  const hasError = Object.values(errors).some(Boolean);
  const show = (k) => (submitted ? errors[k] : '');

  function save() {
    setSubmitted(true);
    if (hasError) return;
    updateProfile({
      name: name.trim(),
      title: `${job.trim() || '業務'} · ${branch}`,
      email,
      phone,
    });
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <BackHeader
          title="編輯個人資料"
          right={
            <Pressable onPress={save} hitSlop={10}>
              <Text style={styles.saveLink}>儲存</Text>
            </Pressable>
          }
        />

        {/* 頭像：用姓名第一個字，打字時即時更新 */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.trim()[0] || '?'}</Text>
        </View>

        <Field label="姓名 *" value={name} onChangeText={setName} error={show('name')} />
        <Field label="職稱" value={job} onChangeText={setJob} placeholder="例如：資深業務" />

        <Text style={styles.label}>所屬展間</Text>
        <View style={styles.chipWrap}>
          {branches.map((b) => (
            <View key={b} style={{ marginBottom: 8 }}>
              <Chip label={b} selected={branch === b} onPress={() => setBranch(b)} />
            </View>
          ))}
        </View>

        <Field
          label="Email *"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          error={show('email')}
        />
        <Field label="手機 *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={show('phone')} />

        <Pressable style={styles.btn} onPress={save}>
          <Text style={styles.btnText}>儲存</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 32 },
  saveLink: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 18,
  },
  avatarText: { fontSize: 28, color: colors.primary },
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
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
