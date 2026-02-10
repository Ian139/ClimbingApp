import { Tabs } from 'expo-router';
import { View } from 'react-native';

function TabIcon({ icon, color }: { icon: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {icon === 'routes' && (
        <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginBottom: 2 }} />
          <View style={{ flexDirection: 'row', gap: 2 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
          </View>
        </View>
      )}
      {icon === 'editor' && (
        <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 16, height: 16, borderWidth: 2, borderColor: color, borderRadius: 4 }}>
            <View style={{ position: 'absolute', top: 3, left: 3, width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />
          </View>
        </View>
      )}
      {icon === 'profile' && (
        <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: color, marginBottom: 1 }} />
          <View style={{ width: 14, height: 6, borderTopLeftRadius: 7, borderTopRightRadius: 7, borderWidth: 2, borderColor: color, borderBottomWidth: 0 }} />
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#8b6f47',    // primary warm brown
        tabBarInactiveTintColor: '#8b7668',  // muted foreground
        tabBarStyle: {
          backgroundColor: '#fffbf7',         // card
          borderTopWidth: 0.5,
          borderTopColor: '#e6ddd0',          // border
          paddingTop: 4,
        },
        headerStyle: {
          backgroundColor: '#fffbf7',         // card
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
          color: '#3d2817',                   // foreground
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Routes',
          tabBarIcon: ({ color }) => <TabIcon icon="routes" color={color} />,
        }}
      />
      <Tabs.Screen
        name="editor"
        options={{
          title: 'Editor',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabIcon icon="editor" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon icon="profile" color={color} />,
        }}
      />
    </Tabs>
  );
}
