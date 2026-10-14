// ⑦ 個人資料：業務員資訊、使用教學、隱私授權紀錄、專有名詞詞庫、CRM 串接、登出
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import ScreenHeader from '../../src/components/ScreenHeader';
import Tag from '../../src/components/Tag';
import { useCustomers } from '../../src/context/CustomerContext';
import { colors, radius } from '../../src/theme';

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.icon}>{icon}</Text>
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function SettingRow({ icon, label, detail, onPress }) {
  return (
    <Pressable style={styles.settingRow} onPress={onPress}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.settingLabel}>{label}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { consents, vocabulary, crm, profile: salesperson } = useCustomers();
  const activeConsents = consents.filter((c) => c.status === 'active').length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader
          title="個人資料"
          right={
            <Pressable onPress={() => router.push('/profile-edit')} hitSlop={10}>
              <Text style={styles.edit}>編輯</Text>
            </Pressable>
          }
        />

        <View style={styles.profileBox}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{salesperson.name[0]}</Text>
          </View>
          <Text style={styles.name}>{salesperson.name}</Text>
          <Text style={styles.title}>{salesperson.title}</Text>
          <Tag
            label={`本月成交 ${salesperson.dealsThisMonth} 輛`}
            tone="green"
            style={{ alignSelf: 'center', marginTop: 8 }}
          />
        </View>

        <Text style={styles.sectionTitle}>帳號資訊</Text>
        <InfoRow icon="✉️" label="Email" value={salesperson.email} />
        <InfoRow icon="📱" label="手機" value={salesperson.phone} />

        <Text style={styles.sectionTitle}>上手與隱私</Text>
        <SettingRow icon="📖" label="使用教學" onPress={() => router.push({ pathname: '/onboarding', params: { replay: '1' } })} />
        <SettingRow icon="🔒" label="隱私與授權紀錄" detail={`${activeConsents} 筆`} onPress={() => router.push('/privacy')} />
        <SettingRow icon="📄" label="服務條款與隱私權政策" onPress={() => router.push('/terms')} />

        <Text style={styles.sectionTitle}>AI 與系統整合</Text>
        <SettingRow icon="🗣️" label="汽車專有名詞詞庫" detail={`${vocabulary.length} 個`} onPress={() => router.push('/vocabulary')} />
        <SettingRow icon="🔗" label="CRM 串接" detail={crm.system} onPress={() => router.push('/crm')} />
        <SettingRow icon="🔔" label="通知設定" onPress={() => router.push('/notifications')} />

        <Pressable style={styles.logoutBtn} onPress={() => router.replace('/')}>
          <Text style={styles.logoutText}>登出</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20 },
  edit: { color: colors.primary, fontSize: 14 },
  profileBox: {
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24, color: colors.primary },
  name: { fontSize: 18, fontWeight: '600', marginTop: 10, color: colors.text },
  title: { fontSize: 13, color: colors.subText, marginTop: 2 },
  sectionTitle: { fontSize: 12, color: colors.subText, marginTop: 8, marginBottom: 8 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
  },
  icon: { fontSize: 16, marginRight: 12 },
  infoLabel: { fontSize: 11, color: colors.subText },
  infoValue: { fontSize: 14, color: colors.text },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 8,
  },
  settingLabel: { flex: 1, fontSize: 14, color: colors.text },
  detail: { fontSize: 12, color: colors.subText, marginRight: 6 },
  chevron: { fontSize: 18, color: colors.placeholder },
  logoutBtn: {
    backgroundColor: colors.redLight,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutText: { color: colors.red, fontSize: 15 },
});
