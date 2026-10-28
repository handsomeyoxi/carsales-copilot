// 待辦行事曆：月曆上看每天的待辦（紫點）和回訪（橘點），點日期看當天清單，可自己新增待辦
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import BackHeader from '../src/components/BackHeader';
import MonthCalendar from '../src/components/MonthCalendar';
import TodoItem from '../src/components/TodoItem';
import { useCustomers } from '../src/context/CustomerContext';
import { followUps } from '../src/data/mockData';
import { colors, radius } from '../src/theme';
import { dayLabel, todayISO } from '../src/utils/date';

export default function CalendarScreen() {
  const { todos, toggleTodo, getCustomer } = useCustomers();
  const [selected, setSelected] = useState(todayISO());

  // 每天有幾件待辦、幾個回訪 → 月曆上的小點
  const marks = {};
  todos.filter((t) => !t.done).forEach((t) => {
    marks[t.date] = { ...(marks[t.date] || {}), todo: (marks[t.date]?.todo || 0) + 1 };
  });
  followUps.forEach((f) => {
    marks[f.date] = { ...(marks[f.date] || {}), followup: (marks[f.date]?.followup || 0) + 1 };
  });

  const dayTodos = todos
    .filter((t) => t.date === selected)
    .sort((a, b) => a.done - b.done || (a.time || '99').localeCompare(b.time || '99'));
  const dayFollowUps = followUps.filter((f) => f.date === selected);
  const overdue = todos.filter((t) => !t.done && t.date < todayISO());

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <BackHeader
          title="待辦行事曆"
          right={
            <Pressable onPress={() => router.push({ pathname: '/todo-add', params: { date: selected } })} hitSlop={10}>
              <Text style={styles.addLink}>＋ 新增</Text>
            </Pressable>
          }
        />

        <MonthCalendar selected={selected} onSelect={setSelected} marks={marks} />

        {overdue.length > 0 && (
          <View style={styles.overdue}>
            <Text style={styles.overdueText}>⚠️ 有 {overdue.length} 件待辦已過期還沒完成</Text>
          </View>
        )}

        <Text style={styles.dayTitle}>
          {dayLabel(selected)}（{selected.slice(5).replace('-', '/')}）
        </Text>

        {dayFollowUps.map((f) => {
          const c = getCustomer(f.customerId);
          return (
            <Pressable
              key={f.id}
              style={styles.follow}
              onPress={() => router.push({ pathname: '/revisit', params: { id: f.customerId } })}
            >
              <Text style={styles.followTitle}>🔔 回訪 {c?.name}</Text>
              <Text style={styles.followReason}>{f.reason}</Text>
              <Text style={styles.followLink}>看話術 ›</Text>
            </Pressable>
          );
        })}

        {dayTodos.map((t) => (
          <TodoItem key={t.id} todo={t} customerName={getCustomer(t.customerId)?.name} onToggle={() => toggleTodo(t.id)} />
        ))}

        {dayTodos.length === 0 && dayFollowUps.length === 0 && <Text style={styles.empty}>這天沒有安排</Text>}

        <Pressable
          style={styles.addBtn}
          onPress={() => router.push({ pathname: '/todo-add', params: { date: selected } })}
        >
          <Text style={styles.addBtnText}>＋ 在 {dayLabel(selected)} 新增待辦</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 32 },
  addLink: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  overdue: { backgroundColor: colors.redLight, borderRadius: radius.sm, padding: 10, marginTop: 12 },
  overdueText: { color: colors.red, fontSize: 13 },
  dayTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 8 },
  follow: { backgroundColor: colors.orangeLight, borderRadius: radius.md, padding: 12, marginBottom: 8 },
  followTitle: { fontSize: 14, fontWeight: '600', color: colors.orange },
  followReason: { fontSize: 12, color: colors.text, marginTop: 3 },
  followLink: { fontSize: 12, color: colors.orange, marginTop: 4, textAlign: 'right' },
  empty: { color: colors.subText, fontSize: 13, marginBottom: 8 },
  addBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  addBtnText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
});
