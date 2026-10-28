// 客戶詳情的「單一格子」內容頁：從客戶詳情的四格點進來
// /customer-section?id=c1&s=basic|needs|deal|next
// ① 基本資料 ② 客戶需求（＋推薦自家品牌車款）③ AI 成交機率分析（＋原因＋競品比較）④ 後續處理（回訪、待辦）
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import BackHeader from '../src/components/BackHeader';
import Chip from '../src/components/Chip';
import CustomerTags from '../src/components/CustomerTags';
import ProbabilityBar from '../src/components/ProbabilityBar';
import StageTracker from '../src/components/StageTracker';
import TodoItem from '../src/components/TodoItem';
import { useCustomers } from '../src/context/CustomerContext';
import { brandOf } from '../src/data/cars';
import { followUps, interactions, STATUSES } from '../src/data/mockData';
import { colors, radius } from '../src/theme';
import { dayLabel } from '../src/utils/date';
import { compareWithRival, dealAnalysis, recommendCars } from '../src/utils/insights';
import { goRecord } from '../src/utils/recording';

export const SECTIONS = [
  { key: 'basic', no: '①', icon: '👤', label: '基本資料' },
  { key: 'needs', no: '②', icon: '🚗', label: '客戶需求' },
  { key: 'deal', no: '③', icon: '📈', label: '成交機率' },
  { key: 'next', no: '④', icon: '🗓️', label: '後續處理' },
];
const temps = [
  { key: 'hot', label: '熱', color: colors.red, bg: colors.redLight },
  { key: 'warm', label: '溫', color: colors.orange, bg: colors.orangeLight },
  { key: 'cold', label: '冷', color: colors.blue, bg: colors.blueLight },
];

function Section({ children }) {
  return <View style={styles.section}>{children}</View>;
}

// 區塊右上角的「編輯」鈕
function EditButton({ onPress }) {
  return (
    <Pressable style={styles.editBtn} onPress={onPress} hitSlop={8}>
      <Text style={styles.editText}>✏️ 編輯</Text>
    </Pressable>
  );
}

