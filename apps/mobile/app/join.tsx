import { colors, spacing } from '@padel-nerdz/config';
import { Screen, TextField } from '@padel-nerdz/ui';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { useAuth } from '@/lib/auth';
import { success, warn } from '@/lib/feedback';
import { joinByInviteCode } from '@/lib/groups';

export default function JoinByCodeScreen() {
  const { profile, user , offline } = useAuth();
  const isGuest = offline;
  const userId = user?.id ?? profile?.id ?? '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function onJoin() {
    if (!userId) return;
    setLoading(true);
    setError(undefined);
    try {
      const group = await joinByInviteCode(
        code,
        userId,
        isGuest,
        profile?.display_name?.trim() || 'Player',
      );
      void success();
      router.replace(`/group/${group.id}`);
    } catch (e) {
      void warn();
      setError(e instanceof Error ? e.message : 'Could not join');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Join Group', headerShown: true, headerBackTitle: 'Back' }} />
      <Screen edges={['left', 'right', 'bottom']} contentStyle={styles.content}>
        <Text style={styles.title}>Join a group</Text>
        <Text style={styles.body}>Enter the invite code from your organiser.</Text>
        <TextField
          label="Invite code"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          autoFocus
          placeholder="SOTOGE"
          error={error}
        />
        <AppButton label="Join Group" onPress={onJoin} loading={loading} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 28,
    letterSpacing: -0.8,
    color: colors.textPrimary,
  },
  body: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
