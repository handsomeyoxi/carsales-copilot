// ⑥ 新增客戶（兩步驟：基本資料 → 喜好輪廓）
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Chip from '../src/components/Chip';
import { useCustomers } from '../src/context/CustomerContext';
import { colors, radius } from '../src/theme';

const sources = ['展間來訪', '電話詢問', 'LINE'];
const temps = [
  { key: 'hot', label: '熱', color: colors.red, bg: colors.redLight },
  { key: 'warm', label: '溫', color: colors.orange, bg: colors.orangeLight },
  { key: 'cold', label: '冷', color: colors.blue, bg: colors.blueLight },
];

// 上方的進度條 ①──②
function Stepper({ step }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={styles.stepRow}>
        <View style={[styles.stepDot, styles.stepDotActive]}>
          <Text style={styles.stepDotTextActive}>1</Text>
        </View>
        <View style={[styles.stepLine, step === 2 && { backgroundColor: colors.primary }]} />
        <View style={[styles.stepDot, step === 2 && styles.stepDotActive]}>
          <Text style={step === 2 ? styles.stepDotTextActive : styles.stepDotText}>2</Text>
        </View>
      </View>
      <View style={styles.stepLabelRow}>
        <Text style={[styles.stepLabel, { color: colors.primary }]}>基本資料</Text>
        <Text style={[styles.stepLabel, step === 2 && { color: colors.primary }]}>喜好輪廓</Text>
      </View>
    </View>
  );
}

// 有標題的輸入框
function Field({ label, ...inputProps }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={colors.placeholder} {...inputProps} />
    </View>
  );
}

export default function AddCustomerScreen() {
  const { addCustomer } = useCustomers();
  const [step, setStep] = useState(1);

  // Step 1：基本資料（姓名先放 AI 預填的值）
  const [name, setName] = useState('陳志豪');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('展間來訪');
  const [temperature, setTemperature] = useState('hot');

  // Step 2：喜好輪廓
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [budget, setBudget] = useState('');

  function handleCreate() {
    const interestedCar = [brand, model].filter(Boolean).join(' ');
    const note = [interestedCar, budget && `預算 ${budget}`].filter(Boolean).join(' · ') || source;
    const created = addCustomer({ name, phone, source, temperature, budget, interestedCar, note });
    router.replace(`/customer/${created.id}`); // 建立成功 → 跳到這位客戶的詳情頁
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* 標題列 */}
        <View style={styles.header}>
          <Pressable onPress={() => (step === 1 ? router.back() : setStep(1))} hitSlop={10}>
            <Text style={styles.back}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>新增客戶</Text>
          <Text style={styles.pageNum}>{step} / 2</Text>
        </View>

        <Stepper step={step} />

        {step === 1 ? (
          <>
            <View style={styles.aiBanner}>
              <Text style={styles.aiBannerText}>✦ 語音自動預填完成，請確認</Text>
            </View>

            <Field label="姓名 *" value={name} onChangeText={setName} placeholder="輸入客戶姓名" />
            <Field label="電話" value={phone} onChangeText={setPhone} placeholder="輸入手機號碼" keyboardType="phone-pad" />

            <Text style={styles.label}>來源管道</Text>
            <View style={styles.chipRow}>
              {sources.map((s) => (
                <Chip key={s} label={s} selected={source === s} onPress={() => setSource(s)} />
              ))}
            </View>

            <Text style={styles.label}>溫度標籤</Text>
            <View style={styles.chipRow}>
              {temps.map((t) => (
                <Chip
                  key={t.key}
                  label={t.label}
                  selected={temperature === t.key}
                  onPress={() => setTemperature(t.key)}
                  selectedColor={t.color}
                  selectedBg={t.bg}
                />
              ))}
            </View>

            <Pressable
              style={[styles.primaryBtn, !name && { opacity: 0.4 }]}
              disabled={!name} // 姓名必填
              onPress={() => setStep(2)}
            >
              <Text style={styles.primaryText}>下一步：喜好輪廓 →</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Field label="品牌" value={brand} onChangeText={setBrand} placeholder="例如 BMW、Benz" />
            <Field label="車型" value={model} onChangeText={setModel} placeholder="例如 X5、GLC" />
            <Field label="預算" value={budget} onChangeText={setBudget} placeholder="例如 150–170 萬" />

            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <Pressable style={[styles.secondaryBtn, { marginRight: 10 }]} onPress={() => setStep(1)}>
                <Text style={styles.secondaryText}>← 上一步</Text>
              </Pressable>
              <Pressable style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]} onPress={handleCreate}>
                <Text style={styles.primaryText}>建立客戶</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  back: { fontSize: 20, color: colors.text, marginRight: 10 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: colors.text },
  pageNum: { fontSize: 13, color: colors.subText },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: colors.primary },
  stepDotText: { color: colors.subText, fontSize: 12 },
  stepDotTextActive: { color: '#fff', fontSize: 12 },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: 4 },
  stepLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  stepLabel: { fontSize: 12, color: colors.subText },
  aiBanner: { backgroundColor: colors.primaryLight, borderRadius: radius.sm, padding: 10, marginBottom: 16 },
  aiBannerText: { color: colors.primary, fontSize: 13 },
  label: { fontSize: 13, color: colors.subText, marginBottom: 6 },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  chipRow: { flexDirection: 'row', marginBottom: 14 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  secondaryText: { color: colors.text, fontSize: 15 },
});
