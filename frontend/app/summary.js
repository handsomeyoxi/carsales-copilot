// AI 智慧摘要（一般頁面，一定帶某位客戶的 id 進來：/summary?id=c1）
// 三個分頁：購車需求（硬需求 Agent）／情緒價值（情緒價值 Agent）／成交分析（生命週期＋成交機率）
// 標籤驗證機制：每個標籤顯示 AI 信心值，業務員可「確認」或「修正」，系統統計標籤正確率
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import ProbabilityBar from '../src/components/ProbabilityBar';
import BackHeader from '../src/components/BackHeader';
import SectionTitle from '../src/components/SectionTitle';
import StageTracker from '../src/components/StageTracker';
import Tag from '../src/components/Tag';
import { useCustomers } from '../src/context/CustomerContext';
import { analysis } from '../src/data/mockData';
import { colors, radius } from '../src/theme';

const LOW = 0.75; // AI 信心低於 75% 的標籤標成「待確認」

const tabs = [
  { key: 'hard', label: '購車需求' },
  { key: 'emotion', label: '情緒價值' },
  { key: 'deal', label: '成交分析' },
];

// 一個可驗證的標籤列
function TagRow({ item, tone, review, onConfirm, onSave, isLast }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.value);
  const value = review?.value ?? item.value;
  const low = item.confidence < LOW;

  return (
    <View style={[styles.itemRow, !isLast && styles.divider]}>
      <View style={styles.itemTop}>
        <Tag label={item.label} tone={tone} style={{ width: 44, alignItems: 'center' }} />
        {editing ? (
          <TextInput style={styles.editInput} value={draft} onChangeText={setDraft} autoFocus />
        ) : (
          <Text style={styles.itemValue}>{value}</Text>
        )}
      </View>

      <View style={styles.itemBottom}>
        <Text style={[styles.conf, low && !review && { color: colors.orange }]}>
          AI 信心 {Math.round(item.confidence * 100)}%{low && !review ? ' · 待確認' : ''}
        </Text>

        {editing ? (
          <Pressable
            style={styles.smallBtnPrimary}
            onPress={() => {
              onSave(draft);
              setEditing(false);
            }}
          >
            <Text style={styles.smallBtnPrimaryText}>儲存</Text>
          </Pressable>
        ) : review ? (
          <Text style={styles.reviewed}>{review.status === 'edited' ? '✎ 已修正' : '✓ 已確認'}</Text>
        ) : (
          <View style={{ flexDirection: 'row' }}>
            <Pressable style={styles.smallBtn} onPress={onConfirm}>
              <Text style={styles.smallBtnText}>✓ 正確</Text>
            </Pressable>
            <Pressable style={styles.smallBtn} onPress={() => setEditing(true)}>
              <Text style={styles.smallBtnText}>✎ 修正</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

function AgentSection({ title, items, tone }) {
  const { tagReviews, reviewTag } = useCustomers();
  return (
    <View>
      <Text style={styles.agentTitle}>{title}</Text>
      <View style={styles.card}>
        {items.map((item, i) => (
          <TagRow
            key={item.id}
            item={item}
            tone={tone}
            review={tagReviews[item.id]}
            isLast={i === items.length - 1}
            onConfirm={() => reviewTag(item.id, 'confirmed', item.value)}
            onSave={(v) => reviewTag(item.id, v === item.value ? 'confirmed' : 'edited', v)}
          />
        ))}
      </View>
    </View>
  );
}

function DealSection({ data, customerId }) {
  const { lifecycle, probability, summary } = data;
  return (
    <View>
      <SectionTitle title="AI 對話摘要" />
      <View style={styles.card}>
        {summary.map((s) => (
          <Text key={s} style={styles.bullet}>
            • {s}
          </Text>
        ))}
      </View>

      <SectionTitle title="客戶生命週期" />
      <View style={styles.card}>
        <StageTracker stage={lifecycle.stage} />
        <Text style={styles.reason}>判斷理由：{lifecycle.reason}</Text>
        <Text style={styles.next}>👉 下一步：{lifecycle.nextAction}</Text>
      </View>

      <SectionTitle title={`成交機率（${probability.level}）`} />
      <View style={styles.card}>
        <ProbabilityBar value={probability.percentage} height={10} />
        <Text style={styles.signalTitle}>有利信號</Text>
        {probability.positive.map((s) => (
          <Text key={s} style={[styles.signal, { color: colors.green }]}>
            ＋ {s}
          </Text>
        ))}
        <Text style={styles.signalTitle}>風險信號</Text>
        {probability.risk.map((s) => (
          <Text key={s} style={[styles.signal, { color: colors.red }]}>
            － {s}
          </Text>
        ))}
        <View style={styles.suggestBox}>
          <Text style={styles.suggestText}>💡 {probability.suggestion}</Text>
        </View>
      </View>

      <Pressable
        style={styles.primaryBtn}
        onPress={() => router.push({ pathname: '/revisit', params: { id: customerId } })}
      >
        <Text style={styles.primaryText}>前往回訪軍師 →</Text>
      </Pressable>
    </View>
  );
}

export default function SummaryScreen() {
  const { id = 'c1' } = useLocalSearchParams();
  const { getCustomer, tagReviews } = useCustomers();
  const customer = getCustomer(id);
  const data = analysis[id];
  const [tab, setTab] = useState('hard');

  // 標籤驗證統計
  let total = 0;
  let reviewed = 0;
  let correct = 0;
  let pendingLow = 0;
  if (data) {
    [...data.hard, ...data.emotion].forEach((t) => {
      total += 1;
      const r = tagReviews[t.id];
      if (r) {
        reviewed += 1;
        if (r.status === 'confirmed') correct += 1;
      } else if (t.confidence < LOW) {
        pendingLow += 1;
      }
    });
  }
  const accuracy = reviewed ? Math.round((correct / reviewed) * 100) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <BackHeader
          title={`${customer ? customer.name : '新客戶'} · ${data ? '分析完成' : '尚未分析'}`}
          right={<Tag label="AI 摘要" tone="purple" />}
        />

        {!data ? (
          <Text style={styles.empty}>這位客戶還沒有錄音紀錄，按下方中間的 🎙️ 錄一段對話吧！</Text>
        ) : (
          <>
            <Text style={styles.meta}>
              {data.recordedAt} 錄音 · {data.duration} · 語音辨識信心 {data.asrConfidence}%
            </Text>

            {/* 標籤驗證進度 */}
            <View style={styles.verifyBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.verifyTitle}>
                  AI 標籤驗證 {reviewed} / {total}
                </Text>
                <Text style={styles.verifyText}>
                  {pendingLow > 0 ? `還有 ${pendingLow} 個低信心標籤待確認` : '低信心標籤都確認完了 👍'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.accNumber}>{accuracy === null ? '—' : `${accuracy}%`}</Text>
                <Text style={styles.verifyText}>標籤正確率</Text>
              </View>
            </View>

            <View style={styles.segment}>
              {tabs.map((t) => (
                <Pressable
                  key={t.key}
                  style={[styles.segBtn, tab === t.key && styles.segActive]}
                  onPress={() => setTab(t.key)}
                >
                  <Text style={[styles.segText, tab === t.key && styles.segTextActive]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>

            {tab === 'hard' && <AgentSection title="硬需求 AGENT" items={data.hard} tone="green" />}
            {tab === 'emotion' && <AgentSection title="情緒價值 AGENT" items={data.emotion} tone="pink" />}
            {tab === 'deal' && <DealSection data={data} customerId={id} />}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20 },
  empty: { color: colors.subText, fontSize: 14, marginTop: 20 },
  meta: { fontSize: 12, color: colors.subText, marginTop: -8, marginBottom: 12 },
  verifyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 12,
  },
  verifyTitle: { fontSize: 14, fontWeight: '600', color: colors.primary },
  verifyText: { fontSize: 12, color: colors.subText, marginTop: 2 },
  accNumber: { fontSize: 20, fontWeight: '600', color: colors.primary },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 3,
    marginBottom: 16,
  },
  segBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  segActive: { backgroundColor: colors.blueLight },
  segText: { fontSize: 14, color: colors.subText },
  segTextActive: { color: colors.text, fontWeight: '600' },
  agentTitle: { fontSize: 12, color: colors.subText, letterSpacing: 1, marginBottom: 8 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 4 },
  itemRow: { paddingVertical: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  itemTop: { flexDirection: 'row', alignItems: 'center' },
  itemValue: { fontSize: 14, color: colors.text, marginLeft: 12, flex: 1 },
  editInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: '#fff',
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  itemBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingLeft: 56,
  },
  conf: { fontSize: 11, color: colors.subText },
  reviewed: { fontSize: 12, color: colors.green },
  smallBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 6,
  },
  smallBtnText: { fontSize: 12, color: colors.text },
  smallBtnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  smallBtnPrimaryText: { fontSize: 12, color: '#fff' },
  bullet: { fontSize: 14, color: colors.text, lineHeight: 22, paddingVertical: 2 },
  reason: { fontSize: 13, color: colors.subText, marginTop: 12 },
  next: { fontSize: 13, color: colors.text, marginTop: 6, marginBottom: 6 },
  signalTitle: { fontSize: 12, color: colors.subText, marginTop: 12, marginBottom: 2 },
  signal: { fontSize: 13, lineHeight: 20 },
  suggestBox: { backgroundColor: '#fff', borderRadius: radius.sm, padding: 10, marginTop: 12, marginBottom: 8 },
  suggestText: { fontSize: 13, color: colors.text, lineHeight: 20 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
