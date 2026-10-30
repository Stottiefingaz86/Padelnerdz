import { colors, spacing } from '@padel-nerdz/config';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { success, tap, warn } from '@/lib/feedback';
import { useGlassHeaderOffset } from '@/lib/layout';
import { recordOwnerPayment } from '@/lib/owner-metrics';
import {
  getGroupPaymentSettings,
  paymentMethodLabel,
  type GroupPaymentSettings,
} from '@/lib/payments';
import { PLATFORM_FEE_CENTS, formatMoney, priceBreakdown } from '@/lib/pricing';
import {
  getSession,
  listRegistrants,
  rejectPaymentClaim,
  verifySessionPayment,
  type Registrant,
  type SessionSummary,
} from '@/lib/sessions';

type RowKind = 'claimed' | 'awaiting' | 'paid';

function kindFor(status: Registrant['status']): RowKind | null {
  if (status === 'payment_claimed') return 'claimed';
  if (status === 'selected') return 'awaiting';
  if (status === 'paid') return 'paid';
  return null;
}

function kindLabel(kind: RowKind) {
  if (kind === 'claimed') return 'Says paid — check bank';
  if (kind === 'awaiting') return 'Awaiting payment';
  return 'Verified';
}

export default function VerifyPaymentsScreen() {
  const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
  const insets = useSafeAreaInsets();
  const headerOffset = useGlassHeaderOffset();
  const { profile, user, offline } = useAuth();
  const isGuest = offline;
  const organiserId = user?.id ?? profile?.id ?? '';

  const [session, setSession] = useState<SessionSummary | null>(null);
  const [settings, setSettings] = useState<GroupPaymentSettings | null>(null);
  const [regs, setRegs] = useState<Registrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !sessionId) return;
    setLoading(true);
    try {
      const [s, pay, list] = await Promise.all([
        getSession(sessionId, isGuest),
        getGroupPaymentSettings(id, isGuest),
        listRegistrants(sessionId, id, isGuest),
      ]);
      setSession(s);
      setSettings(pay);
      setRegs(list);
    } finally {
      setLoading(false);
    }
  }, [id, sessionId, isGuest]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const rows = useMemo(() => {
    return regs
      .map((r) => ({ reg: r, kind: kindFor(r.status) }))
      .filter((x): x is { reg: Registrant; kind: RowKind } => x.kind != null)
      .sort((a, b) => {
        const order = { claimed: 0, awaiting: 1, paid: 2 };
        return order[a.kind] - order[b.kind];
      });
  }, [regs]);

  const claimedCount = rows.filter((r) => r.kind === 'claimed').length;
  const method = settings?.preferred_method ?? 'revolut';
  const methodTitle = paymentMethodLabel(method);
  const amount = formatMoney(
    priceBreakdown(session?.price_cents, session?.commission_cents ?? PLATFORM_FEE_CENTS)
      .playerTotalCents,
  );

  async function onConfirm(reg: Registrant) {
    if (!id || !sessionId || !organiserId) return;
    setBusyId(reg.user_id);
    try {
      await verifySessionPayment({
        sessionId,
        groupId: id,
        playerUserId: reg.user_id,
        playerDisplayName: reg.display_name,
        organiserId,
        isGuest,
      });
      await recordOwnerPayment({
        sessionId,
        groupId: id,
        userId: reg.user_id,
        displayName: reg.display_name,
        courtCents: session?.price_cents ?? 0,
        feeCents: session?.commission_cents ?? PLATFORM_FEE_CENTS,
        method,
      });
      void success();
      await load();
    } catch (e) {
      void warn();
      Alert.alert('Could not confirm', e instanceof Error ? e.message : 'Try again');
    } finally {
      setBusyId(null);
    }
  }

  function onReject(reg: Registrant) {
    Alert.alert(
      'Payment not received?',
      `Reject ${reg.display_name}’s claim. They’ll need to pay again (or tell the truth). Session chat stays locked.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Not received',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              if (!id || !sessionId || !organiserId) return;
              setBusyId(reg.user_id);
              try {
                await rejectPaymentClaim({
                  sessionId,
                  groupId: id,
                  playerUserId: reg.user_id,
                  organiserId,
                  isGuest,
                });
                void success();
                await load();
              } catch (e) {
                void warn();
                Alert.alert('Could not reject', e instanceof Error ? e.message : 'Try again');
              } finally {
                setBusyId(null);
              }
            })();
          },
        },
      ],
    );
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
      <Stack.Screen options={{ title: 'Verify payments', headerBackTitle: 'Mix-in' }} />
      <FlatList
        data={rows}
        keyExtractor={(item) => item.reg.id}
        contentContainerStyle={[
          styles.list,
          { paddingTop: headerOffset, paddingBottom: insets.bottom + 24 },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.kicker}>ORGANISER CHECK</Text>
            <Text style={styles.title}>{session?.title ?? 'Mix-in'}</Text>
            <Text style={styles.banner}>
              Money moves outside the app via {methodTitle}. Open your bank/Revolut, confirm{' '}
              {amount} arrived, then tap Confirm received. Until you confirm, session chat stays
              locked — players can’t freeload on a false “I’ve paid”.
            </Text>
            {claimedCount > 0 ? (
              <Text style={styles.alert}>
                {claimedCount} player{claimedCount === 1 ? '' : 's'} waiting for your check
              </Text>
            ) : (
              <Text style={styles.meta}>No pending claims right now.</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No selected players yet. Confirm a lineup first.</Text>
        }
        renderItem={({ item }) => {
          const { reg, kind } = item;
          const busy = busyId === reg.user_id;
          return (
            <View style={[styles.card, kind === 'claimed' && styles.cardClaimed]}>
              <View style={styles.cardTop}>
                <Text style={styles.name}>{reg.display_name}</Text>
                <Text
                  style={[
                    styles.badge,
                    kind === 'claimed' && styles.badgeClaimed,
                    kind === 'paid' && styles.badgePaid,
                  ]}
                >
                  {kindLabel(kind)}
                </Text>
              </View>
              <Text style={styles.cardMeta}>
                {amount}
                {reg.payment_claimed_at
                  ? ` · claimed ${new Date(reg.payment_claimed_at).toLocaleString()}`
                  : ''}
              </Text>
              {kind === 'claimed' ? (
                <View style={styles.actions}>
                  <Pressable
                    style={[styles.confirmBtn, busy && { opacity: 0.5 }]}
                    disabled={busy}
                    onPress={() => {
                      void tap();
                      void onConfirm(reg);
                    }}
                  >
                    <Text style={styles.confirmText}>
                      {busy ? '…' : 'Confirm received'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.rejectBtn, busy && { opacity: 0.5 }]}
                    disabled={busy}
                    onPress={() => {
                      void tap();
                      onReject(reg);
                    }}
                  >
                    <Text style={styles.rejectText}>Not received</Text>
                  </Pressable>
                </View>
              ) : null}
              {kind === 'awaiting' ? (
                <Text style={styles.hint}>Still needs to pay via {methodTitle}.</Text>
              ) : null}
              {kind === 'paid' ? (
                <Text style={styles.hint}>Verified — session chat unlocked for them.</Text>
              ) : null}
            </View>
          );
        }}
      />
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
  list: {
    padding: spacing.md,
    gap: 12,
    backgroundColor: colors.background,
  },
  header: { gap: 8, marginBottom: 8 },
  kicker: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.accentGreen,
  },
  title: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 24,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  banner: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    backgroundColor: colors.elevated,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  alert: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 13,
    color: colors.accentGreen,
  },
  meta: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textMuted,
  },
  empty: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardClaimed: {
    borderColor: 'rgba(200,255,46,0.45)',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    flex: 1,
    fontFamily: 'Figtree_700Bold',
    fontSize: 17,
    color: colors.textPrimary,
  },
  badge: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    color: colors.textMuted,
    overflow: 'hidden',
  },
  badgeClaimed: { color: colors.accentGreen },
  badgePaid: { color: '#7DFFB2' },
  cardMeta: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
  },
  hint: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textMuted,
  },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  confirmBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 14,
    color: '#0B0D10',
  },
  rejectBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 14,
    color: colors.textPrimary,
  },
});
