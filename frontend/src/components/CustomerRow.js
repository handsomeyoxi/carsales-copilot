// 客戶名單的一列：頭像、姓名、階段、備註、成交機率、狀態＋溫度標籤
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import CustomerTags from './CustomerTags';
import ProbabilityBar from './ProbabilityBar';
import { colors, radius } from '../theme';

const avatarBg = { hot: colors.redLight, warm: colors.orangeLight, cold: colors.blueLight };

export default function CustomerRow({ customer }) {
  return (
    <Pressable style={styles.row} onPress={() => router.push(`/customer/${customer.id}`)}>
      <View style={[styles.avatar, { backgroundColor: avatarBg[customer.temperature] }]}>
        <Text style={styles.avatarText}>{customer.name[0]}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{customer.name}</Text>
          <CustomerTags customer={customer} style={{ marginLeft: 8 }} />
        </View>
        <Text style={styles.note}>
          {customer.interestedCar} · {customer.note}
        </Text>
        <View style={{ marginTop: 6 }}>
          <ProbabilityBar value={customer.closeProbability} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginTop: 8,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, color: colors.text },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  note: { fontSize: 12, color: colors.subText, marginTop: 3 },
});
