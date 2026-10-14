// 待辦分頁：上方切換「待辦事項／回訪排程」
// 待辦依「今天／之後／已完成」分組；回訪依日期列出，點了看話術
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import ScreenHeader from '../../src/components/ScreenHeader';
import TodoItem from '../../src/components/TodoItem';
import { probabilityColor } from '../../src/components/ProbabilityBar';
import { useCustomers } from '../../src/context/CustomerContext';
import { followUps } from '../../src/data/mockData';
import { colors, radius } from '../../src/theme';

const tabs = [
  { key: 'todos', label: '待辦事項' },
  { key: 'followups', label: '回訪排程' },
];

function Group({ title, children }) {
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={styles.groupTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function TodosScreen() {
  const params = useLocalSearchParams(); // 從首頁「待回訪」進來會帶 tab=followups
  const { todos, toggleTodo, getCustomer } = useCustomers();
  const [tab, setTab] = useState(params.tab || 'todos');

  useEffect(() => {
    if (params.tab) setTab(params.tab);
  }, [params.tab]);

  // 從首頁點進來才顯示返回鍵；按了回首頁，並清掉 from，之後直接點分頁就不會有返回鍵
  function backToHome() {
    router.setParams({ from: undefined });
    router.navigate('/home');
  }

  const doneCount = todos.filter((t) => t.done).length;
  const todayList = todos.filter((t) => !t.done && t.due === '今天');
  const laterList = todos.filter((t) => !t.done && t.due !== '今天');
  const doneList = todos.filter((t) => t.done);

  const renderTodo = (t) => (
    <TodoItem key={t.id} todo={t} customerName={getCustomer(t.customerId)?.name} onToggle={() => toggleTodo(t.id)} />
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader
          title="待辦"
          onBack={params.from === 'home' ? backToHome : undefined}
          right={
            <Text style={styles.progress}>
              完成 {doneCount} / {todos.length}
            </Text>
          }
        />

        <View style={styles.segment}>
          {tabs.map((t) => (
            <Pressable key={t.key} style={[styles.segBtn, tab === t.key && styles.segActive]} onPress={() => setTab(t.key)}>
              <Text style={[styles.segText, tab === t.key && styles.segTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'todos' ? (
          <>
            <Group title={`今天（${todayList.length}）`}>
              {todayList.length === 0 ? <Text style={styles.empty}>今天沒有待辦 🎉</Text> : todayList.map(renderTodo)}
            </Group>
            <Group title={`之後（${laterList.length}）`}>{laterList.map(renderTodo)}</Group>
            {doneList.length > 0 && <Group title={`已完成（${doneList.length}）`}>{doneList.map(renderTodo)}</Group>}
          </>
        ) : (
          <>
            <Text style={styles.hint}>AI 依每位客戶的狀況自動排出建議回訪時間</Text>
            {followUps.map((f) => {
              const c = getCustomer(f.customerId);
              if (!c) return null;
              return (
                <Pressable
                  key={f.id}
                  style={styles.followRow}
                  onPress={() => router.push({ pathname: '/revisit', params: { id: c.id } })}
                >
                  <View style={styles.dateBox}>
                    <Text style={styles.dateText}>{f.when}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.followName}>
                      {c.name}
                      <Text style={{ color: probabilityColor(c.closeProbability), fontSize: 12 }}>
                        {'  '}
                        {c.closeProbability}%
                      </Text>
                    </Text>
                    <Text style={styles.followReason}>{f.reason}</Text>
                  </View>
                  <Text style={styles.link}>話術 ›</Text>
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 32 },
  progress: { fontSize: 13, color: colors.subText },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 3,
    marginBottom: 12,
  },
  segBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  segActive: { backgroundColor: colors.primaryLight },
  segText: { fontSize: 14, color: colors.subText },
  segTextActive: { color: colors.primary, fontWeight: '600' },
  groupTitle: { fontSize: 12, color: colors.subText, marginTop: 8, marginBottom: 6 },
  empty: { fontSize: 13, color: colors.subText, marginBottom: 8 },
  hint: { fontSize: 12, color: colors.subText, marginBottom: 10 },
  followRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
  },
  dateBox: {
    width: 52,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    marginRight: 12,
  },
  dateText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  followName: { fontSize: 15, fontWeight: '600', color: colors.text },
  followReason: { fontSize: 12, color: colors.subText, marginTop: 3 },
  link: { fontSize: 13, color: colors.primary, marginLeft: 8 },
});
