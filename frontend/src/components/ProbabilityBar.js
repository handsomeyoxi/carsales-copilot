// 成交機率長條：>=70 綠、>=40 橘、其他藍
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function probabilityColor(p) {
  if (p >= 70) return colors.green;
  if (p >= 40) return colors.orange;
  return colors.blue;
}

export default function ProbabilityBar({ value, showLabel = true, height = 6 }) {
  const color = probabilityColor(value);
  return (
    <View style={styles.row}>
      <View style={[styles.track, { height, borderRadius: height / 2 }]}>
        <View style={{ width: `${value}%`, height, borderRadius: height / 2, backgroundColor: color }} />
      </View>
      {showLabel && <Text style={[styles.label, { color }]}>{value}%</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  track: { flex: 1, backgroundColor: colors.border, overflow: 'hidden' },
  label: { fontSize: 12, fontWeight: '600', marginLeft: 8, width: 36, textAlign: 'right' },
});
