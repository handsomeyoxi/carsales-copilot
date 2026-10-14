// 回訪軍師（一般頁面，帶客戶 id 進來：/revisit?id=c1）：記憶提示、自動回訪提醒、三段式話術、回訪前待辦、避免重提
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import BackHeader from '../src/components/BackHeader';
import SectionTitle from '../src/components/SectionTitle';
import TodoItem from '../src/components/TodoItem';
import { useCustomers } from '../src/context/CustomerContext';
import { revisit } from '../src/data/mockData';
import { colors, radius } from '../src/theme';

const circled = ['①', '②', '③'];

export default function RevisitScreen() {
  const { id = 'c1' } = useLocalSearchParams(); // 從首頁回訪提醒、客戶詳情頁帶 id 進來
  const { getCustomer, todos, toggleTodo } = useCustomers();

  const customer = getCustomer(id);
  const data = revisit[id];
  const myTodos = todos.filter((t) => t.customerId === id && !t.done);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <BackHeader
          title="回訪軍師"
          right={<Text style={styles.arrived}>{customer ? `${customer.name} 到店了` : ''}</Text>}
        />

        {!data ? (
          <Text style={styles.empty}>這位客戶還沒有回訪建議，完成一次錄音分析後就會產生。</Text>
        ) : (
          <>
            {/* 1. 客戶到店前即時調出記憶 */}
            <View style={styles.memoryBox}>
              <Text style={styles.memoryTitle}>✦ 你上次見他是 {data.daysSinceLast} 天前</Text>
              <Text style={styles.memoryText}>{data.summary}</Text>
            </View>

            {/* 自動回訪提醒 */}
            <View style={styles.reminder}>
              <Text style={styles.reminderText}>🔔 AI 建議回訪時間：{data.nextVisit}</Text>
            </View>

            {/* 2. 三段式專屬話術 */}
            <SectionTitle title="建議開場話題" />
            {data.openers.map((o, i) => (
              <View key={o.title} style={styles.openerCard}>
                <Text style={styles.openerTitle}>
                  {circled[i]} {o.title}
                </Text>
                <Text style={styles.openerText}>「{o.text}」</Text>
              </View>
            ))}

            {/* 回訪前待辦 */}
            {myTodos.length > 0 && (
              <>
                <SectionTitle title="見面前先完成" />
                {myTodos.map((t) => (
                  <TodoItem key={t.id} todo={t} onToggle={() => toggleTodo(t.id)} />
                ))}
              </>
            )}

            {/* 3. 避免重提清單 */}
            <SectionTitle title="避免重提（已溝通過）" />
            <View style={styles.avoidWrap}>
              {data.avoid.map((a) => (
                <View key={a} style={styles.avoidChip}>
                  <Text style={styles.avoidText}>{a} ✓</Text>
                </View>
              ))}
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
  arrived: { color: colors.primary, fontSize: 14 },
  empty: { color: colors.subText, fontSize: 14, marginTop: 12 },
  memoryBox: { marginTop: 4, backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: 14 },
  memoryTitle: { color: colors.primary, fontSize: 14, marginBottom: 4 },
  memoryText: { color: colors.text, fontSize: 13, lineHeight: 20 },
  reminder: { backgroundColor: colors.orangeLight, borderRadius: radius.sm, padding: 10, marginTop: 8 },
  reminderText: { color: colors.orange, fontSize: 13 },
  openerCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
  },
  openerTitle: { color: colors.primary, fontSize: 13, marginBottom: 4 },
  openerText: { color: colors.text, fontSize: 13, lineHeight: 20 },
  avoidWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  avoidChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
    marginBottom: 6,
  },
  avoidText: { fontSize: 12, color: colors.primary },
});
