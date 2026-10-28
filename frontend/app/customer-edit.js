// 編輯客戶：/customer-edit?id=c1&part=basic|needs
// basic → 姓名、電話、來源、備註
// needs → 來看的車、預算、車型、用途、在意的配備（改完 AI 推薦車款會跟著更新）
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import BackHeader from '../src/components/BackHeader';
import Chip from '../src/components/Chip';
import { useCustomers } from '../src/context/CustomerContext';
import { colors, radius } from '../src/theme';

const SOURCES = ['展間來訪', '電話詢問', 'LINE', '官網預約', '朋友介紹', '其他'];
const TYPES = ['SUV', '轎車', '電動車', 'MPV'];
const FEATURE_PRESETS = ['ADAS 主動安全', '後座空間大', '省油', '七人座', '好停車', '科技配備', '操控性', '保值'];

// 從「約 400 萬」「150–170 萬」抓出預算上限（取最大的數字），給 AI 推薦用
function parseBudgetMax(text) {
  const nums = (text.match(/\d+(\.\d+)?/g) || []).map(Number);
  return nums.length ? Math.max(...nums) : undefined;
}

function Field({ label, ...props }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={colors.placeholder} {...props} />
    </View>
  );
}

// 可以刪除的小標籤
function RemovableChip({ label, onRemove }) {
  return (
    <View style={styles.rChip}>
      <Text style={styles.rChipText}>{label}</Text>
      <Pressable onPress={onRemove} hitSlop={8}>
        <Text style={styles.rChipX}>✕</Text>
      </Pressable>
    </View>
  );
}

