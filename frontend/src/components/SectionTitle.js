// 區塊小標題，右邊可放「查看全部」之類的連結
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export default function SectionTitle({ title, actionText, onAction }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {actionText ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{actionText}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  title: { fontSize: 14, fontWeight: '600', color: colors.text },
  action: { fontSize: 13, color: colors.primary },
});