function InfoLine({ label, value }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

export default function CustomerSectionScreen() {
  const { id, s: current = 'basic' } = useLocalSearchParams();
  const ctx = useCustomers();
  const { getCustomer, updateCustomer, todos, toggleTodo, consents, profile } = ctx;
  const customer = getCustomer(id);

  if (!customer) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <BackHeader title="找不到客戶" />
        </View>
      </SafeAreaView>
    );
  }

  const brand = profile.brand || 'BMW';
  const needs = customer.needs || {};
  const recs = recommendCars(customer, brand);
  const deal = dealAnalysis(customer);
  const cmp = compareWithRival(customer, brand);
  const myTodos = todos.filter((t) => t.customerId === id);
  const nextFollow = followUps.find((f) => f.customerId === id);
  const myConsent = consents.find((c) => c.customerId === id && c.status === 'active');
  const history = interactions[id] || [];

  const sec = SECTIONS.find((x) => x.key === current) || SECTIONS[0];
  const edit = (part) => router.push({ pathname: '/customer-edit', params: { id, part } });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <BackHeader title={`${customer.name}・${sec.label}`} right={<CustomerTags customer={customer} />} />
        {/* 四個格子的切換，不用回上一頁也能換 */}
        <View style={styles.jumpRow}>
          {SECTIONS.map((x) => (
            <Pressable
              key={x.key}
              style={[styles.jumpBtn, x.key === sec.key && styles.jumpOn]}
              onPress={() => router.setParams({ s: x.key })}
            >
              <Text style={[styles.jumpText, x.key === sec.key && { color: '#fff' }]}>
                {x.icon} {x.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* ① 基本資料 */}
        {sec.key === 'basic' && (
        <Section>
          <EditButton onPress={() => edit('basic')} />
          <InfoLine label="電話" value={customer.phone} />
          <InfoLine label="來源" value={customer.source} />
          <InfoLine label="備註" value={customer.note} />
          <InfoLine label="上次聯絡" value={customer.lastContactDays ? `${customer.lastContactDays} 天前` : '今天'} />
          <InfoLine label="錄音授權" value={myConsent ? `已同意（${myConsent.time.slice(5, 10)}）` : '尚未取得'} />

          <Text style={styles.subLabel}>客戶狀態</Text>
          <View style={styles.wrap}>
            {STATUSES.map((s) => (
              <Chip key={s.key} label={s.label} selected={customer.status === s.key} onPress={() => updateCustomer(id, { status: s.key })} />
            ))}
          </View>
          <Text style={styles.subLabel}>購買意願</Text>
          <View style={styles.wrap}>
            {temps.map((t) => (
              <Chip
                key={t.key}
                label={t.label}
                selected={customer.temperature === t.key}
                selectedColor={t.color}
                selectedBg={t.bg}
                onPress={() => updateCustomer(id, { temperature: t.key })}
              />
            ))}
          </View>

          {history.length > 0 && <Text style={styles.subLabel}>互動紀錄</Text>}
          {history.map((h) => (
            <Text key={h.id} style={styles.history}>
              • {h.date} {h.type}：{h.text}
            </Text>
          ))}
        </Section>
        )}

        {/* ② 客戶需求 */}
        {sec.key === 'needs' && (
        <Section>
          <EditButton onPress={() => edit('needs')} />
          <Text style={styles.subLabel}>來看的車</Text>
          <View style={styles.wrap}>
            {(needs.lookingAt || []).map((car) => {
              const ours = brandOf(car) === brand;
              return (
                <View key={car} style={[styles.carChip, ours ? styles.carOurs : styles.carOther]}>
                  <Text style={[styles.carChipText, { color: ours ? colors.primary : colors.subText }]}>
                    {car}
                    {ours ? '' : '（他牌）'}
                  </Text>
                </View>
              );
            })}
          </View>
          <InfoLine label="預算" value={needs.budget} />
          <InfoLine label="車型" value={needs.type} />
          <InfoLine label="用途" value={needs.usage} />
          <View style={[styles.wrap, { marginTop: 6 }]}>
            {(needs.features || []).map((f) => (
              <View key={f} style={styles.feature}>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.subLabel}>💡 推薦 {brand} 車款</Text>
          {recs.map((r, i) => (
            <View key={r.id} style={[styles.recCard, i === 0 && styles.recBest]}>
              <View style={styles.recTop}>
                <Text style={styles.recIcon}>{r.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recName}>
                    {r.name}
                    {i === 0 ? '  ⭐ 最推薦' : ''}
                  </Text>
                  <Text style={styles.recPrice}>示範價格 {r.priceFrom} 萬起</Text>
                </View>
              </View>
              {r.reasons.map((reason) => (
                <Text key={reason} style={styles.recReason}>
                  ✓ {reason}
                </Text>
              ))}
              {r.overBudget && <Text style={styles.recWarn}>⚠️ 超出客戶預算，可搭配分期或低利方案</Text>}
            </View>
          ))}
          {recs.length === 0 && <Text style={styles.empty}>{brand} 的車款資料準備中，之後由後端提供</Text>}
        </Section>
        )}

        {/* ③ AI 成交機率分析 */}
        {sec.key === 'deal' && (
        <Section>
          <View style={styles.probRow}>
            <Text style={styles.probNum}>{deal.percentage}%</Text>
            <Text style={styles.probLevel}>成交機率{deal.level}</Text>
          </View>
          <ProbabilityBar value={deal.percentage} height={10} showLabel={false} />
          <View style={{ marginTop: 14 }}>
            <StageTracker stage={deal.stage} />
          </View>

          <Text style={styles.subLabel}>為什麼這樣分析</Text>
          <Text style={styles.why}>{deal.why}</Text>
          {deal.positive.map((s) => (
            <Text key={s} style={[styles.signal, { color: colors.green }]}>
              ＋ {s}
            </Text>
          ))}
          {deal.risk.map((s) => (
            <Text key={s} style={[styles.signal, { color: colors.red }]}>
              － {s}
            </Text>
          ))}

          {cmp && (
            <>
              <Text style={styles.subLabel}>⚔️ 自家 vs 競品</Text>
              <View style={styles.cmpRow}>
                <View style={[styles.cmpCol, styles.cmpOurs]}>
                  <Text style={styles.cmpName}>{cmp.ours.name}</Text>
                  {cmp.ourStrengths.map((s) => (
                    <Text key={s} style={styles.cmpItem}>
                      ＋ {s}
                    </Text>
                  ))}
                </View>
                <View style={[styles.cmpCol, styles.cmpTheirs]}>
                  <Text style={[styles.cmpName, { color: colors.subText }]}>{cmp.rivalName}</Text>
                  {cmp.theirStrengths.map((s) => (
                    <Text key={s} style={[styles.cmpItem, { color: colors.subText }]}>
                      ＋ {s}
                    </Text>
                  ))}
                </View>
              </View>
              <View style={styles.pitch}>
                <Text style={styles.pitchText}>🗣️ 建議說法：「{cmp.pitch}」</Text>
              </View>
            </>
          )}
          <Text style={styles.note}>示範內容，正式版由 AI 依對話與原廠規格產生</Text>
        </Section>
        )}

        {/* ④ 後續處理 */}
        {sec.key === 'next' && (
        <Section>
          {nextFollow ? (
            <Pressable style={styles.follow} onPress={() => router.push({ pathname: '/revisit', params: { id } })}>
              <Text style={styles.followTitle}>🔔 {dayLabel(nextFollow.date)}回訪</Text>
              <Text style={styles.followReason}>{nextFollow.reason}</Text>
              <Text style={styles.followLink}>看回訪話術 ›</Text>
            </Pressable>
          ) : (
            <Text style={styles.empty}>還沒有排定回訪</Text>
          )}

          <Text style={styles.subLabel}>待辦（{myTodos.filter((t) => !t.done).length}）</Text>
          {myTodos.map((t) => (
            <TodoItem key={t.id} todo={t} onToggle={() => toggleTodo(t.id)} />
          ))}

          <View style={styles.actionRow}>
            <Pressable style={styles.actionBtn} onPress={() => router.push({ pathname: '/todo-add', params: { customerId: id } })}>
              <Text style={styles.actionText}>＋ 新增待辦</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={() => goRecord(ctx, id)}>
              <Text style={styles.actionText}>🎙️ 錄音</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={() => router.push({ pathname: '/summary', params: { id } })}>
              <Text style={styles.actionText}>🧠 AI 摘要</Text>
            </Pressable>
          </View>
        </Section>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: { paddingHorizontal: 20, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  jumpRow: { flexDirection: 'row', marginBottom: 10 },
  jumpBtn: { flex: 1, paddingVertical: 7, marginHorizontal: 2, borderRadius: radius.sm, backgroundColor: colors.primaryLight, alignItems: 'center' },
  jumpOn: { backgroundColor: colors.primary },
  jumpText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  container: { padding: 20, paddingBottom: 40 },
  editBtn: { alignSelf: 'flex-end', backgroundColor: '#fff', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 4, borderWidth: 1, borderColor: colors.border },
  editText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  section: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 8 },
  subLabel: { fontSize: 13, fontWeight: '600', color: colors.subText, marginTop: 14, marginBottom: 6 },
  infoLine: { flexDirection: 'row', paddingVertical: 4 },
  infoLabel: { width: 72, fontSize: 13, color: colors.subText },
  infoValue: { flex: 1, fontSize: 14, color: colors.text },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  history: { fontSize: 13, color: colors.text, lineHeight: 20 },
  carChip: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5, marginRight: 6, marginBottom: 6, borderWidth: 1 },
  carOurs: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  carOther: { backgroundColor: '#fff', borderColor: colors.border },
  carChipText: { fontSize: 13, fontWeight: '600' },
  feature: { backgroundColor: '#fff', borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, marginBottom: 6 },
  featureText: { fontSize: 12, color: colors.text },
  recCard: { backgroundColor: '#fff', borderRadius: radius.md, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  recBest: { borderColor: colors.primary, borderWidth: 2 },
  recTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  recIcon: { fontSize: 26, marginRight: 10 },
  recName: { fontSize: 15, fontWeight: '700', color: colors.text },
  recPrice: { fontSize: 12, color: colors.subText },
  recReason: { fontSize: 13, color: colors.green, lineHeight: 20 },
  recWarn: { fontSize: 12, color: colors.orange, marginTop: 4 },
  probRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 },
  probNum: { fontSize: 40, fontWeight: '700', color: colors.text },
  probLevel: { fontSize: 15, color: colors.subText, marginLeft: 10 },
  why: { fontSize: 14, color: colors.text, lineHeight: 22, marginBottom: 6 },
  signal: { fontSize: 13, lineHeight: 21 },
  cmpRow: { flexDirection: 'row' },
  cmpCol: { flex: 1, borderRadius: radius.md, padding: 10 },
  cmpOurs: { backgroundColor: colors.primaryLight, marginRight: 6 },
  cmpTheirs: { backgroundColor: '#fff' },
  cmpName: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  cmpItem: { fontSize: 12, color: colors.text, lineHeight: 19 },
  pitch: { backgroundColor: '#fff', borderRadius: radius.md, padding: 10, marginTop: 8 },
  pitchText: { fontSize: 13, color: colors.text, lineHeight: 20 },
  note: { fontSize: 11, color: colors.placeholder, marginTop: 8 },
  follow: { backgroundColor: colors.orangeLight, borderRadius: radius.md, padding: 12 },
  followTitle: { fontSize: 14, fontWeight: '700', color: colors.orange },
  followReason: { fontSize: 13, color: colors.text, marginTop: 3 },
  followLink: { fontSize: 12, color: colors.orange, marginTop: 4, textAlign: 'right' },
  empty: { fontSize: 13, color: colors.subText },
  actionRow: { flexDirection: 'row', marginTop: 8 },
  actionBtn: { flex: 1, backgroundColor: '#fff', borderRadius: radius.md, paddingVertical: 11, alignItems: 'center', marginHorizontal: 3, borderWidth: 1, borderColor: colors.border },
  actionText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
});
