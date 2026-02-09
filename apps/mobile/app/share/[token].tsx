import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function SharedRouteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold">Shared Route</Text>
      <Text className="text-gray-500 mt-2">Token: {token}</Text>
      <Text className="text-gray-400 mt-1">Route viewer coming soon</Text>
    </View>
  );
}
