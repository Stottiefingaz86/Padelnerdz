import { AppButton } from '@/components/AppButton';
import { colors, radii, spacing, typography } from '@padel-nerdz/config';
import { Screen } from '@padel-nerdz/ui';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { useCelebration } from '@/components/CelebrationHost';
import { useAuth } from '@/lib/auth';
import { markCelebrated, syncAchievementsFromStats } from '@/lib/achievements';
import { tap, success, warn, revolutPulse } from '@/lib/feedback';
import { canOrganiseGroup, getGroup } from '@/lib/groups';
import { formatMoney, PLATFORM_FEE_CENTS, priceBreakdown } from '@/lib/pricing';
import {
  getSession,
  listRegistrants,
  postNeedPlayer,
  registerForSession,
  registrationStateForUser,
  withdrawFromSession,
  type MyRegistrationState,
  type SessionSummary,
} from '@/lib/sessions';

function stateCopy(state: MyRegistrationState): { label: string; note: string } {
  switch (state) {
    case 'interested':
      return {
        label: 'Interest registered',
        note: 'You’re on the interest list. Wait for the organiser to confirm the lineup.',
      };
    case 'waitlisted':
      return {
        label: 'On waitlist',
        note: 'You’re waitlisted. If someone pulls out, the organiser can offer you the spot.',
      };
    case 'selected_pay':
      return {
        label: 'Pay to confirm',
        note: 'You were selected. Pay via Bizum/Revolut, then tap I’ve paid. The organiser must verify the transfer before session chat unlocks.',
      };
    case 'awaiting_verify':
      return {
        label: 'Waiting for organiser',
        note: 'You claimed payment. The organiser is checking Bizum/Revolut. Session chat unlocks after they confirm received.',
      };
    case 'paid':
      return {
        label: 'Place confirmed',
        note: 'Organiser verified your payment. You’re in. If life gets in the way, you can pull out with notice — no in-app refund; settle money with the organiser directly if needed.',
      };
    case 'withdrawn':
      return {
        label: 'Withdrawn',
        note: 'You pulled out of this mix-in. You can register interest again if a spot opens.',
      };
    default:
      return {
        label: 'Register interest',
        note: 'Register interest in this mix-in. The organiser confirms who plays.',
      };
  }
}

