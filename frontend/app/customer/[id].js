// 客戶詳情：上方是客戶名片，下方分成四個格子
// ① 基本資料 ② 客戶需求 ③ 成交機率 ④ 後續處理 —— 點格子才進去看完整內容（customer-section.js）
// 檔名 [id] 代表「網址的這一段是變數」，例如 /customer/c1 → id = 'c1'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import BackHeader from '../../src/components/BackHeader';
import CustomerTags from '../../src/components/CustomerTags';
import { useCustomers } from '../../src/context/CustomerContext';
import { followUps } from '../../src/data/mockData';
import { colors, radius } from '../../src/theme';
import { dayLabel } from '../../src/utils/date';
import { dealAnalysis, recommendCars } from '../../src/utils/insights';
import { goRecord } from '../../src/utils/recording';

// 每個格子的底色
const tileColors = {
  basic: colors.primaryLight,
  needs: colors.blueLight,
  deal: colors.greenLight,
  next: colors.orangeLight,
};

function Tile({ no, icon, title, color, onPress, children }) {
  return (
    <Pressable style={[styles.tile, { backgroundColor: color }]} onPress={onPress}>
      <View style={styles.tileHead}>
        <Text style={styles.tileIcon}>{icon}</Text>
        <Text style={styles.tileNo}>{no}</Text>
      </View>
      <Text style={styles.tileTitle}>{title}</Text>
      <View style={{ flex: 1 }}>{children}</View>
      <Text style={styles.tileMore}>查看 ›</Text>
    </Pressable>
  );
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams();
  const ctx = useCustomers();
  const { getCustomer, todos, profile } = ctx;
  const customer = getCustomer(id);

  if (!customer) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <BackHeader title="找不到客戶" />
        </View>
      </SafeAreaView>
    );
  }

  const brand = profile.brand || 'BMW';
  const needs = customer.needs || {};
  const deal = dealAnalysis(customer);
  const best = recommendCars(customer, brand)[0];
  const openTodos = todos.filter((t) => t.customerId === id && !t.done).length;
  const nextFollow = followUps.find((f) => f.customerId === id);
  const open = (s) => router.push({ pathname: '/customer-section', params: { id, s } });
  const probColor = deal.percentage >= 70 ? colors.green : deal.percentage >= 40 ? colors.orange : colors.red;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <BackHeader title="客戶詳情" />

        {/* 客戶名片 */}
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{customer.name[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{customer.name}</Text>
            <View style={{ marginTop: 4 }}>
              <CustomerTags customer={customer} />
            </View>
          </View>
        </View>

        {/* 四個格子 */}
        <View style={styles.grid}>
          <Tile no="①" icon="👤" title="基本資料" color={tileColors.basic} onPress={() => open('basic')}>
            <Text style={styles.line}>{customer.phone || '—'}</Text>
            <Text style={styles.line}>{customer.source}</Text>
            <Text style={styles.line}>
              上次聯絡 {customer.lastContactDays ? `${customer.lastContactDays} 天前` : '今天'}
            </Text>
          </Tile>

          <Tile no="②" icon="🚗" title="客戶需求" color={tileColors.needs} onPress={() => open('needs')}>
            <Text style={styles.line} numberOfLines={1}>
              {(needs.lookingAt || [])[0] || '尚未提及'}
            </Text>
            <Text style={styles.line}>預算 {needs.budget || '—'}</Text>
            {best && (
              <Text style={[styles.line, { color: colors.primary, fontWeight: '600' }]} numberOfLines={1}>
                推薦 {best.name}
              </Text>
            )}
          </Tile>

          <Tile no="③" icon="📈" title="成交機率" color={tileColors.deal} onPress={() => open('deal')}>
            <Text style={[styles.bigNum, { color: probColor }]}>{deal.percentage}%</Text>
            <Text style={styles.line}>成交機率{deal.level}</Text>
          </Tile>

          <Tile no="④" icon="🗓️" title="後續處理" color={tileColors.next} onPress={() => open('next')}>
            <Text style={styles.line}>{nextFollow ? `${dayLabel(nextFollow.date)}回訪` : '尚未排回訪'}</Text>
            <Text style={styles.line}>待辦 {openTodos} 件</Text>
          </Tile>
        </View>

        {/* 常用動作 */}
        <View style={styles.actionRow}>
          <Pressable style={[styles.actionBtn, styles.actionMain]} onPress={() => goRecord(ctx, id)}>
            <Text style={[styles.actionText, { color: '#fff' }]}>🎙️ 開始錄音</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => router.push({ pathname: '/summary', params: { id } })}>
            <Text style={styles.actionText}>🧠 AI 摘要</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginBottom: 16 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { fontSize: 22, fontWeight: '700', color: colors.primary },
  name: { fontSize: 22, fontWeight: '700', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: { width: '48%', aspectRatio: 0.85, borderRadius: radius.lg, padding: 14, marginBottom: 14 },
  tileHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tileIcon: { fontSize: 26 },
  tileNo: { fontSize: 15, color: colors.subText, fontWeight: '700' },
  tileTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 6 },
  line: { fontSize: 12, color: colors.subText, lineHeight: 18 },
  bigNum: { fontSize: 34, fontWeight: '800' },
  tileMore: { fontSize: 12, color: colors.primary, fontWeight: '600', textAlign: 'right' },
  actionRow: { flexDirection: 'row', marginTop: 4 },
  actionBtn: { flex: 1, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  actionMain: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionText: { fontSize: 15, color: colors.primary, fontWeight: '600' },
});
