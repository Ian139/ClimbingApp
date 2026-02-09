import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-gray-50 items-center justify-center">
      <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-4">
        <Text className="text-2xl">🧗</Text>
      </View>
      <Text className="text-xl font-bold text-gray-900 mb-1">Profile</Text>
      <Text className="text-sm text-gray-400 mb-6">Your climbing stats</Text>
      <Pressable
        className="px-4 py-2 rounded-xl bg-gray-100 active:bg-gray-200"
        onPress={() => router.push('/settings')}
      >
        <Text className="text-sm font-medium text-gray-600">Settings</Text>
      </Pressable>
    </View>
  );
}
