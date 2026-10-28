// 月曆：點日期選取；有待辦的日子顯示紫點、有回訪的日子顯示橘點
// marks = { '2026-10-18': { todo: 2, followup: 1 } }
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import { toISO, todayISO, WEEKDAYS } from '../utils/date';

export default function MonthCalendar({ selected, onSelect, marks = {} }) {
  const first = selected ? new Date(selected) : new Date();
  const [month, setMonth] = useState(new Date(first.getFullYear(), first.getMonth(), 1));
  const today = todayISO();

  const year = month.getFullYear();
  const m = month.getMonth();
  const startWeekday = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();

  // 前面補空格，讓 1 號對齊星期幾
  const cells = [...Array(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable onPress={() => setMonth(new Date(year, m - 1, 1))} hitSlop={10}>
          <Text style={styles.nav}>‹</Text>
        </Pressable>
        <Text style={styles.title}>
          {year} 年 {m + 1} 月
        </Text>
        <Pressable onPress={() => setMonth(new Date(year, m + 1, 1))} hitSlop={10}>
          <Text style={styles.nav}>›</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.row}>
          {week.map((d, di) => {
            if (!d) return <View key={di} style={styles.cell} />;
            const iso = toISO(new Date(year, m, d));
            const isSel = iso === selected;
            const isToday = iso === today;
            const mark = marks[iso];
            return (
              <Pressable key={di} style={styles.cell} onPress={() => onSelect && onSelect(iso)}>
                <View style={[styles.day, isToday && styles.today, isSel && styles.selected]}>
                  <Text style={[styles.dayText, isSel && { color: '#fff', fontWeight: '700' }]}>{d}</Text>
                </View>
                <View style={styles.dots}>
                  {mark?.todo ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
                  {mark?.followup ? <View style={[styles.dot, { backgroundColor: colors.orange }]} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      <View style={styles.legend}>
        <View style={[styles.dot, { backgroundColor: colors.primary }]} />
        <Text style={styles.legendText}>待辦</Text>
        <View style={[styles.dot, { backgroundColor: colors.orange, marginLeft: 12 }]} />
        <Text style={styles.legendText}>回訪</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  nav: { fontSize: 24, color: colors.primary, paddingHorizontal: 10 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, color: colors.subText, marginBottom: 4 },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 2, minHeight: 44 },
  day: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 1.5, borderColor: colors.primary },
  selected: { backgroundColor: colors.primary },
  dayText: { fontSize: 14, color: colors.text },
  dots: { flexDirection: 'row', height: 6, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3, marginHorizontal: 1 },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  legendText: { fontSize: 11, color: colors.subText, marginLeft: 4 },
});
