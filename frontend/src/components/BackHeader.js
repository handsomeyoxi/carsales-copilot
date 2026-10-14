// 有返回鍵的標題列（客戶詳情、隱私紀錄、詞庫、CRM 這些「從別頁點進來」的頁面用）
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors } from '../theme';

export default function BackHeader({ title, right, onBack }) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onBack || (() => router.back())} hitSlop={10}>
        <Text style={styles.back}>←</Text>
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  back: { fontSize: 20, color: colors.text, marginRight: 10 },
  title: { flex: 1, fontSize: 18, fontWeight: '600', color: colors.text },
});
