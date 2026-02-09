import { View, Text, TextInput, Pressable } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  return (
    <View className="flex-1 justify-center px-6 bg-white">
      <Text className="text-3xl font-bold text-center mb-8">Join ClimbSet</Text>
      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
        placeholder="Display Name"
        value={displayName}
        onChangeText={setDisplayName}
      />
      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-6"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Pressable className="bg-red-500 rounded-lg py-3 items-center mb-4">
        <Text className="text-white font-semibold text-lg">Sign Up</Text>
      </Pressable>
      <Pressable onPress={() => router.back()}>
        <Text className="text-center text-gray-500">
          Already have an account? <Text className="text-red-500">Log In</Text>
        </Text>
      </Pressable>
    </View>
  );
}
