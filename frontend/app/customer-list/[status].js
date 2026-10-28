// 某個狀態的客戶名單（新客戶／追蹤中／已成交／全部），可再用熱溫冷篩選、排序
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import BackHeader from '../../src/components/BackHeader';
import Chip from '../../src/components/Chip';
import CustomerRow from '../../src/components/CustomerRow';
import { useCustomers } from '../../src/context/CustomerContext';
import { STATUSES } from '../../src/data/mockData';
import { colors } from '../../src/theme';

const temps = [
  { key: 'all', label: '全部' },
  { key: 'hot', label: '熱' },
  { key: 'warm', label: '溫' },
  { key: 'cold', label: '冷' },
];
const sorts = {
  probability: { label: '成交機率 ▾', fn: (a, b) => b.closeProbability - a.closeProbability },
  recent: { label: '最近聯絡 ▾', fn: (a, b) => a.lastContactDays - b.lastContactDays },
};

export default function CustomerListScreen() {
  const { status = 'all' } = useLocalSearchParams();
  const { customers } = useCustomers();
  const [temp, setTemp] = useState('all');
  const [sortKey, setSortKey] = useState('probability');
  const info = STATUSES.find((s) => s.key === status);

  const list = customers
    .filter((c) => status === 'all' || c.status === status)
    .filter((c) => temp === 'all' || c.temperature === temp)
    .sort(sorts[sortKey].fn);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <BackHeader title={info ? `${info.icon} ${info.label}` : '全部客戶'} />
        {info && <Text style={styles.desc}>{info.desc}</Text>}

        <View style={styles.filterRow}>
          {temps.map((t) => (
            <Chip key={t.key} label={t.label} selected={temp === t.key} onPress={() => setTemp(t.key)} />
          ))}
          <Chip label={sorts[sortKey].label} onPress={() => setSortKey(sortKey === 'probability' ? 'recent' : 'probability')} />
        </View>

        <Text style={styles.count}>共 {list.length} 位</Text>
        {list.map((c) => (
          <CustomerRow key={c.id} customer={c} />
        ))}
        {list.length === 0 && <Text style={styles.empty}>這個分類目前沒有客戶</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 32 },
  desc: { fontSize: 13, color: colors.subText, marginTop: -8, marginBottom: 12 },
  filterRow: { flexDirection: 'row' },
  count: { fontSize: 12, color: colors.subText, marginTop: 12 },
  empty: { color: colors.subText, textAlign: 'center', marginTop: 20 },
});
