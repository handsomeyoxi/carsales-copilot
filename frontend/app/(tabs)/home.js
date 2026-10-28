// 首頁：品牌新車幻燈片 ＋ 6 個方格按鈕（點進去才看細項）
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import CarSlideshow from '../../src/components/CarSlideshow';
import { useCustomers } from '../../src/context/CustomerContext';
import { analysis, followUps } from '../../src/data/mockData';
import { colors, radius } from '../../src/theme';
import { todayISO, WEEKDAYS } from '../../src/utils/date';

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return '早安';
  if (h < 18) return '午安';
  return '晚安';
}

// 一個方格按鈕：圖示、標題、數字、小字說明
function GridButton({ icon, title, count, hint, tint, onPress }) {
  return (
    <Pressable style={[styles.tile, { backgroundColor: tint }]} onPress={onPress}>
      <View style={styles.tileTop}>
        <Text style={styles.tileIcon}>{icon}</Text>
        {count !== undefined && <Text style={styles.tileCount}>{count}</Text>}
      </View>
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileHint}>{hint}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { profile, customers, todos, tagReviews, activeSession, getCustomer } = useCustomers();
  const today = new Date();
  const todayStr = todayISO();

  const followToday = followUps.filter((f) => f.date <= todayStr).length;
  const todosToday = todos.filter((t) => !t.done && t.date === todayStr).length;
  const pendingTodos = todos.filter((t) => !t.done).length;
  const uncheckedTags = Object.values(analysis)
    .flatMap((a) => [...a.hard, ...a.emotion])
    .filter((t) => t.confidence < 0.75 && !tagReviews[t.id]).length;
  const following = customers.filter((c) => c.status === 'following').length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.date}>
          {today.getMonth() + 1}月{today.getDate()}日 星期{WEEKDAYS[today.getDay()]}
        </Text>
        <View style={styles.headerRow}>
          <Text style={styles.hello}>
            {greeting()}，{profile.name || '業務'} 👋
          </Text>
          <Text style={styles.synced}>☁ 已同步</Text>
        </View>

        {activeSession && (
          <Pressable style={styles.recBanner} onPress={() => router.push('/record/live')}>
            <Text style={styles.recBannerText}>
              🔴 錄音中 · {getCustomer(activeSession.customerId)?.name || '新客戶'}
            </Text>
            <Text style={styles.recBannerText}>返回錄音 ›</Text>
          </Pressable>
        )}

        <CarSlideshow brand={profile.brand} />

        <Text style={styles.sectionTitle}>今天要做的事</Text>
        <View style={styles.grid}>
          <GridButton
            icon="🔔"
            title="回訪提醒"
            count={followUps.length}
            hint={followToday ? `今天 ${followToday} 位` : '今天沒有'}
            tint={colors.primaryLight}
            onPress={() => router.push('/followups')}
          />
          <GridButton
            icon="📅"
            title="待辦行事曆"
            count={pendingTodos}
            hint={todosToday ? `今天 ${todosToday} 件` : '今天沒有'}
            tint={colors.orangeLight}
            onPress={() => router.push('/calendar')}
          />
          <GridButton
            icon="🎙️"
            title="最近錄音"
            count={Object.keys(analysis).length}
            hint={uncheckedTags ? `${uncheckedTags} 個標籤待確認` : '都確認了'}
            tint={colors.pinkLight}
            onPress={() => router.push('/recordings')}
          />
          <GridButton
            icon="👥"
            title="追蹤中客戶"
            count={following}
            hint={`共 ${customers.length} 位客戶`}
            tint={colors.blueLight}
            onPress={() => router.push({ pathname: '/customer-list/[status]', params: { status: 'following' } })}
          />
          <GridButton
            icon="💬"
            title="問 AI 助理"
            hint="今天該先聯絡誰？"
            tint={colors.greenLight}
            onPress={() => router.navigate('/assistant')}
          />
          <GridButton
            icon="➕"
            title="新增客戶"
            hint="手動建檔"
            tint={colors.card}
            onPress={() => router.push('/add-customer')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 32 },
  date: { fontSize: 13, color: colors.subText },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, marginBottom: 14 },
  hello: { fontSize: 21, fontWeight: '700', color: colors.text },
  synced: { fontSize: 12, color: colors.subText },
  recBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1E1B3A',
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 12,
  },
  recBannerText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: {
    width: '48%',
    aspectRatio: 1.15,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tileIcon: { fontSize: 28 },
  tileCount: { fontSize: 26, fontWeight: '700', color: colors.text },
  tileTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  tileHint: { fontSize: 12, color: colors.subText },
});
