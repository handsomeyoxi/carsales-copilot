// 業務員資料表單（註冊後的「填寫業務員資料」和「編輯個人資料」共用）
// 欄位：姓名、手機、代理品牌（清單選，或選「其他」自己輸入）
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BRANDS } from '../data/cars';
import { colors, radius } from '../theme';

const OTHER = '其他';

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

export default function SalespersonForm({ initial = {}, submitText, onSubmit }) {
  const [name, setName] = useState(initial.name || '');
  const [phone, setPhone] = useState(initial.phone || '');
  // 原本的品牌不在清單裡 → 一開始就選「其他」並把品牌放進輸入框
  const startCustom = !!initial.brand && !BRANDS.includes(initial.brand);
  const [picked, setPicked] = useState(startCustom ? OTHER : initial.brand || '');
  const [custom, setCustom] = useState(startCustom ? initial.brand : '');
  const brand = picked === OTHER ? custom.trim() : picked;
  const [submitted, setSubmitted] = useState(false);

  const errors = {
    name: !name.trim() ? '請輸入姓名' : '',
    phone: !/^09\d{2}-?\d{3}-?\d{3}$/.test(phone) ? '請輸入 09 開頭的手機號碼' : '',
    brand: !brand ? (picked === OTHER ? '請輸入品牌名稱' : '請選擇你代理的汽車品牌') : '',
  };
  const hasError = Object.values(errors).some(Boolean);
  const show = (k) => (submitted ? errors[k] : '');

  function submit() {
    setSubmitted(true);
    if (hasError) return;
    onSubmit({ name: name.trim(), phone, brand });
  }

  return (
    <View>
      <Field label="姓名 *" value={name} onChangeText={setName} placeholder="例如：張偉明" error={show('name')} />
      <Field
        label="手機 *"
        value={phone}
        onChangeText={setPhone}
        placeholder="0912-345-678"
        keyboardType="phone-pad"
        error={show('phone')}
      />

      <Text style={styles.label}>代理品牌 *（首頁新車輪播和 AI 推薦車款會依這個品牌）</Text>
      <View style={styles.brandGrid}>
        {[...BRANDS, OTHER].map((b) => (
          <Pressable key={b} style={[styles.brand, picked === b && styles.brandOn]} onPress={() => setPicked(b)}>
            <Text style={[styles.brandText, picked === b && styles.brandTextOn]} numberOfLines={1}>
              {b === OTHER ? '＋ 其他' : b === 'Mercedes-Benz' ? 'Benz 賓士' : b}
            </Text>
          </Pressable>
        ))}
      </View>
      {picked === OTHER && (
        <TextInput
          style={[styles.input, { marginBottom: 8 }]}
          value={custom}
          onChangeText={setCustom}
          placeholder="輸入你代理的品牌，例如 Renault"
          placeholderTextColor={colors.placeholder}
          autoFocus
        />
      )}
      {show('brand') ? <Text style={[styles.error, { marginBottom: 10 }]}>{show('brand')}</Text> : null}

      <Pressable style={styles.btn} onPress={submit}>
        <Text style={styles.btnText}>{submitText}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
  brandGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 6 },
  brand: {
    width: '31.5%',
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  brandOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  brandText: { fontSize: 13, fontWeight: '600', color: colors.text },
  brandTextOn: { color: colors.primary },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
