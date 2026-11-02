import { colors, spacing } from '@padel-nerdz/config';
import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { deleteMyAccount, exportMyData } from '@/lib/account';
import {
  biometricLabel,
  canUseBiometric,
  confirmBiometricEnrollment,
  getBiometricKind,
  isBiometricLockEnabled,
  setBiometricLockEnabled,
  type BiometricKind,
} from '@/lib/biometric';
import { success, tap, warn } from '@/lib/feedback';
import { useGlassHeaderOffset } from '@/lib/layout';

const WEB =
  process.env.EXPO_PUBLIC_ADMIN_URL?.replace(/\/admin\/?$/, '') ||
  'https://padelnerdz.com';

export default function PrivacySettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerOffset = useGlassHeaderOffset();
  const { profile, offline, signOut } = useAuth();
  const [bioOn, setBioOn] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioKind, setBioKind] = useState<BiometricKind>('none');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const kind = await getBiometricKind();
      setBioKind(kind);
      setBioAvailable(await canUseBiometric());
      setBioOn(await isBiometricLockEnabled());
    })();
  }, []);

  async function onExport() {
    if (!profile?.id || offline) {
      Alert.alert('Export', 'Sign in with a live account to export your data.');
      return;
    }
    void tap();
    setBusy(true);
    try {
      await exportMyData(profile.id);
      void success();
    } catch (e) {
      void warn();
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setBusy(false);
    }
  }

  function onDelete() {
    if (offline) {
      Alert.alert('Delete', 'Local demo accounts are cleared when you sign out.');
      return;
    }
    Alert.alert(
      'Delete account?',
      'This permanently deletes your profile, memberships, and messages you sent. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                await deleteMyAccount();
                await signOut();
                router.replace('/(auth)');
              } catch (e) {
                void warn();
                Alert.alert(
                  'Could not delete',
                  e instanceof Error ? e.message : 'Contact support@padelnerdz.com',
                );
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Privacy', headerBackTitle: 'Back' }} />
      <ScrollView
        style={styles.root}
        contentContainerStyle={{
          paddingTop: headerOffset,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: spacing.md,
          gap: 16,
        }}
      >
        <Text style={styles.lead}>
          Control lock, export a copy of your data, or delete your account.
        </Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>
                {bioAvailable ? `${biometricLabel(bioKind)} lock` : 'App lock'}
              </Text>
              <Text style={styles.rowMeta}>
                {bioAvailable
                  ? `Require ${biometricLabel(bioKind)} when opening Padel Nerdz. Device passcode is not used.`
                  : bioKind === 'none'
                    ? 'This device has no Face ID / fingerprint hardware.'
                    : `Set up ${biometricLabel(bioKind)} in iPhone Settings first, then return here.`}
              </Text>
            </View>
            <Switch
              value={bioOn}
              disabled={!bioAvailable || busy}
              onValueChange={(v) => {
                void (async () => {
                  void tap();
                  if (v) {
                    const ok = await confirmBiometricEnrollment();
                    if (!ok) {
                      Alert.alert(
                        biometricLabel(bioKind),
                        `Couldn’t verify ${biometricLabel(bioKind)}. Try again, or check Settings → Face ID & Passcode.`,
                      );
                      return;
                    }
                  }
                  await setBiometricLockEnabled(v);
                  setBioOn(v);
                  if (v) void success();
                })();
              }}
              trackColor={{ true: colors.accentGreen, false: colors.border }}
            />
          </View>
        </View>

        <Pressable
          style={styles.card}
          onPress={() => void onExport()}
          disabled={busy}
        >
          <Text style={styles.rowTitle}>Export my data</Text>
          <Text style={styles.rowMeta}>Download a JSON copy (GDPR portability)</Text>
        </Pressable>

        <Pressable
          style={styles.card}
          onPress={() => void Linking.openURL(`${WEB}/privacy`)}
        >
          <Text style={styles.rowTitle}>Privacy policy</Text>
          <Text style={styles.rowMeta}>{WEB}/privacy</Text>
        </Pressable>

        <Pressable
          style={styles.card}
          onPress={() => void Linking.openURL(`${WEB}/terms`)}
        >
          <Text style={styles.rowTitle}>Terms of service</Text>
          <Text style={styles.rowMeta}>{WEB}/terms</Text>
        </Pressable>

        <Pressable
          style={[styles.card, styles.dangerCard]}
          onPress={onDelete}
          disabled={busy}
        >
          <Text style={styles.dangerTitle}>Delete account</Text>
          <Text style={styles.rowMeta}>Permanent, cannot be undone</Text>
        </Pressable>

        {busy ? (
          <ActivityIndicator color={colors.accentGreen} style={{ marginTop: 12 }} />
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  lead: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 4,
  },
  dangerCard: {
    borderColor: 'rgba(255,110,110,0.35)',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 16,
    color: colors.textPrimary,
  },
  rowMeta: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  dangerTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 16,
    color: colors.error,
  },
});