export default function CustomerEditScreen() {
  const { id, part = 'basic' } = useLocalSearchParams();
  const { getCustomer, updateCustomer } = useCustomers();
  const customer = getCustomer(id) || {};
  const needs0 = customer.needs || {};

  // 基本資料
  const [name, setName] = useState(customer.name || '');
  const [phone, setPhone] = useState(customer.phone || '');
  const [source, setSource] = useState(customer.source || SOURCES[0]);
  const [note, setNote] = useState(customer.note || '');

  // 客戶需求
  const [cars, setCars] = useState(needs0.lookingAt || []);
  const [carInput, setCarInput] = useState('');
  const [budget, setBudget] = useState(needs0.budget || '');
  const [type, setType] = useState(needs0.type || '');
  const [typeInput, setTypeInput] = useState('');
  const [usage, setUsage] = useState(needs0.usage || '');
  const [features, setFeatures] = useState(needs0.features || []);
  const [featureInput, setFeatureInput] = useState('');

  const isBasic = part === 'basic';
  const canSave = isBasic ? name.trim().length > 0 : true;

  function addCar() {
    const v = carInput.trim();
    if (v && !cars.includes(v)) setCars([...cars, v]);
    setCarInput('');
  }
  function addType() {
    const v = typeInput.trim();
    if (v) setType(v); // 車型只能選一個，自己輸入的會直接被選起來
    setTypeInput('');
  }
  function toggleFeature(f) {
    setFeatures(features.includes(f) ? features.filter((x) => x !== f) : [...features, f]);
  }
  function addFeature() {
    const v = featureInput.trim();
    if (v && !features.includes(v)) setFeatures([...features, v]);
    setFeatureInput('');
  }

  function save() {
    if (!canSave) return;
    if (isBasic) {
      updateCustomer(id, { name: name.trim(), phone, source, note });
    } else {
      updateCustomer(id, {
        interestedCar: cars[0] || '',
        needs: { ...needs0, lookingAt: cars, budget, budgetMax: parseBudgetMax(budget), type, usage, features },
      });
    }
    router.back();
  }

  const customFeatures = features.filter((f) => !FEATURE_PRESETS.includes(f));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <BackHeader
          title={`編輯${isBasic ? '基本資料' : '客戶需求'}`}
          right={
            <Pressable onPress={save} hitSlop={10} disabled={!canSave}>
              <Text style={[styles.saveTop, !canSave && { opacity: 0.4 }]}>儲存</Text>
            </Pressable>
          }
        />

        {isBasic ? (
          <>
            <Field label="姓名 *" value={name} onChangeText={setName} placeholder="客戶姓名" />
            <Field label="電話" value={phone} onChangeText={setPhone} placeholder="0912-345-678" keyboardType="phone-pad" />
            <Text style={styles.label}>來源管道</Text>
            <View style={styles.wrap}>
              {SOURCES.map((s) => (
                <View key={s} style={styles.gap}>
                  <Chip label={s} selected={source === s} onPress={() => setSource(s)} />
                </View>
              ))}
            </View>
            <Field label="備註" value={note} onChangeText={setNote} placeholder="例如：太太預產期在月底" multiline />
          </>
        ) : (
          <>
            <Text style={styles.label}>來看的車（可以多台，包含他牌）</Text>
            <View style={styles.wrap}>
              {cars.map((c) => (
                <RemovableChip key={c} label={c} onRemove={() => setCars(cars.filter((x) => x !== c))} />
              ))}
            </View>
            <View style={styles.addRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={carInput}
                onChangeText={setCarInput}
                onSubmitEditing={addCar}
                placeholder="例如 BMW X3、Volvo XC60"
                placeholderTextColor={colors.placeholder}
              />
              <Pressable style={styles.addBtn} onPress={addCar}>
                <Text style={styles.addBtnText}>新增</Text>
              </Pressable>
            </View>

            <Field label="預算" value={budget} onChangeText={setBudget} placeholder="例如 約 400 萬、150–170 萬" />

            <Text style={styles.label}>想要的車型</Text>
            <View style={styles.wrap}>
              {[...TYPES, ...(type && !TYPES.includes(type) ? [type] : [])].map((t) => (
                <View key={t} style={styles.gap}>
                  <Chip label={t} selected={type === t} onPress={() => setType(type === t ? '' : t)} />
                </View>
              ))}
            </View>
            <View style={styles.addRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={typeInput}
                onChangeText={setTypeInput}
                onSubmitEditing={addType}
                placeholder="其他車型，例如 跑車、旅行車、皮卡"
                placeholderTextColor={colors.placeholder}
              />
              <Pressable style={styles.addBtn} onPress={addType}>
                <Text style={styles.addBtnText}>新增</Text>
              </Pressable>
            </View>

            <Field label="用途" value={usage} onChangeText={setUsage} placeholder="例如 家庭用、通勤、載長輩" />

            <Text style={styles.label}>在意的配備（點選）</Text>
            <View style={styles.wrap}>
              {[...FEATURE_PRESETS, ...customFeatures].map((f) => (
                <View key={f} style={styles.gap}>
                  <Chip label={f} selected={features.includes(f)} onPress={() => toggleFeature(f)} />
                </View>
              ))}
            </View>
            <View style={styles.addRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={featureInput}
                onChangeText={setFeatureInput}
                onSubmitEditing={addFeature}
                placeholder="其他需求，例如 白色、天窗"
                placeholderTextColor={colors.placeholder}
              />
              <Pressable style={styles.addBtn} onPress={addFeature}>
                <Text style={styles.addBtnText}>新增</Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>💡 儲存後，「推薦車款」和「成交機率」會依新的需求重新計算</Text>
          </>
        )}

        <Pressable style={[styles.btn, !canSave && { opacity: 0.4 }]} onPress={save} disabled={!canSave}>
          <Text style={styles.btnText}>儲存</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 40 },
  saveTop: { fontSize: 15, fontWeight: '600', color: colors.primary },
  label: { fontSize: 14, color: colors.subText, marginBottom: 8 },
  input: { backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  gap: { marginBottom: 8 },
  rChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 8,
  },
  rChipText: { fontSize: 13, color: colors.primary, fontWeight: '600', marginRight: 6 },
  rChipX: { fontSize: 12, color: colors.primary },
  addRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  addBtn: { marginLeft: 8, backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 12 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 12, color: colors.subText, marginBottom: 8 },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