export default function SessionDetailScreen() {
  const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
  const { profile, user, offline } = useAuth();
  const { celebrate } = useCelebration();
  const isGuest = offline;
  const userId = user?.id ?? profile?.id ?? '';
  const displayName = profile?.display_name?.trim() || 'Player';

  const [session, setSession] = useState<SessionSummary | null>(null);
  const [myState, setMyState] = useState<MyRegistrationState>('none');
  const [organiser, setOrganiser] = useState(false);
  const [openSpots, setOpenSpots] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sid = Array.isArray(sessionId) ? sessionId[0] : sessionId;
    const gid = Array.isArray(id) ? id[0] : id;
    if (!gid || !sid) return;

    // Load session first so a registrants/group failure never blanks the whole page.
    let s: SessionSummary | null = null;
    try {
      s = await getSession(sid, isGuest);
      setSession(s);
    } catch (e) {
      setSession(null);
      setMessage(e instanceof Error ? e.message : 'Could not load mix-in');
      return;
    }
    if (!s) {
      setMessage('Mix-in not found — open it from Admin if you just created it.');
      return;
    }

    let regs: Awaited<ReturnType<typeof listRegistrants>> = [];
    try {
      regs = await listRegistrants(sid, gid, isGuest, { includeCancelled: true });
    } catch {
      regs = [];
    }

    try {
      const group = await getGroup(gid, userId, isGuest);
      setOrganiser(canOrganiseGroup(group, userId));
    } catch {
      setOrganiser(false);
    }

    const nextState = registrationStateForUser(regs, userId);
    setMyState(nextState);
    const locked = regs.filter(
      (r) =>
        r.status === 'paid' || r.status === 'selected' || r.status === 'payment_claimed',
    ).length;
    setOpenSpots(Math.max(0, s.max_players - locked));

    // First time you see you’re in the lineup → confetti
    if (nextState === 'selected_pay' || nextState === 'paid' || nextState === 'awaiting_verify') {
      const key = `selected:${sessionId}:${userId}`;
      if (await markCelebrated(key)) {
        celebrate({
          mark: 'IN',
          title: 'You’re in the mix-in!',
          body: nextState === 'paid'
            ? 'Place locked. Open session chat and make memories.'
            : 'Organiser picked you — pay to lock your spot.',
        });
        const unlocked = await syncAchievementsFromStats({ mixinsPlayed: 1 });
        if (unlocked[0]) {
          setTimeout(() => {
            celebrate({
              mark: unlocked[0]!.mark,
              title: unlocked[0]!.title,
              body: unlocked[0]!.body,
            });
          }, 3400);
        }
      }
    }
  }, [id, sessionId, isGuest, userId, celebrate]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onRegister() {
    if (!sessionId || !userId || (myState !== 'none' && myState !== 'withdrawn')) return;
    setBusy(true);
    setMessage(null);
    try {
      await registerForSession({
        sessionId,
        groupId: id!,
        userId,
        displayName,
        isGuest,
      });
      await revolutPulse(id);
      await load();
      setMessage('Interest registered. The organiser will confirm the lineup — you are not in yet.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not register');
    } finally {
      setBusy(false);
    }
  }

  function onWithdraw() {
    if (!sessionId || !userId) return;
    const paidNote =
      myState === 'paid' || myState === 'awaiting_verify'
        ? '\n\nThere is no automatic refund in the app. Sort money with the organiser outside Padel Nerdz if you need to.'
        : '';
    Alert.alert(
      'Can’t make it?',
      `We’ll free your spot so the organiser can bring someone else in.${paidNote}`,
      [
        { text: 'Stay in', style: 'cancel' },
        {
          text: 'Pull out',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                await withdrawFromSession({
                  sessionId,
                  groupId: id!,
                  userId,
                  displayName,
                  isGuest,
                });
                void success();
                setMessage('You’re out. The group chat was updated.');
                await load();
              } catch (e) {
                void warn();
                setMessage(e instanceof Error ? e.message : 'Could not withdraw');
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  }

  async function onNeedPlayer() {
    if (!sessionId || !id) return;
    setBusy(true);
    try {
      await postNeedPlayer({
        sessionId,
        groupId: id,
        organiserId: userId,
        organiserName: displayName,
        isGuest,
        spots: Math.max(1, openSpots),
      });
      void success();
      router.push(`/group/${id}/chat`);
    } catch (e) {
      void warn();
      setMessage(e instanceof Error ? e.message : 'Could not post');
    } finally {
      setBusy(false);
    }
  }

  function onPrimary() {
    void tap();
    if (myState === 'none' || myState === 'withdrawn') {
      void onRegister();
      return;
    }
    if (myState === 'selected_pay' && sessionId) {
      router.push(`/group/${id}/pay/${sessionId}`);
      return;
    }
    if (myState === 'paid' && session?.session_room_id) {
      router.push(`/group/${id}/session-room/${session.session_room_id}`);
    }
  }

  const copy = stateCopy(myState);
  const canWithdraw =
    myState === 'interested' ||
    myState === 'waitlisted' ||
    myState === 'selected_pay' ||
    myState === 'awaiting_verify' ||
    myState === 'paid';
  const primaryDisabled =
    myState === 'interested' ||
    myState === 'waitlisted' ||
    myState === 'awaiting_verify' ||
    (myState === 'paid' && !session?.session_room_id);

  return (
    <>
      <Stack.Screen options={{ title: session?.title ?? 'Mix-in', headerBackTitle: 'Back' }} />
      <Screen edges={['left', 'right', 'bottom']} contentStyle={styles.content}>
        {session ? (
          <>
            <View style={styles.card}>
              <Text style={styles.kicker}>{session.format.split('_').join(' ')}</Text>
              <Text style={styles.title}>{session.title}</Text>
              <Text style={styles.meta}>{new Date(session.starts_at).toLocaleString()}</Text>
              {session.venue_label ? <Text style={styles.meta}>{session.venue_label}</Text> : null}
              <Text style={styles.meta}>
                {session.courts} courts · {session.registered_count}/{session.max_players} interested
                {openSpots > 0 && (session.status === 'selected' || session.status === 'live')
                  ? ` · ${openSpots} spot${openSpots === 1 ? '' : 's'} open`
                  : ''}
              </Text>
              {session.price_cents != null ? (
                <Text style={styles.meta}>
                  {formatMoney(
                    priceBreakdown(
                      session.price_cents,
                      session.commission_cents ?? PLATFORM_FEE_CENTS,
                    ).playerTotalCents,
                  )}{' '}
                  per player
                </Text>
              ) : null}
              {myState !== 'none' ? (
                <View style={styles.statusPill}>
                  <Text style={styles.statusText}>{copy.label}</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.body}>{copy.note}</Text>

            <AppButton
              label={
                myState === 'none' || myState === 'withdrawn'
                  ? 'Register interest'
                  : myState === 'selected_pay'
                    ? 'Pay to confirm'
                    : myState === 'awaiting_verify'
                      ? 'Waiting for organiser'
                      : myState === 'paid'
                        ? 'Open session chat'
                        : copy.label
              }
              onPress={onPrimary}
              loading={busy}
              disabled={primaryDisabled}
            />

            {canWithdraw ? (
              <AppButton
                label="I can’t make it"
                variant="secondary"
                onPress={() => {
                  void tap();
                  onWithdraw();
                }}
                disabled={busy}
              />
            ) : null}

            {organiser ? (
              <View style={styles.orgBlock}>
                <Text style={styles.orgLabel}>Organiser</Text>
                <AppButton
                  label="Verify payments"
                  onPress={() => {
                    void tap();
                    router.push(`/group/${id}/verify-payments/${sessionId}`);
                  }}
                />
                <AppButton
                  label="Fill open spot"
                  variant="secondary"
                  onPress={() => {
                    void tap();
                    router.push(`/group/${id}/fill-spot/${sessionId}`);
                  }}
                />
                <AppButton
                  label="Post: need a player"
                  variant="ghost"
                  onPress={() => {
                    void tap();
                    void onNeedPlayer();
                  }}
                  disabled={busy}
                />
              </View>
            ) : null}

            {message ? <Text style={styles.message}>{message}</Text> : null}
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.title}>Mix-in unavailable</Text>
            <Text style={styles.meta}>
              {message ??
                'Couldn’t load this mix-in. Open Admin → your mix-in, or go back to chat.'}
            </Text>
            {id ? (
              <AppButton
                label="Open Admin"
                onPress={() => {
                  void tap();
                  router.push(`/group/${id}/admin`);
                }}
              />
            ) : null}
          </View>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  kicker: {
    ...typography.label,
    color: colors.accentGreen,
    textTransform: 'uppercase',
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  meta: {
    ...typography.body,
    color: colors.textSecondary,
  },
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.accentGreenDim,
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.35)',
  },
  statusText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 12,
    color: colors.accentGreen,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  orgBlock: { gap: spacing.sm },
  orgLabel: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 12,
    letterSpacing: 0.8,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  message: {
    ...typography.body,
    color: colors.accentGreen,
    lineHeight: 22,
  },
});
