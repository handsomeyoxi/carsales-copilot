// 回訪軍師（一般頁面，帶客戶 id 進來：/revisit?id=c1）：記憶提示、回訪時間、三段式話術、回訪前待辦、避免重提
// 芷璇改：接後端的 followUpAdvisor
// - 連到後端時：先顯示上次存的 AI 建議（customer.followUpAdvice），按按鈕可以請 AI 重新產生
// - 沒連到後端（假資料模式）：顯示 mockData 的示範內容
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import * as api from '../src/api';
import BackHeader from '../src/components/BackHeader';
import SectionTitle from '../src/components/SectionTitle';
import TodoItem from '../src/components/TodoItem';
import { useCustomers } from '../src/context/CustomerContext';
import { revisit } from '../src/data/mockData';
import { colors, radius } from '../src/theme';

// 假資料的格式和後端不一樣，轉成後端 followUpAdvisor 回傳的格式，畫面只要寫一種
function mockToAdvice(m) {
  if (!m) return null;
  const [opening, core, closing] = m.openers;
  const toScript = (o) => (o ? { script: o.text, based_on: o.title } : null);
  return {
    timing: { when: m.nextVisit, reason: m.summary },
    channel: null,
    goal: null,
    scripts: { opening: toScript(opening), core: toScript(core), closing: toScript(closing) },
    avoid_repeating: m.avoid.map((topic) => ({ topic })),
    objection_prep: [],
  };
}

const SCRIPT_PARTS = [
  { key: 'opening', label: '① 開場' },
  { key: 'core', label: '② 核心' },
  { key: 'closing', label: '③ 收尾' },
];

export default function RevisitScreen() {
  const { id = 'c1' } = useLocalSearchParams(); // 從首頁回訪提醒、客戶詳情頁帶 id 進來
  const { getCustomer, todos, toggleTodo, dataSource, setFollowUpAdvice } = useCustomers();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const customer = getCustomer(id);
  const live = dataSource === 'api';
  const advice = live ? customer && customer.followUpAdvice : mockToAdvice(revisit[id]);
  const myTodos = todos.filter((t) => t.customerId === id && !t.done);

  // 請 AI 產生回訪建議：大約 30 秒～1 分鐘，後端也會存一份，下次打開直接顯示
  async function generate() {
    setBusy(true);
    setError('');
    try {
      const result = await api.fetchFollowUpAdvice(id);
      setFollowUpAdvice(id, result);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const scripts = (advice && advice.scripts) || {};
  const avoid = (advice && advice.avoid_repeating) || [];
  const objections = (advice && advice.objection_prep) || [];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <BackHeader
          title="回訪軍師"
          right={<Text style={styles.arrived}>{customer ? `${customer.name} 到店了` : ''}</Text>}
        />

        {/* 產生／重新產生 AI 建議（只有連到後端時才有） */}
        {live && (
          <Pressable style={[styles.genBtn, busy && { opacity: 0.6 }]} onPress={generate} disabled={busy}>
            {busy ? (
              <View style={styles.genRow}>
                <ActivityIndicator color="#fff" />
                <Text style={[styles.genText, { marginLeft: 8 }]}>AI 分析中，大約需要 1 分鐘…</Text>
              </View>
            ) : (
              <Text style={styles.genText}>{advice ? '↻ 重新產生 AI 回訪建議' : '✨ 產生 AI 回訪建議'}</Text>
            )}
          </Pressable>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!advice ? (
          !busy && (
            <Text style={styles.empty}>
              {live
                ? '這位客戶還沒有回訪建議。按上面的按鈕，AI 會依照過去的對話紀錄幫你準備話術。'
                : '這位客戶還沒有回訪建議，完成一次錄音分析後就會產生。'}
            </Text>
          )
        ) : (
          <>
            {/* 1. 客戶到店前即時調出記憶 */}
            <View style={styles.memoryBox}>
              <Text style={styles.memoryTitle}>
                ✦ 你上次見他是 {customer && customer.lastContactDays != null ? customer.lastContactDays : '?'} 天前
              </Text>
              {advice.timing && advice.timing.reason ? <Text style={styles.memoryText}>{advice.timing.reason}</Text> : null}
            </View>

            {/* 建議回訪時間、聯絡方式、這次目標 */}
            {advice.timing && advice.timing.when ? (
              <View style={styles.reminder}>
                <Text style={styles.reminderText}>
                  🔔 AI 建議回訪時間：{advice.timing.when}
                  {advice.channel ? `・${advice.channel}` : ''}
                </Text>
              </View>
            ) : null}
            {advice.goal ? (
              <View style={styles.goal}>
                <Text style={styles.goalText}>🎯 這次目標：{advice.goal}</Text>
              </View>
            ) : null}

            {/* 2. 三段式專屬話術 */}
            <SectionTitle title="建議話術" />
            {SCRIPT_PARTS.filter((p) => scripts[p.key] && scripts[p.key].script).map((p) => (
              <View key={p.key} style={styles.openerCard}>
                <Text style={styles.openerTitle}>{p.label}</Text>
                <Text style={styles.openerText}>「{scripts[p.key].script}」</Text>
                {scripts[p.key].based_on ? <Text style={styles.basedOn}>依據：{scripts[p.key].based_on}</Text> : null}
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
            {avoid.length > 0 && (
              <>
                <SectionTitle title="避免重提（已溝通過）" />
                <View style={styles.avoidWrap}>
                  {avoid.map((a) => (
                    <View key={a.topic} style={styles.avoidChip}>
                      <Text style={styles.avoidText}>{a.topic} ✓</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* 4. 客戶可能提出的疑慮 */}
            {objections.length > 0 && (
              <>
                <SectionTitle title="可能的疑慮與回應" />
                {objections.map((o) => (
                  <View key={o.objection} style={styles.openerCard}>
                    <Text style={styles.objQ}>❓ {o.objection}</Text>
                    <Text style={styles.openerText}>👉 {o.response}</Text>
                  </View>
                ))}
              </>
            )}
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
  empty: { color: colors.subText, fontSize: 14, marginTop: 12, lineHeight: 21 },
  error: { color: colors.red, fontSize: 13, marginTop: 8 },
  genBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', marginBottom: 8 },
  genRow: { flexDirection: 'row', alignItems: 'center' },
  genText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  memoryBox: { marginTop: 4, backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: 14 },
  memoryTitle: { color: colors.primary, fontSize: 14, marginBottom: 4 },
  memoryText: { color: colors.text, fontSize: 13, lineHeight: 20 },
  reminder: { backgroundColor: colors.orangeLight, borderRadius: radius.sm, padding: 10, marginTop: 8 },
  reminderText: { color: colors.orange, fontSize: 13 },
  goal: { backgroundColor: colors.greenLight, borderRadius: radius.sm, padding: 10, marginTop: 8 },
  goalText: { color: colors.green, fontSize: 13, lineHeight: 19 },
  openerCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
  },
  openerTitle: { color: colors.primary, fontSize: 13, marginBottom: 4 },
  openerText: { color: colors.text, fontSize: 13, lineHeight: 20 },
  basedOn: { color: colors.subText, fontSize: 11, marginTop: 6 },
  objQ: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 4 },
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
