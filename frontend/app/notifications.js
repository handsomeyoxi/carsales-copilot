// 通知設定：每種提醒可以個別開關，並選擇每天提醒的時間
// 目前只存設定；之後用 expo-notifications 依這些設定排程推播
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackHeader from '../src/components/BackHeader';
import Chip from '../src/components/Chip';
import SectionTitle from '../src/components/SectionTitle';
import { useCustomers } from '../src/context/CustomerContext';
import { colors, radius } from '../src/theme';

const items = [
  { key: 'followUp', icon: '🔔', title: '回訪提醒', desc: '每天推播今天要回訪的客戶與建議話術' },
  { key: 'todoDue', icon: '✅', title: '待辦到期', desc: '待辦事項到期當天提醒' },
  { key: 'analysisDone', icon: '🧠', title: 'AI 分析完成', desc: '錄音分析好時通知你查看摘要' },
  { key: 'lowConfidence', icon: '⚠️', title: '標籤待確認', desc: 'AI 有低信心標籤需要你確認時提醒' },
];
const times = ['08:30', '09:00', '10:00', '12:00'];

function ToggleRow({ icon, title, desc, value, onChange }) {
  return (
    <Pressable style={styles.row} onPress={() => onChange(!value)}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.desc}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#fff"
      />
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const { notify, updateNotify } = useCustomers();
  const enabledCount = items.filter((i) => notify[i.key]).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <BackHeader title="通知設定" />
        <Text style={styles.summary}>已開啟 {enabledCount} / {items.length} 種提醒</Text>

        <SectionTitle title="提醒類型" />
        {items.map((i) => (
          <ToggleRow
            key={i.key}
            icon={i.icon}
            title={i.title}
            desc={i.desc}
            value={notify[i.key]}
            onChange={(v) => updateNotify({ [i.key]: v })}
          />
        ))}

        <SectionTitle title="每天提醒時間" />
        <View style={styles.chipRow}>
          {times.map((t) => (
            <Chip key={t} label={t} selected={notify.time === t} onPress={() => updateNotify({ time: t })} />
          ))}
        </View>
        <Text style={styles.hint}>回訪提醒會在每天 {notify.time} 推播</Text>

        <SectionTitle title="勿擾" />
        <ToggleRow
          icon="🌙"
          title="勿擾時段"
          desc="21:00–08:00 不發送任何通知"
          value={notify.quietHours}
          onChange={(v) => updateNotify({ quietHours: v })}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 32 },
  summary: { fontSize: 13, color: colors.subText, marginTop: -8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
  },
  icon: { fontSize: 18, marginRight: 12 },
  title: { fontSize: 15, color: colors.text, fontWeight: '600' },
  desc: { fontSize: 12, color: colors.subText, marginTop: 2 },
  chipRow: { flexDirection: 'row' },
  hint: { fontSize: 12, color: colors.subText, marginTop: 8 },
});
