// 一筆待辦：點左邊方框可以打勾／取消
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Tag from './Tag';
import { colors, radius } from '../theme';

const priorityText = { high: '高', medium: '中', low: '低' };
const priorityTone = { high: 'hot', medium: 'warm', low: 'cold' };

export default function TodoItem({ todo, customerName, onToggle }) {
  return (
    <Pressable style={styles.row} onPress={onToggle}>
      <View style={[styles.box, todo.done && styles.boxDone]}>
        {todo.done && <Text style={styles.check}>✓</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.task, todo.done && styles.taskDone]}>{todo.task}</Text>
        <Text style={styles.meta}>
          {customerName ? `${customerName} · ` : ''}
          {todo.due}
        </Text>
      </View>
      <Tag label={priorityText[todo.priority]} tone={priorityTone[todo.priority]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.placeholder,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  check: { color: '#fff', fontSize: 13, fontWeight: '700' },
  task: { fontSize: 14, color: colors.text },
  taskDone: { color: colors.placeholder, textDecorationLine: 'line-through' },
  meta: { fontSize: 12, color: colors.subText, marginTop: 2 },
});
