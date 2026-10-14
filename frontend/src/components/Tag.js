// 小標籤：熱/溫/冷、車款、家庭… 都用它
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

// 先定義好幾種配色，用 tone 來選
const tones = {
  hot: { bg: colors.redLight, fg: colors.red },
  warm: { bg: colors.orangeLight, fg: colors.orange },
  cold: { bg: colors.blueLight, fg: colors.blue },
  green: { bg: colors.greenLight, fg: colors.green },
  pink: { bg: colors.pinkLight, fg: colors.pink },
  purple: { bg: colors.primaryLight, fg: colors.primary },
};

export default function Tag({ label, tone = 'purple', style }) {
  const t = tones[tone];
  return (
    <View style={[styles.tag, { backgroundColor: t.bg }, style]}>
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  text: { fontSize: 12, fontWeight: '600' },
});
