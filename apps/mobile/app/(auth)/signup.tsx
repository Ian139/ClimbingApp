import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '../../lib/stores/user-store';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const signup = useUserStore((s) => s.signup);

  const handleSignup = async () => {
    setError('');
    setIsLoading(true);
    const result = await signup(email.trim(), password, displayName.trim() || undefined);
    setIsLoading(false);
    if (result.success) {
      router.replace('/(tabs)');
    } else {
      setError(result.error || 'Signup failed');
    }
  };

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

        <View className="px-6 pt-6">
          <View className="items-center mb-6">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10">
              <Text className="text-2xl">🧗</Text>
            </View>
            <Text className="text-2xl font-semibold text-foreground mt-4">Create your account</Text>
            <Text className="text-sm text-muted-foreground mt-1">Set routes and share beta</Text>
          </View>

          <View className="rounded-2xl border border-border bg-card px-4 py-5">
            <Text className="text-sm font-medium text-foreground mb-2">Display Name</Text>
            <TextInput
              className="border border-border bg-muted rounded-xl px-4 py-3 text-foreground mb-4"
              placeholder="Your name (optional)"
              placeholderTextColor="#8b7668"
              value={displayName}
              onChangeText={setDisplayName}
            />

            <Text className="text-sm font-medium text-foreground mb-2">Email</Text>
            <TextInput
              className="border border-border bg-muted rounded-xl px-4 py-3 text-foreground mb-4"
              placeholder="you@example.com"
              placeholderTextColor="#8b7668"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text className="text-sm font-medium text-foreground mb-2">Password</Text>
            <TextInput
              className="border border-border bg-muted rounded-xl px-4 py-3 text-foreground"
              placeholder="At least 6 characters"
              placeholderTextColor="#8b7668"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {error ? (
              <Text className="text-sm text-destructive mt-3">{error}</Text>
            ) : null}

            <Pressable
              className="bg-primary rounded-xl py-3 items-center mt-5"
              onPress={handleSignup}
              disabled={isLoading}
            >
              <Text className="text-primary-foreground font-semibold text-base">
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Text>
            </Pressable>
          </View>

          <Pressable onPress={() => router.push('/(auth)/login')} className="mt-5">
            <Text className="text-center text-sm text-muted-foreground">
              Already have an account? <Text className="text-primary font-medium">Log In</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
