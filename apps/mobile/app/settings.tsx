import { View, Text, Pressable, ScrollView, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { nanoid } from 'nanoid/non-secure';
import { supabase } from '../lib/supabase';
import { useWallsStore } from '../lib/stores/walls-store';
import { useUserStore } from '../lib/stores/user-store';

export default function SettingsScreen() {
  const { addWall } = useWallsStore();
  const { profile, uploadAvatar } = useUserStore();
  const [wallName, setWallName] = useState('');
  const [wallImageUri, setWallImageUri] = useState<string | null>(null);
  const [isUploadingWall, setIsUploadingWall] = useState(false);
  const [wallError, setWallError] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const pickWallImage = async () => {
    setWallError('');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setWallImageUri(result.assets[0].uri);
    }
  };

  const uploadWall = async () => {
    if (!wallName.trim() || !wallImageUri) {
      setWallError('Add a wall name and image.');
      return;
    }

    setIsUploadingWall(true);
    setWallError('');

    try {
      const wallId = nanoid();
      const response = await fetch(wallImageUri);
      const blob = await response.blob();
      const path = `${wallId}/${Date.now()}.jpg`;

      const { error } = await supabase.storage
        .from('walls')
        .upload(path, blob, { contentType: 'image/jpeg' });

      if (error) throw new Error(error.message);

      const { data } = supabase.storage.from('walls').getPublicUrl(path);
      const imageUrl = data.publicUrl;

      await addWall({
        id: wallId,
        user_id: 'local-user',
        name: wallName.trim(),
        image_url: imageUrl,
        image_width: 1920,
        image_height: 1080,
        is_public: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      setWallName('');
      setWallImageUri(null);
    } catch (error) {
      setWallError(error instanceof Error ? error.message : 'Failed to upload wall');
    } finally {
      setIsUploadingWall(false);
    }
  };

  const pickAvatar = async () => {
    setIsUploadingAvatar(true);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      await uploadAvatar({
        uri: result.assets[0].uri,
        name: result.assets[0].fileName || 'avatar.jpg',
        type: result.assets[0].mimeType || 'image/jpeg',
      });
    }
    setIsUploadingAvatar(false);
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

        <View className="px-6 pt-4">
          <Text className="text-2xl font-semibold text-foreground">Settings</Text>
          <Text className="text-sm text-muted-foreground mt-1">
            Manage your account, walls, and preferences
          </Text>

          <View className="mt-6 rounded-2xl border border-border bg-card px-4 py-4">
            <Text className="text-sm font-medium text-foreground mb-3">Account</Text>
            <View className="rounded-xl border border-border bg-muted px-4 py-3 mb-3">
              <Text className="text-sm text-foreground">Avatar</Text>
              <View className="flex-row items-center gap-3 mt-3">
                <View className="h-12 w-12 rounded-full bg-card border border-border overflow-hidden items-center justify-center">
                  {profile?.avatar_url ? (
                    <Image source={{ uri: profile.avatar_url }} style={{ width: 48, height: 48 }} />
                  ) : (
                    <Text className="text-lg">🧗</Text>
                  )}
                </View>
                <Pressable
                  className="bg-primary rounded-xl px-4 py-2"
                  onPress={pickAvatar}
                  disabled={isUploadingAvatar}
                >
                  <Text className="text-primary-foreground font-medium text-sm">
                    {isUploadingAvatar ? 'Uploading...' : 'Change Avatar'}
                  </Text>
                </Pressable>
              </View>
            </View>
            <View className="rounded-xl border border-border bg-muted px-4 py-3">
              <Text className="text-sm text-foreground">Privacy and sharing</Text>
              <Text className="text-xs text-muted-foreground mt-1">Coming soon</Text>
            </View>
          </View>

          <View className="mt-4 rounded-2xl border border-border bg-card px-4 py-4">
            <Text className="text-sm font-medium text-foreground mb-3">Walls</Text>
            <View className="rounded-xl border border-border bg-muted px-4 py-3">
              <Text className="text-sm text-foreground mb-2">Add a new wall</Text>
              <TextInput
                className="border border-border bg-card rounded-xl px-4 py-3 text-foreground mb-3"
                placeholder="Wall name"
                placeholderTextColor="#8b7668"
                value={wallName}
                onChangeText={setWallName}
              />
              {wallImageUri ? (
                <Image source={{ uri: wallImageUri }} style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 12 }} />
              ) : null}
              <Pressable
                className="border border-border rounded-xl px-4 py-2 mb-3"
                onPress={pickWallImage}
              >
                <Text className="text-sm text-foreground">Pick Wall Image</Text>
              </Pressable>
              {wallError ? <Text className="text-xs text-destructive mb-2">{wallError}</Text> : null}
              <Pressable
                className="bg-primary rounded-xl px-4 py-3 items-center"
                onPress={uploadWall}
                disabled={isUploadingWall}
              >
                <Text className="text-primary-foreground font-medium">
                  {isUploadingWall ? 'Uploading...' : 'Upload Wall'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View className="mt-4 rounded-2xl border border-border bg-card px-4 py-4">
            <Text className="text-sm font-medium text-foreground mb-3">App</Text>
            <View className="rounded-xl border border-border bg-muted px-4 py-3">
              <Text className="text-sm text-foreground">Theme and accessibility</Text>
              <Text className="text-xs text-muted-foreground mt-1">Coming soon</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
