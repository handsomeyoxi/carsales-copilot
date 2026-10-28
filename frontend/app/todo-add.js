// 新增待辦：內容、日期（月曆選）、時間、相關客戶、優先度
// 從行事曆、客戶詳情、AI 助理都可以打開；可以帶 date、customerId、task 預先填好
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import BackHeader from '../src/components/BackHeader';
import Chip from '../src/components/Chip';
import MonthCalendar from '../src/components/MonthCalendar';
import { useCustomers } from '../src/context/CustomerContext';
import { colors, radius } from '../src/theme';
import { dayLabel, todayISO } from '../src/utils/date';

const times = ['', '09:00', '10:00', '14:00', '16:00', '19:00'];
const priorities = [
  { key: 'high', label: '高', color: colors.red, bg: colors.redLight },
  { key: 'medium', label: '中', color: colors.orange, bg: colors.orangeLight },
  { key: 'low', label: '低', color: colors.blue, bg: colors.blueLight },
];

export default function TodoAddScreen() {
  const params = useLocalSearchParams();
  const { customers, addTodo } = useCustomers();
  const [task, setTask] = useState(params.task || '');
  const [date, setDate] = useState(params.date || todayISO());
  const [time, setTime] = useState('');
  const [customerId, setCustomerId] = useState(params.customerId || null);
  const [priority, setPriority] = useState('medium');

  function save() {
    if (!task.trim()) return;
    addTodo({ task: task.trim(), date, time, customerId, priority });
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <BackHeader
          title="新增待辦"
          right={
            <Pressable onPress={save} hitSlop={10}>
              <Text style={[styles.saveLink, !task.trim() && { opacity: 0.4 }]}>儲存</Text>
            </Pressable>
          }
        />

        <Text style={styles.label}>要做什麼 *</Text>
        <TextInput
          style={styles.input}
          placeholder="例如：打電話確認試乘時間"
          placeholderTextColor={colors.placeholder}
          value={task}
          onChangeText={setTask}
        />

        <Text style={styles.label}>日期：{dayLabel(date)}（{date.slice(5).replace('-', '/')}）</Text>
        <MonthCalendar selected={date} onSelect={setDate} />

        <Text style={styles.label}>時間</Text>
        <View style={styles.wrap}>
          {times.map((t) => (
            <View key={t || 'none'} style={{ marginBottom: 8 }}>
              <Chip label={t || '不指定'} selected={time === t} onPress={() => setTime(t)} />
            </View>
          ))}
        </View>

        <Text style={styles.label}>相關客戶</Text>
        <View style={styles.wrap}>
          <View style={{ marginBottom: 8 }}>
            <Chip label="無" selected={!customerId} onPress={() => setCustomerId(null)} />
          </View>
          {customers.map((c) => (
            <View key={c.id} style={{ marginBottom: 8 }}>
              <Chip label={c.name} selected={customerId === c.id} onPress={() => setCustomerId(c.id)} />
            </View>
          ))}
        </View>

        <Text style={styles.label}>優先度</Text>
        <View style={styles.wrap}>
          {priorities.map((p) => (
            <Chip
              key={p.key}
              label={p.label}
              selected={priority === p.key}
              selectedColor={p.color}
              selectedBg={p.bg}
              onPress={() => setPriority(p.key)}
            />
          ))}
        </View>

        <Pressable style={[styles.btn, !task.trim() && { opacity: 0.4 }]} disabled={!task.trim()} onPress={save}>
          <Text style={styles.btnText}>新增到行事曆</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 32 },
  saveLink: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  label: { fontSize: 14, color: colors.subText, marginTop: 14, marginBottom: 8 },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
