// 下方分頁列：首頁 / 客戶 / 🎙️錄音（中間大按鈕）/ 待辦 / 我的
// 中間的錄音鈕不是真的分頁：按下去會攔截，改成打開「選客戶」彈窗
import { Tabs, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../src/theme';

function TabIcon({ emoji }) {
  return <Text style={{ fontSize: 18 }}>{emoji}</Text>;
}

// 浮起來的圓形錄音鈕
function RecordButton() {
  return (
    <View style={styles.recordBtn}>
      <Text style={{ fontSize: 24 }}>🎙️</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subText,
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: '首頁', tabBarIcon: () => <TabIcon emoji="🏠" /> }} />
      <Tabs.Screen name="customers" options={{ title: '客戶', tabBarIcon: () => <TabIcon emoji="👥" /> }} />
      <Tabs.Screen
        name="record"
        options={{ title: '', tabBarLabel: () => null, tabBarIcon: () => <RecordButton /> }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault(); // 不要切到 record 分頁
            router.push('/record/pick'); // 改成打開選客戶彈窗
          },
        }}
      />
      <Tabs.Screen name="todos" options={{ title: '待辦', tabBarIcon: () => <TabIcon emoji="✅" /> }} />
      <Tabs.Screen name="profile" options={{ title: '我的', tabBarIcon: () => <TabIcon emoji="👤" /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  recordBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24, // 往上浮出分頁列
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6, // Android 的陰影
  },
});
