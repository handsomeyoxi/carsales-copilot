// 客戶分頁：依客戶狀態分類（新客戶／追蹤中／已成交），點進去才是名單
// 上方搜尋可以直接跨分類找人
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import CustomerRow from '../../src/components/CustomerRow';
import ScreenHeader from '../../src/components/ScreenHeader';
import { useCustomers } from '../../src/context/CustomerContext';
import { STATUSES } from '../../src/data/mockData';
import { colors, radius } from '../../src/theme';

const statusTint = { new: colors.primaryLight, following: colors.orangeLight, won: colors.greenLight };
const statusColor = { new: colors.primary, following: colors.orange, won: colors.green };

export default function CustomersScreen() {
  const { customers } = useCustomers();
  const [keyword, setKeyword] = useState('');

  const results = keyword
    ? customers.filter(
        (c) =>
          c.name.includes(keyword) ||
          (c.note || '').includes(keyword) ||
          (c.interestedCar || '').toLowerCase().includes(keyword.toLowerCase())
      )
    : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader
          title="我的客戶"
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

        {keyword ? (
          <>
            <Text style={styles.count}>找到 {results.length} 位</Text>
            {results.map((c) => (
              <CustomerRow key={c.id} customer={c} />
            ))}
          </>
        ) : (
          <>
            {STATUSES.map((s) => {
              const list = customers.filter((c) => c.status === s.key);
              const hot = list.filter((c) => c.temperature === 'hot').length;
              return (
                <Pressable
                  key={s.key}
                  style={[styles.statusCard, { backgroundColor: statusTint[s.key] }]}
                  onPress={() => router.push({ pathname: '/customer-list/[status]', params: { status: s.key } })}
                >
                  <Text style={styles.statusIcon}>{s.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statusLabel, { color: statusColor[s.key] }]}>{s.label}</Text>
                    <Text style={styles.statusDesc}>{s.desc}</Text>
                    {hot > 0 && <Text style={styles.statusHot}>其中 {hot} 位是熱客戶</Text>}
                  </View>
                  <Text style={[styles.statusCount, { color: statusColor[s.key] }]}>{list.length}</Text>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              );
            })}

            <Pressable
              style={styles.allBtn}
              onPress={() => router.push({ pathname: '/customer-list/[status]', params: { status: 'all' } })}
            >
              <Text style={styles.allText}>查看全部 {customers.length} 位客戶 ›</Text>
            </Pressable>
          </>
        )}
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
    marginBottom: 14,
  },
  count: { fontSize: 12, color: colors.subText },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: 12,
  },
  statusIcon: { fontSize: 30, marginRight: 14 },
  statusLabel: { fontSize: 18, fontWeight: '700' },
  statusDesc: { fontSize: 12, color: colors.subText, marginTop: 2 },
  statusHot: { fontSize: 12, color: colors.red, marginTop: 4 },
  statusCount: { fontSize: 30, fontWeight: '700', marginLeft: 8 },
  chevron: { fontSize: 22, color: colors.placeholder, marginLeft: 6 },
  allBtn: { paddingVertical: 12, alignItems: 'center' },
  allText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
});
