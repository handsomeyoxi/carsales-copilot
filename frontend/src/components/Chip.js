// 可點選的膠囊按鈕（來源管道、溫度標籤用）
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius } from '../theme';

export default function Chip({ label, selected, onPress, selectedColor = colors.primary, selectedBg = colors.primaryLight }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        selected && { backgroundColor: selectedBg, borderColor: selectedColor },
      ]}
    >
      <Text style={[styles.text, selected && { color: selectedColor, fontWeight: '600' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    marginRight: 8,
  },
  text: { fontSize: 13, color: colors.subText },
});
