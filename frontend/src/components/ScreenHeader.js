// 每頁上方的標題列：左邊大標題，右邊可放一個小元件（按鈕、標籤…）
// 有傳 onBack 時，標題左邊會多一個 ← 返回鍵
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export default function ScreenHeader({ title, right, onBack }) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={10}>
            <Text style={styles.back}>←</Text>
          </Pressable>
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  left: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  back: { fontSize: 20, color: colors.text, marginRight: 10 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
});
