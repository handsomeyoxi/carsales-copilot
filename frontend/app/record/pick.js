// 錄音流程 ①：選客戶（從畫面下方彈出的選單）
// 今天要回訪的客戶排最前面，並標示是否已授權錄音
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Tag from '../../src/components/Tag';
import { useCustomers } from '../../src/context/CustomerContext';
import { followUps } from '../../src/data/mockData';
import { goRecord } from '../../src/utils/recording';
import { colors, radius } from '../../src/theme';

export default function PickCustomerSheet() {
  const ctx = useCustomers();
  const { customers, hasConsent } = ctx;
  const [selected, setSelected] = useState(null);
  const [keyword, setKeyword] = useState('');

  // 有回訪提醒的客戶排前面，其他依成交機率
  const followIds = followUps.map((f) => f.customerId);
  const list = [...customers]
    .filter((c) => !keyword || c.name.includes(keyword))
    .sort((a, b) => {
      const fa = followIds.indexOf(a.id);
      const fb = followIds.indexOf(b.id);
      if (fa !== -1 || fb !== -1) return (fa === -1 ? 99 : fa) - (fb === -1 ? 99 : fb);
      return b.closeProbability - a.closeProbability;
    });

  function next() {
    if (!selected) return;
    goRecord(ctx, selected, { replace: true });
  }

  return (
    <View style={styles.overlay}>
      {/* 點上方暗色區域 = 關閉 */}
      <Pressable style={{ flex: 1 }} onPress={() => router.back()} />

      <View style={styles.sheet}>
        <View style={styles.grab} />
        <Text style={styles.title}>這次接待誰？</Text>
        <Text style={styles.sub}>今天要回訪的客戶排最前面</Text>

        <TextInput
          style={styles.search}
          placeholder="🔍 搜尋客戶"
          placeholderTextColor={colors.placeholder}
          value={keyword}
          onChangeText={setKeyword}
        />

        <ScrollView style={{ maxHeight: 280 }}>
          {list.map((c) => {
            const f = followUps.find((x) => x.customerId === c.id);
            const ok = hasConsent(c.id);
            return (
              <Pressable
                key={c.id}
                style={[styles.option, selected === c.id && styles.optionOn]}
                onPress={() => setSelected(c.id)}
              >
                <Text style={styles.optIcon}>{f ? '📅' : '👤'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optName}>{c.name}</Text>
                  <Text style={styles.optMeta}>{f ? `${f.when}回訪 · ${c.stage}` : `${c.stage} · ${c.interestedCar || ''}`}</Text>
                </View>
                <Tag label={ok ? '已授權' : '未授權'} tone={ok ? 'green' : 'warm'} />
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable style={[styles.option, selected === 'new' && styles.optionOn]} onPress={() => setSelected('new')}>
          <Text style={styles.optIcon}>＋</Text>
          <Text style={styles.optName}>新客戶（錄完 AI 幫你建檔）</Text>
        </Pressable>

        <Pressable style={[styles.btn, !selected && { opacity: 0.4 }]} disabled={!selected} onPress={next}>
          <Text style={styles.btnText}>{selected && selected !== 'new' && hasConsent(selected) ? '開始錄音' : '下一步'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    paddingBottom: 34,
  },
  grab: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  sub: { fontSize: 12, color: colors.subText, marginTop: 2, marginBottom: 10 },
  search: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.card,
    padding: 10,
    marginBottom: 7,
  },
  optionOn: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  optIcon: { fontSize: 16, marginRight: 10, width: 22, textAlign: 'center' },
  optName: { fontSize: 14, fontWeight: '600', color: colors.text },
  optMeta: { fontSize: 12, color: colors.subText, marginTop: 2 },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
