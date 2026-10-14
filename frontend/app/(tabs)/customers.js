// 客戶分頁：只放客戶列表（搜尋、熱溫冷篩選、排序）
// 回訪提醒和待辦已經搬到「首頁」和「待辦」分頁
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Chip from '../../src/components/Chip';
import ProbabilityBar from '../../src/components/ProbabilityBar';
import ScreenHeader from '../../src/components/ScreenHeader';
import Tag from '../../src/components/Tag';
import { useCustomers } from '../../src/context/CustomerContext';
import { colors, radius } from '../../src/theme';

const tempLabel = { hot: '熱', warm: '溫', cold: '冷' };
const avatarBg = { hot: colors.redLight, warm: colors.orangeLight, cold: colors.blueLight };
const filters = [
  { key: 'all', label: '全部' },
  { key: 'hot', label: '熱' },
  { key: 'warm', label: '溫' },
  { key: 'cold', label: '冷' },
];
const sorts = {
  probability: { label: '成交機率 ▾', fn: (a, b) => b.closeProbability - a.closeProbability },
  recent: { label: '最近聯絡 ▾', fn: (a, b) => a.lastContactDays - b.lastContactDays },
};

function CustomerRow({ customer }) {
  return (
    <Pressable style={styles.row} onPress={() => router.push(`/customer/${customer.id}`)}>
      <View style={[styles.avatar, { backgroundColor: avatarBg[customer.temperature] }]}>
        <Text style={styles.avatarText}>{customer.name[0]}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{customer.name}</Text>
          <Text style={styles.stage}>{customer.stage}</Text>
        </View>
        <Text style={styles.note}>{customer.note}</Text>
        <View style={{ marginTop: 6 }}>
          <ProbabilityBar value={customer.closeProbability} />
        </View>
      </View>
      <Tag label={tempLabel[customer.temperature]} tone={customer.temperature} style={{ marginLeft: 10 }} />
    </Pressable>
  );
}

export default function CustomersScreen() {
  const { customers } = useCustomers();
  const params = useLocalSearchParams();
  const [filter, setFilter] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [sortKey, setSortKey] = useState('probability');

  const list = customers
    .filter((c) => filter === 'all' || c.temperature === filter)
    .filter(
      (c) =>
        !keyword ||
        c.name.includes(keyword) ||
        (c.note || '').includes(keyword) ||
        (c.interestedCar || '').toLowerCase().includes(keyword.toLowerCase())
    )
    .sort(sorts[sortKey].fn);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader
          title="我的客戶"
          onBack={
            params.from === 'home'
              ? () => {
                  router.setParams({ from: undefined });
                  router.navigate('/home');
                }
              : undefined
          }
          right={
            <Pressable onPress={() => router.push('/add-customer')} hitSlop={10}>
              <Text style={styles.plus}>＋</Text>
            </Pressable>
          }
        />

        <TextInput
          style={styles.search}
          placeholder="🔍 搜尋姓名、車款、備註"
          placeholderTextColor={colors.placeholder}
          value={keyword}
          onChangeText={setKeyword}
        />
        <View style={styles.filterRow}>
          {filters.map((f) => (
            <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
          <Chip
            label={sorts[sortKey].label}
            onPress={() => setSortKey(sortKey === 'probability' ? 'recent' : 'probability')}
          />
        </View>

        <Text style={styles.count}>共 {list.length} 位</Text>
        {list.map((c) => (
          <CustomerRow key={c.id} customer={c} />
        ))}
        {list.length === 0 && <Text style={styles.empty}>找不到符合的客戶</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 32 },
  plus: { fontSize: 24, color: colors.text },
  search: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.text,
  },
  filterRow: { flexDirection: 'row', marginTop: 10 },
  count: { fontSize: 12, color: colors.subText, marginTop: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginTop: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 16, color: colors.text },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  stage: { fontSize: 11, color: colors.primary, marginLeft: 8 },
  note: { fontSize: 12, color: colors.subText, marginTop: 2 },
  empty: { color: colors.subText, textAlign: 'center', marginTop: 16 },
});
