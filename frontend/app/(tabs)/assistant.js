// AI 助理分頁：用聊天的方式問「今天該聯絡誰」「這位客戶推哪台車」「幫我寫 LINE」等
// 目前回答由 src/utils/assistant.js 用 App 內的資料產生（示範版），之後改接後端 Gemini
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import ScreenHeader from '../../src/components/ScreenHeader';
import { useCustomers } from '../../src/context/CustomerContext';
import { colors, radius } from '../../src/theme';
import { askAssistant, SUGGESTIONS } from '../../src/utils/assistant';

export default function AssistantScreen() {
  const ctx = useCustomers();
  const { chat, addChatMessage, profile } = ctx;
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef(null);

  function send(text) {
    const q = (text ?? input).trim();
    if (!q || thinking) return;
    setInput('');
    addChatMessage({ role: 'user', text: q });
    setThinking(true);
    // 模擬 AI 思考一下再回答
    setTimeout(() => {
      const reply = askAssistant(q, ctx);
      addChatMessage({ role: 'ai', ...reply });
      setThinking(false);
      setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 50);
    }, 700);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <ScreenHeader title="AI 助理" right={<Text style={styles.brand}>{profile.brand} 業務專屬</Text>} />
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={styles.messages}>
          {/* 歡迎訊息 */}
          <View style={[styles.bubble, styles.aiBubble]}>
            <Text style={styles.aiText}>
              嗨 {profile.name || ''}！我是你的銷售助理 🤖{'\n'}可以問我今天該聯絡誰、客戶適合哪台車、跟對手車款差在哪，或請我幫你寫回訪訊息。
            </Text>
          </View>

          {chat.map((m) =>
            m.role === 'user' ? (
              <View key={m.id} style={[styles.bubble, styles.userBubble]}>
                <Text style={styles.userText}>{m.text}</Text>
              </View>
            ) : (
              <View key={m.id} style={[styles.bubble, styles.aiBubble]}>
                <Text style={styles.aiText}>{m.text}</Text>
                {(m.actions || []).map((a) => (
                  <Pressable
                    key={a.label}
                    style={styles.action}
                    onPress={() => router.push(a.params ? { pathname: a.path, params: a.params } : a.path)}
                  >
                    <Text style={styles.actionText}>{a.label} ›</Text>
                  </Pressable>
                ))}
              </View>
            )
          )}

          {thinking && (
            <View style={[styles.bubble, styles.aiBubble]}>
              <Text style={styles.aiText}>思考中…</Text>
            </View>
          )}
        </ScrollView>

        {/* 建議問題 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestBar} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {SUGGESTIONS.map((s) => (
            <Pressable key={s} style={styles.suggest} onPress={() => send(s)}>
              <Text style={styles.suggestText}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="問 AI 助理…"
            placeholderTextColor={colors.placeholder}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send()}
            returnKeyType="send"
          />
          <Pressable style={[styles.sendBtn, !input.trim() && { opacity: 0.4 }]} onPress={() => send()}>
            <Text style={styles.sendText}>送出</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 20 },
  brand: { fontSize: 12, color: colors.primary },
  messages: { paddingHorizontal: 16, paddingBottom: 12 },
  bubble: { maxWidth: '85%', borderRadius: 16, padding: 12, marginBottom: 10 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: colors.card, borderTopLeftRadius: 4 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderTopRightRadius: 4 },
  aiText: { fontSize: 14, lineHeight: 21, color: colors.text },
  userText: { fontSize: 14, lineHeight: 21, color: '#fff' },
  action: { backgroundColor: '#fff', borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: 10, marginTop: 8 },
  actionText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  suggestBar: { flexGrow: 0, paddingVertical: 6 },
  suggest: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: colors.primaryLight,
  },
  suggestText: { color: colors.primary, fontSize: 13 },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  sendBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10, marginLeft: 8 },
  sendText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
