// 客戶詳情：基本資料、生命週期、成交機率、待辦、互動紀錄、錄音授權狀態
// 檔名 [id] 代表「網址的這一段是變數」，例如 /customer/c1 → id = 'c1'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import BackHeader from '../../src/components/BackHeader';
import ProbabilityBar from '../../src/components/ProbabilityBar';
import SectionTitle from '../../src/components/SectionTitle';
import StageTracker from '../../src/components/StageTracker';
import Tag from '../../src/components/Tag';
import TodoItem from '../../src/components/TodoItem';
import { useCustomers } from '../../src/context/CustomerContext';
import { analysis, interactions } from '../../src/data/mockData';
import { goRecord } from '../../src/utils/recording';
import { colors, radius } from '../../src/theme';

const tempLabel = { hot: '熱', warm: '溫', cold: '冷' };

function InfoLine({ label, value }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

function ActionButton({ emoji, label, onPress }) {
  return (
    <Pressable style={styles.actionBtn} onPress={onPress}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams();
  const ctx = useCustomers();
  const { getCustomer, todos, toggleTodo, consents } = ctx;
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

  const myTodos = todos.filter((t) => t.customerId === id);
  const myConsent = consents.find((c) => c.customerId === id && c.status === 'active');
  const life = analysis[id]?.lifecycle;
  const history = interactions[id] || [];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <BackHeader
          title={customer.name}
          right={<Tag label={tempLabel[customer.temperature]} tone={customer.temperature} />}
        />

        {/* 三個常用動作 */}
        <View style={styles.actionRow}>
          <ActionButton
            emoji="🎙️"
            label="開始錄音"
            onPress={() => goRecord(ctx, id)}
          />
          <ActionButton
            emoji="🧠"
            label="AI 摘要"
            onPress={() => router.push({ pathname: '/summary', params: { id } })}
          />
          <ActionButton
            emoji="💡"
            label="回訪軍師"
            onPress={() => router.push({ pathname: '/revisit', params: { id } })}
          />
        </View>

        {/* 基本資料 */}
        <View style={styles.card}>
          <InfoLine label="電話" value={customer.phone} />
          <InfoLine label="來源" value={customer.source} />
          <InfoLine label="興趣車款" value={customer.interestedCar} />
          <InfoLine label="上次聯絡" value={customer.lastContactDays ? `${customer.lastContactDays} 天前` : '今天'} />
        </View>

        {/* 生命週期 + 成交機率 */}
        <SectionTitle title="客戶生命週期" />
        <View style={styles.card}>
          <StageTracker stage={customer.stage} />
          {life && <Text style={styles.lifeText}>下一步：{life.nextAction}</Text>}
        </View>

        <SectionTitle title="AI 成交機率" />
        <View style={styles.card}>
          <ProbabilityBar value={customer.closeProbability} height={10} />
        </View>

        {/* 待辦 */}
        <SectionTitle title={`待辦事項（${myTodos.filter((t) => !t.done).length}）`} />
        {myTodos.length === 0 && <Text style={styles.empty}>目前沒有待辦</Text>}
        {myTodos.map((t) => (
          <TodoItem key={t.id} todo={t} onToggle={() => toggleTodo(t.id)} />
        ))}

        {/* 互動紀錄時間軸 */}
        <SectionTitle title="互動紀錄" />
        {history.length === 0 && <Text style={styles.empty}>尚無互動紀錄</Text>}
        {history.map((h, i) => (
          <View key={h.id} style={styles.timelineRow}>
            <View style={styles.timelineLeft}>
              <View style={styles.dot} />
              {i < history.length - 1 && <View style={styles.line} />}
            </View>
            <View style={{ flex: 1, paddingBottom: 14 }}>
              <Text style={styles.timeMeta}>
                {h.date} · {h.type}
              </Text>
              <Text style={styles.timeText}>{h.text}</Text>
            </View>
          </View>
        ))}

        {/* 錄音授權狀態 */}
        <SectionTitle title="錄音授權" />
        <View style={[styles.card, { backgroundColor: myConsent ? colors.greenLight : colors.orangeLight }]}>
          <Text style={{ color: myConsent ? colors.green : colors.orange, fontSize: 13 }}>
            {myConsent
              ? `🔒 已取得同意 · ${myConsent.time} · ${myConsent.method}`
              : '⚠️ 尚未取得錄音同意，錄音前會先請客戶確認'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20 },
  actionRow: { flexDirection: 'row', marginBottom: 12 },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  actionText: { fontSize: 12, color: colors.primary, marginTop: 4 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14 },
  infoLine: { flexDirection: 'row', paddingVertical: 5 },
  infoLabel: { width: 72, fontSize: 13, color: colors.subText },
  infoValue: { flex: 1, fontSize: 14, color: colors.text },
  lifeText: { fontSize: 13, color: colors.text, marginTop: 12 },
  empty: { color: colors.subText, fontSize: 13 },
  timelineRow: { flexDirection: 'row' },
  timelineLeft: { width: 18, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 4 },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 2 },
  timeMeta: { fontSize: 12, color: colors.subText },
  timeText: { fontSize: 14, color: colors.text, marginTop: 2 },
});
