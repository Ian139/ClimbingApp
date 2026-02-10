import { View, Text, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SharedRouteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-5 pt-4">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-xl border border-border bg-card"
            onPress={() => router.back()}
          >
            <Text className="text-muted-foreground text-lg">‹</Text>
          </Pressable>
        </View>

        <View className="px-6 pt-4">
          <Text className="text-2xl font-semibold text-foreground">Shared Route</Text>
          <Text className="text-sm text-muted-foreground mt-1">View a shared route from a link</Text>

          <View className="mt-6 rounded-2xl border border-border bg-card px-4 py-4">
            <Text className="text-sm font-medium text-foreground mb-2">Share Token</Text>
            <View className="rounded-xl border border-border bg-muted px-4 py-3">
              <Text className="text-sm text-foreground">{token}</Text>
            </View>
            <Text className="text-xs text-muted-foreground mt-3">
              Route viewer is coming soon on mobile.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
