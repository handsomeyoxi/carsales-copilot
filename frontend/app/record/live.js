// 錄音流程 ③：全螢幕錄音
// 深色、大字、大按鈕：業務員邊聊邊瞄一眼就好；分頁列藏起來避免誤觸
// 「縮小」可以先離開去查資料，錄音繼續（狀態存在 Context 裡）
// 芷璇改：網頁版／iPad 用麥克風真的錄音，每 30 秒上傳一段給 stt-server，逐字稿一段一段出現
// 以下情況還是用「模擬錄音」（假逐字稿）：手機 App（沒有 MediaRecorder）、新客戶、沒連到後端
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCustomers } from '../../src/context/CustomerContext';
import { detectedKeywords, transcript } from '../../src/data/mockData';
import { canRecord, clearRecorder, getRecorder, SEGMENT_SEC, startRecorder } from '../../src/utils/recorder';
import { colors, radius } from '../../src/theme';

const LOW_CONFIDENCE = 0.8;
const DARK = '#1E1B3A';

function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function LiveRecordingScreen() {
  const { activeSession: session, getCustomer, updateSession, togglePause, endSession, dataSource } = useCustomers();
  const insets = useSafeAreaInsets(); // 手機瀏海／動態島的高度
  const [now, setNow] = useState(Date.now());
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState('');

  // 每秒更新一次畫面上的時間
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 要不要真的錄音：網頁版有麥克風、已經存在的客戶、有連到後端
  const real = !!session && session.real !== false && canRecord() && dataSource === 'api' && session.customerId !== 'new';

  // 一進來就開始真的錄音（縮小再回來不會重開：已經有 conversationId 或正在開）
  useEffect(() => {
    if (!real || session.conversationId || session.starting || session.recError || getRecorder()) return;
    updateSession({ starting: true, lines: [], keywords: [], uploaded: 0, recError: null });
    startRecorder({
      customerId: session.customerId,
      // 每段轉好文字：加一則逐字稿、合併關鍵字（用函式更新，才不會蓋掉同時進來的其他段）
      onSegment: (seq, { text, keywords }) =>
        updateSession((prev) => {
          const lines = text ? [...prev.lines, { id: `seg-${seq}`, seq, speaker: 'unknown', text, confidence: 1 }] : prev.lines;
          const seen = new Set((prev.keywords || []).map((k) => `${k.category}|${k.value}`));
          const added = (keywords || []).filter((k) => k && k.value && !seen.has(`${k.category}|${k.value}`));
          return {
            lines: lines.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0)),
            keywords: [...(prev.keywords || []), ...added],
            uploaded: (prev.uploaded || 0) + 1,
            uploadError: null,
          };
        }),
      onUploadError: (seq) => updateSession({ uploadError: `第 ${seq + 1} 段上傳失敗，結束時會再重試` }),
    })
      .then((rec) => updateSession({ starting: false, conversationId: rec.conversationId }))
      .catch((e) => updateSession({ starting: false, recError: e.message }));
  }, [real, session && session.conversationId, session && session.starting]);

  if (!session) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#fff' }}>目前沒有進行中的錄音</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: '#B9B6D6', marginTop: 12 }}>返回</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const customer = getCustomer(session.customerId);
  const paused = !!session.pausedAt;
  const pausedNow = paused ? now - session.pausedAt : 0;
  const seconds = Math.max(0, Math.floor((now - session.startedAt - session.pausedMs - pausedNow) / 1000));

  function saveEdit() {
    updateSession({
      lines: session.lines.map((l) => (l.id === editingId ? { ...l, text: draft, confidence: 1, corrected: true } : l)),
    });
    setEditingId(null);
  }

  function finish() {
    const id = session.customerId;
    const live = real && !!session.conversationId; // 真的有在錄 → 分析頁要等上傳、呼叫 AI
    if (real && !live) clearRecorder(); // 還沒開始成功就按結束：放棄
    endSession();
    router.replace({ pathname: '/record/analyzing', params: { id, seconds: String(seconds), live: live ? '1' : '' } });
  }

  // 暫停／繼續：畫面上的計時（Context）和麥克風錄音要一起暫停
  function pauseOrResume() {
    const rec = getRecorder();
    if (rec) {
      if (paused) rec.resume();
      else rec.pause();
    }
    togglePause();
  }

  // 開麥克風失敗（例如沒給權限）→ 改用模擬逐字稿繼續 demo
  function switchToMock() {
    clearRecorder();
    updateSession({ real: false, recError: null, starting: false, lines: transcript });
  }

  return (
    <View style={[styles.safe, { paddingTop: Math.max(insets.top, 24) + 12, paddingBottom: insets.bottom }]}>
      <View style={styles.topBar}>
        <Text style={styles.live}>{paused ? '⏸ 已暫停' : '● 錄音中'} · 🔒 已授權</Text>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.minimize}>⌄ 縮小</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.who}>{customer ? customer.name : '新客戶'} · 展間接待</Text>
        <Text style={styles.timer}>{formatTime(seconds)}</Text>
        <View style={styles.wave}>
          {[10, 22, 34, 18, 28, 12, 24, 8].map((h, i) => (
            <View key={i} style={[styles.waveBar, { height: paused ? 4 : h }]} />
          ))}
        </View>

        {session.marks > 0 && <Text style={styles.marks}>📌 已標記 {session.marks} 個重點</Text>}

        {/* 真的錄音時的狀態 */}
        {real && session.starting && <Text style={styles.status}>🎙️ 正在開啟麥克風…</Text>}
        {real && session.conversationId && session.lines.length === 0 && (
          <Text style={styles.status}>每 {SEGMENT_SEC} 秒會出現一段逐字稿，請正常和客戶聊天就好</Text>
        )}
        {real && session.uploaded > 0 && <Text style={styles.status}>☁️ 已上傳 {session.uploaded} 段</Text>}
        {session.uploadError && <Text style={styles.warn}>⚠️ {session.uploadError}</Text>}
        {session.recError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{session.recError}</Text>
            <Pressable style={styles.errorBtn} onPress={switchToMock}>
              <Text style={styles.errorBtnText}>改用模擬逐字稿</Text>
            </Pressable>
          </View>
        )}

        {session.lines.map((line) => {
          const isSales = line.speaker === 'sales';
          const isUnknown = line.speaker === 'unknown'; // 真的錄音：一段一段的原始逐字稿，還沒分業務／客戶
          const low = line.confidence < LOW_CONFIDENCE;
          if (editingId === line.id) {
            return (
              <View key={line.id} style={[styles.bubble, styles.editBubble]}>
                <TextInput style={styles.editInput} value={draft} onChangeText={setDraft} multiline autoFocus />
                <Pressable style={styles.saveBtn} onPress={saveEdit}>
                  <Text style={styles.saveText}>儲存修正</Text>
                </Pressable>
              </View>
            );
          }
          return (
            <Pressable
              key={line.id}
              // 真的錄音的逐字稿先不開放修改（改了也不會送到後端），結束後 AI 會整理成對話
              onPress={
                isUnknown
                  ? undefined
                  : () => {
                      setEditingId(line.id);
                      setDraft(line.text);
                    }
              }
              style={[
                styles.bubble,
                isUnknown ? styles.salesBubble : isSales ? styles.salesBubble : styles.customerBubble,
                low && styles.lowBubble,
              ]}
            >
              <Text style={[styles.bubbleText, !isSales && !isUnknown && { color: '#FBD2E0' }]}>
                {isUnknown ? '' : isSales ? '業務：' : '客戶：'}
                {line.text}
              </Text>
              {low && <Text style={styles.lowHint}>⚠️ 辨識信心 {Math.round(line.confidence * 100)}% · 點我修正</Text>}
              {line.corrected && <Text style={styles.fixedHint}>✎ 已人工修正</Text>}
            </Pressable>
          );
        })}

        <View style={styles.keywordWrap}>
          {(real ? (session.keywords || []).map((k) => k.value) : detectedKeywords).map((k) => (
            <View key={k} style={styles.keyword}>
              <Text style={styles.keywordText}>✦ {k}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 下方三個大按鈕 */}
      <View style={styles.controls}>
        <Pressable style={styles.sideBtn} onPress={pauseOrResume}>
          <View style={styles.sideCircle}>
            <Text style={{ fontSize: 20, color: '#fff' }}>{paused ? '▶' : '⏸'}</Text>
          </View>
          <Text style={styles.sideText}>{paused ? '繼續' : '暫停'}</Text>
        </Pressable>
        <Pressable style={styles.sideBtn} onPress={finish}>
          <View style={styles.stopCircle}>
            <View style={styles.stopSquare} />
          </View>
          <Text style={[styles.sideText, { color: '#fff' }]}>結束</Text>
        </Pressable>
        <Pressable style={styles.sideBtn} onPress={() => updateSession({ marks: session.marks + 1 })}>
          <View style={styles.sideCircle}>
            <Text style={{ fontSize: 20 }}>📌</Text>
          </View>
          <Text style={styles.sideText}>標記重點</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DARK },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  live: { color: '#7CE3A8', fontSize: 15, fontWeight: '600' },
  minimize: { color: '#B9B6D6', fontSize: 15 },
  container: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  who: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  timer: { color: '#fff', fontSize: 44, fontWeight: '300', textAlign: 'center', letterSpacing: 2, marginTop: 4 },
  wave: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 44, marginBottom: 12 },
  waveBar: { width: 4, borderRadius: 2, backgroundColor: '#F28DB0', marginHorizontal: 2 },
  marks: { color: '#F0C060', fontSize: 12, textAlign: 'center', marginBottom: 10 },
  status: { color: '#B9B6D6', fontSize: 12, textAlign: 'center', marginBottom: 10 },
  warn: { color: '#F0A040', fontSize: 12, textAlign: 'center', marginBottom: 10 },
  errorBox: { backgroundColor: 'rgba(242,96,96,0.15)', borderRadius: radius.md, padding: 12, marginBottom: 12 },
  errorText: { color: '#FFB4B4', fontSize: 13, lineHeight: 19 },
  errorBtn: { alignSelf: 'flex-start', marginTop: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6 },
  errorBtnText: { color: '#fff', fontSize: 12 },
  bubble: { borderRadius: radius.md, padding: 11, marginBottom: 8 },
  salesBubble: { backgroundColor: 'rgba(255,255,255,0.1)' },
  customerBubble: { backgroundColor: 'rgba(242,141,176,0.18)' },
  lowBubble: { borderWidth: 1, borderColor: '#F0A040' },
  editBubble: { backgroundColor: '#fff' },
  bubbleText: { color: '#E6E4F5', fontSize: 14, lineHeight: 21 },
  lowHint: { color: '#F0A040', fontSize: 11, marginTop: 5 },
  fixedHint: { color: '#7CE3A8', fontSize: 11, marginTop: 5 },
  editInput: { fontSize: 14, lineHeight: 21, color: colors.text, minHeight: 40 },
  saveBtn: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 6,
  },
  saveText: { color: '#fff', fontSize: 12 },
  keywordWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  keyword: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  keywordText: { color: '#fff', fontSize: 12 },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 18,
  },
  sideBtn: { alignItems: 'center', width: 80 },
  sideCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideText: { color: '#B9B6D6', fontSize: 12, marginTop: 4 },
  stopCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: colors.red,
    borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopSquare: { width: 22, height: 22, borderRadius: 4, backgroundColor: '#fff' },
});
