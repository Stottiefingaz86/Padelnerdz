import { colors, radii, spacing } from '@padel-nerdz/config';
import { Screen } from '@padel-nerdz/ui';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { paymentSuccess, tap, warn } from '@/lib/feedback';
import { recordPaymentClaim } from '@/lib/owner-metrics';
import {
  getGroupPaymentSettings,
  openPaymentDestination,
  paymentMethodLabel,
  type GroupPaymentSettings,
} from '@/lib/payments';
import { formatMoney, PLATFORM_FEE_CENTS, priceBreakdown } from '@/lib/pricing';
import {
  claimSessionPayment,
  getSession,
  type SessionSummary,
} from '@/lib/sessions';

export default function PayScreen() {
  const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
  const { profile, user, offline } = useAuth();
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

  async function openPayApp() {
    if (!settings) return;
    void tap();
    const result = await openPaymentDestination(settings, amount);
    if (result === 'missing') {
      void warn();
      setError(
        settings.preferred_method === 'revolut'
          ? 'Organiser hasn’t added a Revolut.me code yet.'
          : settings.preferred_method === 'bizum'
            ? 'Organiser hasn’t added a Bizum phone number yet.'
            : 'Card checkout isn’t live yet — ask the organiser for another method.',
      );
    }
  }

  async function markPaid() {
    if (!id || !sessionId || !userId) return;
    setBusy(true);
    setError(null);
    try {
      await claimSessionPayment({
        sessionId,
        groupId: id,
        userId,
        displayName,
        isGuest,
      });
      recordPaymentClaim({
        sessionId,
        groupId: id,
        method: settings?.preferred_method ?? 'manual',
      });
      await paymentSuccess();
      router.replace(`/group/${id}/session/${sessionId}`);
    } catch (e) {
      void warn();
      setError(e instanceof Error ? e.message : 'Could not submit payment claim');
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

  const method = settings?.preferred_method ?? 'revolut';
  const methodTitle = paymentMethodLabel(method);

  return (
    <>
      <Stack.Screen options={{ title: 'Confirm place', headerBackTitle: 'Chat' }} />
      <Screen scroll edges={['left', 'right', 'bottom']} contentStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>PAYMENT</Text>
          <Text style={styles.title}>{session?.title ?? 'Mix-in'}</Text>
          <Text style={styles.amount}>{amount}</Text>
        </View>

        <View style={styles.guide}>
          <Text style={styles.guideTitle}>How to pay</Text>
          {method === 'revolut' ? (
            <>
              <Text style={styles.step}>
                1. Tap <Text style={styles.em}>Open Revolut</Text> — that opens the organiser’s
                Revolut.me page
                {settings?.revolut_me_code
                  ? ` (revolut.me/${settings.revolut_me_code})`
                  : ''}
                .
              </Text>
              <Text style={styles.step}>
                2. Send exactly <Text style={styles.em}>{amount}</Text>
                {settings?.payment_note ? ` — ${settings.payment_note}` : ' (add the mix-in name in the reference if you can)'}.
              </Text>
              <Text style={styles.step}>
                3. Come back here and tap <Text style={styles.em}>I’ve paid</Text>.
              </Text>
              <Text style={styles.step}>
                4. Wait for the organiser to confirm they received it in Revolut — session chat
                unlocks after that.
              </Text>
            </>
          ) : method === 'bizum' ? (
            <>
              <Text style={styles.step}>
                1. Tap <Text style={styles.em}>Share Bizum details</Text> to copy the organiser’s
                number
                {settings?.bizum_phone ? ` (${settings.bizum_phone})` : ''}.
              </Text>
              <Text style={styles.step}>
                2. Open your bank / Bizum app and send exactly{' '}
                <Text style={styles.em}>{amount}</Text> to that number.
              </Text>
              <Text style={styles.step}>
                3. Return here and tap <Text style={styles.em}>I’ve paid</Text>.
              </Text>
              <Text style={styles.step}>
                4. Organiser verifies the transfer — then session chat unlocks.
              </Text>
            </>
          ) : (
            <Text style={styles.step}>Card checkout isn’t available yet. Ask the organiser.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Pay with</Text>
          <Text style={styles.cardMethod}>{methodTitle}</Text>
          {method === 'revolut' ? (
            <Text style={styles.cardMeta}>
              {settings?.revolut_me_code
                ? `revolut.me/${settings.revolut_me_code}`
                : 'No Revolut.me code set by organiser'}
            </Text>
          ) : null}
          {method === 'bizum' ? (
            <Text style={styles.cardMeta}>
              {settings?.bizum_phone
                ? `${settings.bizum_phone}${settings.bizum_name ? ` · ${settings.bizum_name}` : ''}`
                : 'No Bizum number set by organiser'}
            </Text>
          ) : null}
          {settings?.payment_note ? (
            <Text style={styles.note}>{settings.payment_note}</Text>
          ) : null}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <Pressable style={styles.primary} onPress={() => void openPayApp()}>
            <Text style={styles.primaryText}>
              {method === 'revolut'
                ? 'Open Revolut'
                : method === 'bizum'
                  ? 'Share Bizum details'
                  : 'Payment method unavailable'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.secondary, busy && { opacity: 0.5 }]}
            onPress={() => void markPaid()}
            disabled={busy}
          >
            <Text style={styles.secondaryText}>{busy ? 'Submitting…' : 'I’ve paid'}</Text>
          </Pressable>
        </View>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    gap: 4,
  },
  cardLabel: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 12,
    color: colors.textMuted,
  },
  cardMethod: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 22,
    color: colors.textPrimary,
  },
  cardMeta: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
  },
  note: {
    marginTop: 8,
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actions: { gap: 10, marginTop: spacing.sm },
  primary: {
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontFamily: 'Figtree_700Bold',
    color: '#0B0D10',
    fontSize: 16,
  },
  secondary: {
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: {
    fontFamily: 'Figtree_700Bold',
    color: colors.textPrimary,
    fontSize: 16,
  },
  error: {
    color: colors.error,
    fontFamily: 'Figtree_400Regular',
    textAlign: 'center',
  },
});
