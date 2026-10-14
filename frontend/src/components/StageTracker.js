// 客戶生命週期進度：初次接觸 → 需求確認 → 報價中 → 決策中 → 成交
import { StyleSheet, Text, View } from 'react-native';
import { STAGES } from '../data/mockData';
import { colors } from '../theme';

export default function StageTracker({ stage }) {
  const current = STAGES.indexOf(stage);
  return (
    <View>
      <View style={styles.row}>
        {STAGES.map((s, i) => (
          <View key={s} style={styles.cell}>
            <View style={[styles.bar, i <= current && { backgroundColor: colors.primary }]} />
          </View>
        ))}
      </View>
      <View style={styles.row}>
        {STAGES.map((s, i) => (
          <Text
            key={s}
            style={[styles.label, i === current && { color: colors.primary, fontWeight: '700' }]}
          >
            {s}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  cell: { flex: 1, paddingHorizontal: 2 },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.border },
  label: { flex: 1, fontSize: 10, color: colors.subText, textAlign: 'center', marginTop: 4 },
});
