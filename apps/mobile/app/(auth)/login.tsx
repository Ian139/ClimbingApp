import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '../../lib/stores/user-store';
import { colors } from '../../lib/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const login = useUserStore((s) => s.login);

  const handleLogin = async () => {
    setError('');
    setIsLoading(true);
    const result = await login(email.trim(), password);
    setIsLoading(false);
    if (result.success) {
      router.replace('/(tabs)');
    } else {
      setError(result.error || 'Login failed');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Pressable
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.card }}
            onPress={() => router.back()}
          >
            <Text style={{ color: colors.muted, fontSize: 18 }}>‹</Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: `${colors.secondary}1a` }}>
              <Text className="text-2xl">🧗</Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: '600', color: colors.text, marginTop: 16 }}>Welcome back</Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>Log in to your ClimbSet account</Text>
          </View>

          <View style={{ borderRadius: 16, backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Email</Text>
            <TextInput
              style={{ backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: colors.text, marginBottom: 16 }}
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Password</Text>
            <TextInput
              style={{ backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: colors.text }}
              placeholder="Enter your password"
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {error ? (
              <Text style={{ fontSize: 13, color: colors.destructive, marginTop: 12 }}>{error}</Text>
            ) : null}

            <Pressable
              style={{ backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 20, opacity: isLoading ? 0.7 : 1 }}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={{ color: colors.card, fontWeight: '600', fontSize: 16 }}>
                {isLoading ? 'Logging in...' : 'Log In'}
              </Text>
            </Pressable>
          </View>

          <Pressable onPress={() => router.push('/(auth)/signup')} style={{ marginTop: 20 }}>
            <Text style={{ textAlign: 'center', fontSize: 13, color: colors.muted }}>
              Don&apos;t have an account? <Text style={{ color: colors.primary, fontWeight: '600' }}>Sign Up</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
