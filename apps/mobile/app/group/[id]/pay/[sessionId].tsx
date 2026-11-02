import { colors, radii, spacing } from '@padel-nerdz/config';
import { Screen } from '@padel-nerdz/ui';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useCelebration } from '@/components/CelebrationHost';
import { presentFreshUnlocks, syncAchievementsFromStats } from '@/lib/achievements';
import { useAuth } from '@/lib/auth';
import { paymentSuccess, tap, warn } from '@/lib/feedback';
import { recordPaymentClaim } from '@/lib/owner-metrics';
import {
  createStripePaymentIntent,
  getGroupPaymentSettings,
  isStripePayoutReady,
  stripeMerchantDisplayName,
  stripePublishableKey,
  waitForStripePaymentUnlock,
  type GroupPaymentSettings,
} from '@/lib/payments';
import { formatMoney, PLATFORM_FEE_CENTS, priceBreakdown } from '@/lib/pricing';
import { ensurePaidSessionRoomAccess, getSession, type SessionSummary } from '@/lib/sessions';
import { useStripePay } from '@/lib/stripe-pay';

export default function PayScreen() {
  const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
  const { profile, user, offline } = useAuth();
  const { celebrate } = useCelebration();
  const stripePay = useStripePay();
  const isGuest = offline;
  const userId = user?.id ?? profile?.id ?? '';
  const displayName = profile?.display_name?.trim() || 'Player';

  const [session, setSession] = useState<SessionSummary | null>(null);
  const [settings, setSettings] = useState<GroupPaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !sessionId) return;
    setLoading(true);
    try {
      const [s, pay] = await Promise.all([
        getSession(sessionId, isGuest),
        getGroupPaymentSettings(id, isGuest),
      ]);
      setSession(s);
      setSettings(pay);
    } finally {
      setLoading(false);
    }
  }, [id, sessionId, isGuest]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const breakdown = priceBreakdown(
    session?.price_cents,
    session?.commission_cents ?? PLATFORM_FEE_CENTS,
  );
  const amount = formatMoney(breakdown.playerTotalCents);
  const stripeReady = settings ? isStripePayoutReady(settings) : false;
  const stripeConfigured = Boolean(stripePublishableKey());

  async function onPay() {
    if (!id || !sessionId || !userId) return;
    if (!stripePay.supported) {
      setError('Pay on the iOS or Android app, Stripe isn’t available in the browser.');
      return;
    }
    if (!stripeConfigured) {
      setError('Payments aren’t configured yet (missing Stripe publishable key).');
      return;
    }
    if (!stripeReady) {
      setError(
        'Organiser hasn’t finished payout setup. Ask them to connect their bank in Admin → Payments.',
      );
      return;
    }

    setBusy(true);
    setError(null);
    try {
      void tap();
      const intent = await createStripePaymentIntent({
        sessionId,
        groupId: id,
        isGuest,
      });

      const { error: initError } = await stripePay.initPaymentSheet({
        merchantDisplayName: stripeMerchantDisplayName(),
        paymentIntentClientSecret: intent.clientSecret,
        allowsDelayedPaymentMethods: false,
        returnURL: `padelnerdz://stripe-redirect`,
        defaultBillingDetails: {
          name: displayName,
        },
      });
      if (initError) throw new Error(initError.message);

      const { error: presentError } = await stripePay.presentPaymentSheet();
      if (presentError) {
        if (presentError.code === 'Canceled') {
          setBusy(false);
          return;
        }
        throw new Error(presentError.message);
      }

      recordPaymentClaim({
        sessionId,
        groupId: id,
        method: 'stripe',
      });

      const unlocked = await waitForStripePaymentUnlock({
        sessionId,
        userId,
      });

      // Ensure session chat unlocks even if we send the player to the confirm screen first.
      if (!unlocked.sessionRoomId) {
        await ensurePaidSessionRoomAccess({
          sessionId,
          userId,
          isGuest,
        });
      }

      await paymentSuccess();
      celebrate({
        mark: 'PN',
        tier: 'gold',
        title: 'You’re in',
        body: 'Place confirmed, grab your ticket or add this to your calendar.',
      });

      const freshMissions = await syncAchievementsFromStats({ mixinsPlayed: 1 });
      if (freshMissions.length) {
        setTimeout(() => {
          void presentFreshUnlocks(freshMissions, celebrate);
        }, 3200);
      }

      // Land on confirm screen so ticket QR + calendar are right there once paid.
      router.replace(`/group/${id}/session/${sessionId}`);
    } catch (e) {
      void warn();
      setError(e instanceof Error ? e.message : 'Payment failed');
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

  return (
    <>
      <Stack.Screen options={{ title: 'Confirm place', headerBackTitle: 'Chat' }} />
      <Screen scroll edges={['left', 'right', 'bottom']} contentStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>PAYMENT</Text>
          <Text style={styles.title}>{session?.title ?? 'Mix-in'}</Text>
          <Text style={styles.amount}>{amount}</Text>
          <Text style={styles.amountHint}>
            {stripePay.supported
              ? 'One total · card / Apple Pay / Google Pay'
              : 'Browser preview, pay in the mobile app'}
          </Text>
        </View>

        <View style={styles.guide}>
          <Text style={styles.guideTitle}>How it works</Text>
          <Text style={styles.step}>
            1. Tap <Text style={styles.em}>Pay {amount}</Text>, Stripe opens a secure sheet.
          </Text>
          <Text style={styles.step}>
            2. Pay with card, Apple Pay, or Google Pay (when enabled on your device).
          </Text>
          <Text style={styles.step}>
            3. Your place unlocks instantly. The organiser gets the court share; Padel Nerdz keeps
            the service fee automatically.
          </Text>
        </View>

        {!stripeReady ? (
          <View style={styles.warnBox}>
            <Text style={styles.warnTitle}>Payouts not ready</Text>
            <Text style={styles.warnBody}>
              The organiser still needs to connect their bank in Admin → Payments before you can
              pay.
            </Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[
            styles.primary,
            (busy || !stripeReady || !stripeConfigured || !stripePay.supported) && { opacity: 0.5 },
          ]}
          onPress={() => void onPay()}
          disabled={busy || !stripeReady || !stripeConfigured || !stripePay.supported}
        >
          <Text style={styles.primaryText}>
            {busy ? 'Processing…' : stripePay.supported ? `Pay ${amount}` : 'Pay in the app'}
          </Text>
        </Pressable>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: { gap: 4 },
  kicker: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.accentGreen,
  },
  title: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 26,
    color: colors.textPrimary,
    letterSpacing: -0.6,
  },
  amount: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 40,
    color: colors.accentGreen,
    letterSpacing: -1,
    marginTop: 4,
  },
  amountHint: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textMuted,
  },
  guide: {
    gap: 8,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.22)',
  },
  guideTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 15,
    color: colors.accentGreen,
    marginBottom: 2,
  },
  step: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  em: {
    fontFamily: 'Figtree_700Bold',
    color: colors.textPrimary,
  },
  warnBox: {
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,183,77,0.4)',
    gap: 6,
  },
  warnTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 14,
    color: colors.warning,
  },
  warnBody: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  primary: {
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  primaryText: {
    fontFamily: 'Figtree_700Bold',
    color: '#0B0D10',
    fontSize: 16,
  },
  error: {
    color: colors.error,
    fontFamily: 'Figtree_400Regular',
    textAlign: 'center',
  },
});
