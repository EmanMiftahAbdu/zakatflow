import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    overview: '⊞',
    hawl: '◷',
    calculate: '✦',
    profile: '◉',
  };
  return (
    <View style={tabStyles.iconWrap}>
      {focused && <View style={tabStyles.activeDot} />}
      <Text style={[tabStyles.icon, focused && tabStyles.iconActive]}>
        {icons[name]}
      </Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap: { alignItems: 'center', paddingTop: 4 },
  icon: { fontSize: 18, color: Colors.ink20 },
  iconActive: { color: Colors.green500 },
  activeDot: { width: 20, height: 2, backgroundColor: Colors.green500, borderRadius: 1, marginBottom: 4 },
});

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopWidth: 0.5,
          borderTopColor: Colors.ink10,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
        tabBarActiveTintColor: Colors.green500,
        tabBarInactiveTintColor: Colors.ink40,
      }}
    >
      <Tabs.Screen
        name="overview"
        options={{
          title: 'Overview',
          tabBarIcon: ({ focused }) => <TabIcon name="overview" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="hawl"
        options={{
          title: 'Hawl',
          tabBarIcon: ({ focused }) => <TabIcon name="hawl" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="calculate"
        options={{
          title: 'Calculate',
          tabBarIcon: ({ focused }) => <TabIcon name="calculate" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
