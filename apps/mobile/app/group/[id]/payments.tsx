import { colors, radii, spacing } from '@padel-nerdz/config';
import { Screen } from '@padel-nerdz/ui';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Banknote, CheckCircle2, Shield } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Icon } from '@/components/Icon';
import { useAuth } from '@/lib/auth';
import { success, tap, warn } from '@/lib/feedback';
import {
  connectReturnUrl,
  connectStatusFromSettings,
  getGroupPaymentSettings,
  isStripePayoutReady,
  refreshStripeConnectStatus,
  startStripeConnectOnboarding,
  type ConnectStatus,
  type GroupPaymentSettings,
} from '@/lib/payments';

function statusCopy(status: ConnectStatus) {
  if (status === 'ready') {
    return {
      title: 'Payouts live',
      body: 'Players pay in-app. Court share hits your bank. Padel Nerdz keeps the service fee automatically.',
      tone: 'ok' as const,
    };
  }
  if (status === 'pending') {
    return {
      title: 'Almost there',
      body: 'Details submitted, verification usually finishes in a few minutes. Pull to refresh status.',
      tone: 'warn' as const,
    };
  }
  if (status === 'onboarding') {
    return {
      title: 'Finish bank setup',
      body: 'You’re partway through. Continue to confirm identity and where court fees should land.',
      tone: 'warn' as const,
    };
  }
  return {
    title: 'One-time bank setup',
    body: 'Takes about two minutes. After that, paid mix-ins split automatically, court to you, fee to Padel Nerdz.',
    tone: 'neutral' as const,
  };
}

export default function GroupPaymentsScreen() {
  const { id, stripe } = useLocalSearchParams<{ id: string; stripe?: string }>();
  const { profile, user, offline } = useAuth();
  const isGuest = offline;
  const userId = user?.id ?? profile?.id ?? '';

  const [settings, setSettings] = useState<GroupPaymentSettings | null>(null);
  const [status, setStatus] = useState<ConnectStatus>('not_connected');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const openPayoutSetup = useCallback(async () => {
    if (!id) return;
    const { url } = await startStripeConnectOnboarding({ groupId: id, isGuest });
    const httpsReturn = connectReturnUrl(id, 'return');
    await WebBrowser.openAuthSessionAsync(url, httpsReturn);
  }, [id, isGuest]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      if (stripe === 'return' || stripe === 'refresh') {
        const remote = await refreshStripeConnectStatus({ groupId: id, isGuest });
        setSettings(remote.settings);
        setStatus(remote.status);
        if (remote.ready) {
          void success();
        } else if (stripe === 'refresh') {
          await openPayoutSetup();
          const again = await refreshStripeConnectStatus({ groupId: id, isGuest });
          setSettings(again.settings);
          setStatus(again.status);
          if (again.ready) void success();
        }
      } else {
        const s = await getGroupPaymentSettings(id, isGuest);
        setSettings(s);
        setStatus(connectStatusFromSettings(s));
      }
    } catch (e) {
      void warn();
      Alert.alert(
        'Payments',
        e instanceof Error ? e.message : 'Could not load payout status.',
      );
    } finally {
      setLoading(false);
    }
  }, [id, isGuest, stripe, openPayoutSetup]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onConnect() {
    if (!id || !userId) return;
    setBusy(true);
    try {
      void tap();
      await openPayoutSetup();
      const remote = await refreshStripeConnectStatus({ groupId: id, isGuest });
      setSettings(remote.settings);
      setStatus(remote.status);
      if (remote.ready) {
        void success();
        Alert.alert('You’re set', 'Mix-in payouts can land in your bank now.');
      }
    } catch (e) {
      void warn();
      Alert.alert(
        'Couldn’t open bank setup',
        e instanceof Error ? e.message : 'Try again in a moment.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onRefresh() {
    if (!id) return;
    setBusy(true);
    try {
      void tap();
      const remote = await refreshStripeConnectStatus({ groupId: id, isGuest });
      setSettings(remote.settings);
      setStatus(remote.status);
      if (remote.ready) void success();
    } catch (e) {
      void warn();
      Alert.alert(
        'Refresh failed',
        e instanceof Error ? e.message : 'Try again in a moment.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accentGreen} />
      </View>
    );
  }

  const copy = statusCopy(status);
  const ready = settings ? isStripePayoutReady(settings) : false;

  return (
    <>
      <Stack.Screen options={{ title: 'Payouts', headerBackTitle: 'Admin' }} />
      <Screen scroll edges={['left', 'right', 'bottom']} contentStyle={styles.content}>
        <Text style={styles.kicker}>PADEL NERDZ</Text>
        <Text style={styles.title}>Get paid for mix-ins</Text>
        <Text style={styles.lead}>
          Players pay once in the app. Your court share goes to your bank. We keep the platform fee
          (+ IVA), no honour system, no chasing.
        </Text>

        <View
          style={[
            styles.card,
            copy.tone === 'ok' && styles.cardOk,
            copy.tone === 'warn' && styles.cardWarn,
          ]}
        >
          <View style={styles.cardIcon}>
            <Icon
              icon={ready ? CheckCircle2 : Banknote}
              color={ready ? colors.accentGreen : colors.textPrimary}
              size="md"
            />
          </View>
          <Text style={styles.cardStatus}>{copy.title}</Text>
          <Text style={styles.cardBody}>{copy.body}</Text>
        </View>

        <View style={styles.bullets}>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>About 2 minutes · identity + bank</Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>Court fees settle automatically after each paid mix-in</Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>You stay in control of your payout details</Text>
          </View>
        </View>

        <Pressable
          style={[styles.primary, busy && styles.disabled]}
          disabled={busy}
          onPress={() => void onConnect()}
        >
          <Text style={styles.primaryText}>
            {busy
              ? 'Opening setup…'
              : ready
                ? 'Update payout details'
                : status === 'onboarding' || status === 'pending'
                  ? 'Continue bank setup'
                  : 'Set up payouts'}
          </Text>
        </Pressable>

        {settings?.stripe_account_id ? (
          <Pressable
            style={[styles.secondary, busy && styles.disabled]}
            disabled={busy}
            onPress={() => void onRefresh()}
          >
            <Text style={styles.secondaryText}>Refresh status</Text>
          </Pressable>
        ) : null}

        <View style={styles.secureRow}>
          <Icon icon={Shield} color={colors.textMuted} size="sm" />
          <Text style={styles.secureText}>
            Bank details are collected securely. Powered by Stripe, never shared in chat.
          </Text>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  kicker: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.accentGreen,
  },
  title: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 30,
    color: colors.textPrimary,
    letterSpacing: -0.7,
  },
  lead: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.elevated,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardOk: { borderColor: 'rgba(200,255,46,0.4)' },
  cardWarn: { borderColor: 'rgba(255,183,77,0.45)' },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  cardStatus: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 18,
    color: colors.textPrimary,
  },
  cardBody: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  bullets: { gap: 10, marginTop: 2 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: colors.accentGreen,
  },
  bulletText: {
    flex: 1,
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  primary: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  primaryText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 16,
    color: '#0B0D10',
  },
  secondary: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  disabled: { opacity: 0.55 },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  secureText: {
    flex: 1,
    fontFamily: 'Figtree_400Regular',
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
});
