import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useUserStore } from '../lib/stores/user-store';
import { useWallsStore } from '../lib/stores/walls-store';

export default function RootLayout() {
  const initializeAuth = useUserStore((s) => s.initializeAuth);
  const fetchWalls = useWallsStore((s) => s.fetchWalls);

  useEffect(() => {
    initializeAuth();
    fetchWalls();
  }, [initializeAuth, fetchWalls]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen
          name="share/[token]"
          options={{
            headerShown: true,
            title: 'Shared Route',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: true,
            title: 'Settings',
            presentation: 'modal',
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
