// 首頁：只放「今天要做的事」——今日數字、回訪提醒、待辦、最近錄音
// 每一區最多顯示 3 筆，多的收進「全部」，客戶再多首頁也不會變長
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import SectionTitle from '../../src/components/SectionTitle';
import Tag from '../../src/components/Tag';
import TodoItem from '../../src/components/TodoItem';
import { probabilityColor } from '../../src/components/ProbabilityBar';
import { useCustomers } from '../../src/context/CustomerContext';
import { analysis, followUps } from '../../src/data/mockData';
import { colors, radius } from '../../src/theme';

const LIMIT = 3;
const priorityOrder = { high: 0, medium: 1, low: 2 };
const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return '早安';
  if (h < 18) return '午安';
  return '晚安';
}

function StatCard({ number, label, color, onPress }) {
  return (
    <Pressable style={styles.statCard} onPress={onPress}>
      <Text style={[styles.statNumber, { color }]}>{number}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { profile, customers, todos, toggleTodo, getCustomer, tagReviews, activeSession } = useCustomers();
  const today = new Date();

  // 待辦：未完成，依優先度排
  const pending = todos
    .filter((t) => !t.done)
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  const highChance = customers.filter((c) => c.closeProbability >= 70).length;

  // 最近錄音：有 AI 分析的客戶，算出還有幾個低信心標籤沒確認
  const recent = Object.entries(analysis).map(([id, a]) => {
    const unchecked = [...a.hard, ...a.emotion].filter((t) => t.confidence < 0.75 && !tagReviews[t.id]).length;
    return { id, ...a, unchecked };
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.date}>
          {today.getMonth() + 1}月{today.getDate()}日 星期{weekdays[today.getDay()]}
        </Text>
        <View style={styles.headerRow}>
          <Text style={styles.hello}>
            {greeting()}，{profile.name} 👋
          </Text>
          <Text style={styles.synced}>☁ 已同步</Text>
        </View>

        {/* 錄音縮小時，首頁顯示「返回錄音」橫條 */}
        {activeSession && (
          <Pressable style={styles.recBanner} onPress={() => router.push('/record/live')}>
            <Text style={styles.recBannerText}>
              🔴 錄音中 · {getCustomer(activeSession.customerId)?.name || '新客戶'}
            </Text>
            <Text style={styles.recBannerText}>返回錄音 ›</Text>
          </Pressable>
        )}

        <View style={styles.statRow}>
          <StatCard
            number={followUps.length}
            label="待回訪"
            color={colors.primary}
            onPress={() => router.push({ pathname: '/todos', params: { tab: 'followups', from: 'home' } })}
          />
          <StatCard number={pending.length} label="待辦" color={colors.orange} onPress={() => router.push({ pathname: '/todos', params: { tab: 'todos', from: 'home' } })} />
          <StatCard number={highChance} label="高成交機率" color={colors.green} onPress={() => router.push({ pathname: '/customers', params: { from: 'home' } })} />
        </View>

        {/* 回訪提醒 */}
        <SectionTitle
          title="🔔 回訪提醒"
          actionText={`全部 (${followUps.length}) ›`}
          onAction={() => router.push({ pathname: '/todos', params: { tab: 'followups', from: 'home' } })}
        />
        {followUps.slice(0, LIMIT).map((f) => {
          const c = getCustomer(f.customerId);
          if (!c) return null;
          return (
            <Pressable
              key={f.id}
              style={styles.followCard}
              onPress={() => router.push({ pathname: '/revisit', params: { id: c.id } })}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.followTop}>
                  <Text style={styles.followName}>
                    {f.when} · {c.name}
                  </Text>
                  <Text style={[styles.prob, { color: probabilityColor(c.closeProbability) }]}>
                    {c.closeProbability}%
                  </Text>
                </View>
                <Text style={styles.followReason}>{f.reason}</Text>
              </View>
              <Text style={styles.link}>話術 ›</Text>
            </Pressable>
          );
        })}

        {/* 今日待辦 */}
        <SectionTitle title="✅ 待辦" actionText={`全部 (${pending.length}) ›`} onAction={() => router.push({ pathname: '/todos', params: { tab: 'todos', from: 'home' } })} />
        {pending.length === 0 && <Text style={styles.empty}>今天的待辦都完成了 🎉</Text>}
        {pending.slice(0, LIMIT).map((t) => (
          <TodoItem key={t.id} todo={t} customerName={getCustomer(t.customerId)?.name} onToggle={() => toggleTodo(t.id)} />
        ))}

        {/* 最近錄音 */}
        <SectionTitle title="🕒 最近錄音" />
        {recent.slice(0, LIMIT).map((r) => (
          <Pressable
            key={r.id}
            style={styles.recentRow}
            onPress={() => router.push({ pathname: '/summary', params: { id: r.id } })}
          >
            <Text style={{ fontSize: 18, marginRight: 10 }}>🎙️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.recentName}>{getCustomer(r.id)?.name}</Text>
              <Text style={styles.recentMeta}>
                {r.recordedAt} · {r.duration}
              </Text>
            </View>
            {r.unchecked > 0 ? <Tag label={`${r.unchecked} 個待確認`} tone="warm" /> : <Tag label="已確認" tone="green" />}
          </Pressable>
        ))}
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
  statRow: { flexDirection: 'row' },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  statNumber: { fontSize: 22, fontWeight: '600' },
  statLabel: { fontSize: 12, color: colors.subText, marginTop: 2 },
  followCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
  },
  followTop: { flexDirection: 'row', alignItems: 'center' },
  followName: { fontSize: 14, fontWeight: '600', color: colors.primary },
  prob: { fontSize: 12, fontWeight: '600', marginLeft: 8 },
  followReason: { fontSize: 12, color: colors.text, marginTop: 3 },
  link: { fontSize: 13, color: colors.primary, marginLeft: 8 },
  empty: { color: colors.subText, fontSize: 13 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.pinkLight,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
  },
  recentName: { fontSize: 14, fontWeight: '600', color: colors.text },
  recentMeta: { fontSize: 12, color: colors.subText, marginTop: 2 },
});
