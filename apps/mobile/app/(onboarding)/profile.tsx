import { AppButton } from '@/components/AppButton';
import { TextField } from '@padel-nerdz/ui';
import { colors, spacing, typography } from '@padel-nerdz/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/AuthShell';
import { useAuth } from '@/lib/auth';
import { tap } from '@/lib/feedback';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

const LEVELS = [
  { value: 1.5, label: 'Beginner', hint: '1.0 – 2.0' },
  { value: 2.5, label: 'Improving', hint: '2.5 – 3.0' },
  { value: 3.5, label: 'Intermediate', hint: '3.5 – 4.0' },
  { value: 4.5, label: 'Advanced', hint: '4.5 – 5.0' },
  { value: 5.5, label: 'Competitive', hint: '5.5+' },
] as const;

const AVATAR_KEY = 'pn.avatarUri.v1';

export default function OnboardingProfileScreen() {
  const { user, refreshProfile, completeLocalProfile, continueAsGuest, profile, offline } =
    useAuth();
  const [name, setName] = useState(
    profile?.display_name && profile.display_name !== 'Player' && profile.display_name !== 'Demo Player'
      ? profile.display_name
      : '',
  );
  const [level, setLevel] = useState<number | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(profile?.avatar_url ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function pickAvatar() {
    void tap();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Allow photos to set your avatar');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
      if (error) setError(undefined);
    }
  }

  async function save() {
    Keyboard.dismiss();
    setError(undefined);
    const displayName = name.trim();
    if (displayName.length < 2) {
      setError('Enter your name');
      return;
    }
    if (level == null) {
      setError('Pick your skill level');
      return;
    }

    if (avatarUri) {
      await AsyncStorage.setItem(AVATAR_KEY, avatarUri);
    }

    if (offline || !isSupabaseConfigured || !user || profile?.id === 'guest' || profile?.id.startsWith('local_')) {
      if (profile?.id?.startsWith('local_')) {
        await completeLocalProfile({ displayName, avatarUrl: avatarUri });
      } else {
        continueAsGuest(displayName, { complete: true, avatarUrl: avatarUri });
      }
      router.replace('/(tabs)/chats');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await getSupabase()
        .from('profiles')
        .update({
          display_name: displayName,
          level,
          avatar_url: avatarUri,
          onboarding_completed: true,
        })
        .eq('id', user.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }
      await refreshProfile();
      router.replace('/(tabs)/chats');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Almost done"
      subtitle="Add a photo, your name, and level so organisers can build fair mixes."
      onBack={() => router.back()}
      footer={<AppButton label="Finish" onPress={save} loading={loading} />}
    >
      <Pressable style={styles.avatarPick} onPress={() => void pickAvatar()}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarEmpty}>
            <Text style={styles.avatarEmptyText}>
              {(name.trim().charAt(0) || '+').toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.avatarHint}>{avatarUri ? 'Change photo' : 'Add profile photo'}</Text>
      </Pressable>

      <TextField
        label="Your name"
        value={name}
        onChangeText={(v) => {
          setName(v);
          if (error) setError(undefined);
        }}
        autoCapitalize="words"
        autoFocus
        placeholder="Name"
        returnKeyType="done"
        onSubmitEditing={() => Keyboard.dismiss()}
        error={error === 'Enter your name' ? error : undefined}
      />

      <View style={styles.levelBlock}>
        <Text style={styles.levelLabel}>Skill level</Text>
        {LEVELS.map((item) => {
          const selected = level === item.value;
          return (
            <Pressable
              key={item.value}
              onPress={() => {
                Keyboard.dismiss();
                setLevel(item.value);
                if (error) setError(undefined);
              }}
              style={[styles.levelRow, selected && styles.levelRowSelected]}
            >
              <View>
                <Text style={[styles.levelTitle, selected && styles.levelTitleSelected]}>
                  {item.label}
                </Text>
                <Text style={styles.levelHint}>{item.hint}</Text>
              </View>
              <View style={[styles.radio, selected && styles.radioSelected]} />
            </Pressable>
          );
        })}
        {error && error !== 'Enter your name' ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  avatarPick: {
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.sm,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.elevated,
  },
  avatarEmpty: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmptyText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 32,
    color: colors.accentGreen,
  },
  avatarHint: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 14,
    color: colors.accentGreen,
  },
  levelBlock: {
    gap: spacing.sm,
  },
  levelLabel: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  levelRowSelected: {
    borderColor: colors.accentGreen,
  },
  levelTitle: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  levelTitleSelected: {
    color: colors.accentGreen,
  },
  levelHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioSelected: {
    borderColor: colors.accentGreen,
    backgroundColor: colors.accentGreen,
  },
  error: {
    ...typography.caption,
    color: colors.error,
  },
});
