// 汽車專有名詞詞庫：把車款、配備、台灣常用說法加進來，語音辨識時優先辨識這些詞
// 之後接 Whisper 時，這份清單會當成 prompt 提示詞一起送出
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackHeader from '../src/components/BackHeader';
import { useCustomers } from '../src/context/CustomerContext';
import { colors, radius } from '../src/theme';

export default function VocabularyScreen() {
  const { vocabulary, addTerm, removeTerm } = useCustomers();
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState('');

  function handleAdd() {
    if (addTerm(input)) {
      setMsg(`已加入「${input.trim()}」`);
      setInput('');
    } else {
      setMsg('這個詞是空的或已經在詞庫裡了');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <BackHeader title="汽車專有名詞詞庫" />

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            語音辨識常把車款、配備聽錯（例如「GLC」聽成「G L C」、「尾門」聽成「為門」）。把常用詞加進來，可以提升台灣口音與專有名詞的辨識準確率。
          </Text>
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="輸入新詞，例如：盲點偵測"
            placeholderTextColor={colors.placeholder}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleAdd}
          />
          <Pressable style={styles.addBtn} onPress={handleAdd}>
            <Text style={styles.addText}>加入</Text>
          </Pressable>
        </View>
        {msg ? <Text style={styles.msg}>{msg}</Text> : null}

        <Text style={styles.count}>目前 {vocabulary.length} 個詞（點 × 移除）</Text>
        <View style={styles.wrap}>
          {vocabulary.map((v) => (
            <View key={v} style={styles.term}>
              <Text style={styles.termText}>{v}</Text>
              <Pressable onPress={() => removeTerm(v)} hitSlop={8}>
                <Text style={styles.remove}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20 },
  infoBox: { backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: 12, marginBottom: 14 },
  infoText: { fontSize: 13, lineHeight: 20, color: colors.text },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.text,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginLeft: 8,
  },
  addText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  msg: { fontSize: 12, color: colors.green, marginTop: 6 },
  count: { fontSize: 12, color: colors.subText, marginTop: 16, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  term: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 8,
  },
  termText: { fontSize: 13, color: colors.text },
  remove: { fontSize: 15, color: colors.placeholder, marginLeft: 6 },
});
