import { View, Text, Pressable } from 'react-native';
import { HOLD_COLORS } from '@climbset/shared';

export default function EditorScreen() {
  return (
    <View className="flex-1 bg-gray-950 items-center justify-center">
      <Text className="text-white text-xl font-bold mb-2">Route Editor</Text>
      <Text className="text-white/50 text-sm mb-6">Tap holds on your wall</Text>
      <View className="flex-row gap-3">
        {Object.entries(HOLD_COLORS).map(([type, color]) => (
          <Pressable key={type} className="items-center gap-1">
            <View
              style={{ backgroundColor: color }}
              className="w-8 h-8 rounded-full"
            />
            <Text className="text-white/60 text-xs capitalize">{type}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
