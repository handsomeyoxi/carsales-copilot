// 錄音流程 ④：AI 分析進度
// 一步一步顯示分析到哪裡，完成後進入這位客戶的 AI 摘要
// 芷璇改：真的錄音（live=1）→ 等上傳完 → finalize 整理逐字稿 → 同時呼叫兩個 AI 分析 → reload → 看 AI 摘要
// 哪一步失敗就顯示原因，按「重試」只會重做還沒成功的步驟
// 模擬錄音（手機 App、新客戶、沒連後端）還是用計時器假裝進度
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useCustomers } from '../../src/context/CustomerContext';
import * as api from '../../src/api';
import { analysis } from '../../src/data/mockData';
import { clearRecorder, getRecorder } from '../../src/utils/recorder';
import { colors, radius } from '../../src/theme';

const steps = ['語音轉文字', '硬需求 Agent', '情緒價值 Agent', '成交機率與生命週期', '產生待辦與回訪提醒'];

// 真的分析的步驟（key 對應下面 runReal 的每一步）
const REAL_STEPS = [
  { key: 'upload', label: '上傳最後一段錄音' },
  { key: 'finalize', label: '整理逐字稿（分出業務／客戶）' },
  { key: 'analyzeInsight', label: 'AI 分析需求與情緒標籤' },
  { key: 'analyzeAfterConversation', label: 'AI 成交分析、待辦與回訪' },
  { key: 'reload', label: '更新客戶資料' },
];

export default function AnalyzingScreen() {
  const { id, seconds = '0', live } = useLocalSearchParams();
  const { getCustomer, dataSource, reload } = useCustomers();
  const [done, setDone] = useState(0); // 已完成幾步（模擬用）
  const customer = getCustomer(id);
  const isNew = id === 'new';
  const isReal = live === '1';

  // ---- 真的分析 ----
  // stepState：{ upload: 'now' | 'done' | 'error', … }；沒寫的就是還沒開始
  const [stepState, setStepState] = useState({});
  const [error, setError] = useState('');
  const progress = useRef({}); // 已經成功的步驟和結果，重試時跳過
  const running = useRef(false);
  const mark = (key, state) => setStepState((prev) => ({ ...prev, [key]: state }));

  async function runReal() {
    if (running.current) return;
    running.current = true;
    setError('');
    const p = progress.current;
    try {
      // 1. 停掉最後一段，等所有段落都上傳完（失敗的會重送）
      if (!p.info) {
        const rec = getRecorder();
        if (!rec) throw new Error('找不到這次的錄音，請回到客戶頁重新錄一次');
        mark('upload', 'now');
        p.info = await rec.stop().catch((e) => {
          mark('upload', 'error');
          throw e;
        });
        mark('upload', 'done');
      }
      const { conversationId, totalSegments, durationSec } = p.info;

      // 2. 整理逐字稿
      if (!p.finalized) {
        mark('finalize', 'now');
        await api.finishRecording(conversationId, { totalSegments, durationSec }).catch((e) => {
          mark('finalize', 'error');
          throw e;
        });
        p.finalized = true;
        mark('finalize', 'done');
      }

      // 3. 兩個 AI 分析同時跑（10～60 秒），只重試失敗的那個
      const todo = api.ANALYZE_APIS.filter((name) => !p[name]);
      todo.forEach((name) => mark(name, 'now'));
      const results = await Promise.allSettled(todo.map((name) => api.analyzeRecording(conversationId, name)));
      const failed = [];
      results.forEach((r, i) => {
        const name = todo[i];
        if (r.status === 'fulfilled') {
          p[name] = true;
          mark(name, 'done');
        } else {
          mark(name, 'error');
          failed.push(r.reason && r.reason.message);
        }
      });
      if (failed.length > 0) throw new Error(`AI 分析失敗：${failed.join('；')}`);

      // 4. 重新載入客戶資料，AI 摘要頁才看得到新的標籤
      mark('reload', 'now');
      await reload();
      mark('reload', 'done');
      clearRecorder(); // 這次錄音完成，釋放掉
    } catch (e) {
      setError(e.message || '分析失敗');
    } finally {
      running.current = false;
    }
  }

  useEffect(() => {
    if (isReal) runReal();
  }, []);

  const realFinished = REAL_STEPS.every((s) => stepState[s.key] === 'done');
  const finished = isReal ? realFinished : done >= steps.length;
  // 低信心標籤：真的分析用後端資料（toAnalysis），模擬用 mockData
  const data = isReal || dataSource === 'api' ? api.toAnalysis(customer) : analysis[id];
  const lowTags = data ? [...data.hard, ...data.emotion].filter((t) => t.confidence < 0.75 && !t.review).length : 0;

  // 模擬：每 0.8 秒完成一步
  useEffect(() => {
    if (isReal || finished) return;
    const t = setTimeout(() => setDone((d) => d + 1), 800);
    return () => clearTimeout(t);
  }, [done, finished]);

  const mins = Math.floor(Number(seconds) / 60);
  const secs = Number(seconds) % 60;

  function goNext() {
    if (isNew) router.replace('/add-customer'); // 新客戶 → AI 預填好的建檔頁
    else router.replace({ pathname: '/summary', params: { id } });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.icon}>{finished ? '✅' : '🧠'}</Text>
        <Text style={styles.title}>{finished ? '分析完成！' : error ? '分析中斷' : 'AI 分析中…'}</Text>
        <Text style={styles.sub}>
          {customer ? customer.name : '新客戶'} · 錄音 {mins} 分 {secs} 秒
        </Text>
        {isReal && !finished && !error && <Text style={styles.sub}>AI 分析大約需要 10～60 秒，請稍候</Text>}

        {isReal ? (
          <View style={styles.card}>
            {REAL_STEPS.map((s, i) => {
              const state = stepState[s.key] || 'wait';
              const icon = { done: '✓', now: '…', error: '!', wait: String(i + 1) }[state];
              return (
                <View key={s.key} style={styles.step}>
                  <View style={[styles.dot, styles[state]]}>
                    <Text style={styles.dotText}>{icon}</Text>
                  </View>
                  <Text style={[styles.stepText, state === 'wait' && { color: colors.placeholder }]}>{s.label}</Text>
                </View>
              );
            })}
          </View>
        ) : (
        <View style={styles.card}>
          {steps.map((s, i) => {
            const state = i < done ? 'done' : i === done ? 'now' : 'wait';
            return (
              <View key={s} style={styles.step}>
                <View style={[styles.dot, styles[state]]}>
                  <Text style={styles.dotText}>{state === 'done' ? '✓' : state === 'now' ? '…' : i + 1}</Text>
                </View>
                <Text style={[styles.stepText, state === 'wait' && { color: colors.placeholder }]}>{s}</Text>
              </View>
            );
          })}
        </View>
        )}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={runReal}>
              <Text style={styles.btnText}>重試</Text>
            </Pressable>
          </View>
        ) : null}

        {finished && !isNew && lowTags > 0 && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>有 {lowTags} 個低信心標籤需要你確認</Text>
          </View>
        )}
        {finished && isNew && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>AI 已從對話預填客戶資料，請確認後建檔</Text>
          </View>
        )}

        <Pressable style={[styles.btn, !finished && { opacity: 0.4 }]} disabled={!finished} onPress={goNext}>
          <Text style={styles.btnText}>{isNew ? '確認並建立客戶' : '查看 AI 摘要'}</Text>
        </Pressable>
        {!finished && (
          <Pressable onPress={() => router.replace('/home')}>
            <Text style={styles.later}>{isReal ? '先回首頁，分析會在背景繼續' : '先回首頁，分析好會通知你 🔔'}</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  icon: { fontSize: 52, textAlign: 'center' },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', color: colors.text, marginTop: 8 },
  sub: { fontSize: 13, color: colors.subText, textAlign: 'center', marginTop: 4 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginTop: 22 },
  step: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  done: { backgroundColor: colors.green },
  now: { backgroundColor: colors.primary },
  wait: { backgroundColor: colors.border },
  error: { backgroundColor: colors.red },
  errorBox: { backgroundColor: colors.redLight, borderRadius: radius.md, padding: 12, marginTop: 14 },
  errorText: { color: colors.red, fontSize: 13, lineHeight: 19 },
  retryBtn: { backgroundColor: colors.red, borderRadius: radius.sm, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  dotText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepText: { fontSize: 15, color: colors.text },
  notice: { backgroundColor: colors.orangeLight, borderRadius: radius.md, padding: 12, marginTop: 14 },
  noticeText: { color: colors.orange, fontSize: 13 },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  later: { color: colors.subText, fontSize: 13, textAlign: 'center', marginTop: 14 },
});
