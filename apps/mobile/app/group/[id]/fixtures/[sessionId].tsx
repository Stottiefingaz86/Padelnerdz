import { colors, spacing } from '@padel-nerdz/config';
import { allMatchesScored } from '@padel-nerdz/domain';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/lib/auth';
import { select, success, tap, warn } from '@/lib/feedback';
import {
  advanceToNextRound,
  confirmMatchScore,
  disputeMatchScore,
  ensureSessionFixtures,
  getSessionFixtures,
  listCourtScoreMeta,
  setMatchScore,
  type CourtScoreMeta,
  type FixtureRound,
} from '@/lib/fixtures';
import { canOrganiseGroup, getGroup } from '@/lib/groups';
import { useGlassHeaderOffset } from '@/lib/layout';
import { getSession } from '@/lib/sessions';

export default function FixturesScreen() {
  const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
  const insets = useSafeAreaInsets();
  const headerOffset = useGlassHeaderOffset();
  const { profile, user, offline } = useAuth();
  const isGuest = offline;
  const userId = user?.id ?? profile?.id ?? '';

  const [round, setRound] = useState<FixtureRound | null>(null);
  const [title, setTitle] = useState('Fixtures');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftScores, setDraftScores] = useState<Record<number, { a: string; b: string }>>({});
  const [scoreMeta, setScoreMeta] = useState<CourtScoreMeta[]>([]);
  const [isOrganiser, setIsOrganiser] = useState(false);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const session = await getSession(sessionId, isGuest);
      if (session) setTitle(session.title);
      if (id && userId) {
        const g = await getGroup(id, userId, isGuest);
        setIsOrganiser(g ? canOrganiseGroup(g, userId) : false);
      }
      // Never invent courts from “accepted” alone — paid players only
      let fixtures = await getSessionFixtures(sessionId, isGuest);
      if (!fixtures) {
        fixtures = await ensureSessionFixtures({ sessionId, isGuest });
      }
      if (!fixtures) {
        setError('Courts unlock after players pay. Need at least 4 paid confirmations.');
        setRound(null);
        setScoreMeta([]);
      } else {
        setRound(fixtures);
        setScoreMeta(await listCourtScoreMeta(sessionId, fixtures.round));
        const drafts: Record<number, { a: string; b: string }> = {};
        for (const m of fixtures.matches) {
          drafts[m.court] = {
            a: m.score_a != null ? String(m.score_a) : '',
            b: m.score_b != null ? String(m.score_b) : '',
          };
        }
        setDraftScores(drafts);
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId, isGuest, id, userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function saveScore(court: number, force = false) {
    if (!sessionId) return;
    const draft = draftScores[court];
    const scoreA = Number(draft?.a);
    const scoreB = Number(draft?.b);
    if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) {
      void warn();
      setError('Enter both scores as numbers');
      return;
    }
    if (scoreA === scoreB) {
      void warn();
      setError('Scores can’t be tied — padel games need a winner');
      return;
    }
    void tap();
    const next = await setMatchScore({
      sessionId,
      isGuest,
      court,
      scoreA,
      scoreB,
      userId,
      organiserForce: force && isOrganiser,
    });
    setRound(next);
    if (next) setScoreMeta(await listCourtScoreMeta(sessionId, next.round));
    setError(null);
    void success();
  }

  async function onConfirm(court: number) {
    if (!sessionId || !round) return;
    void tap();
    await confirmMatchScore({
      sessionId,
      round: round.round,
      court,
      userId,
      isGuest,
    });
    setScoreMeta(await listCourtScoreMeta(sessionId, round.round));
    void success();
  }

  async function onDispute(court: number) {
    if (!sessionId || !round) return;
    void warn();
    await disputeMatchScore({
      sessionId,
      round: round.round,
      court,
      userId,
      isGuest,
      note: 'Disputed by player',
    });
    setScoreMeta(await listCourtScoreMeta(sessionId, round.round));
  }

  async function nextRound() {
    if (!sessionId) return;
    void select();
    const result = await advanceToNextRound({
      sessionId,
      isGuest,
      forceUnconfirmed: isOrganiser,
    });
    if (result.error) {
      void warn();
      setError(result.error);
      return;
    }
    setRound(result.round);
    if (result.round) {
      setScoreMeta([]);
      const drafts: Record<number, { a: string; b: string }> = {};
      for (const m of result.round.matches) {
        drafts[m.court] = { a: '', b: '' };
      }
      setDraftScores(drafts);
    }
    setError(null);
    void success();
  }

  const sorted = [...(round?.matches ?? [])].sort((a, b) => a.court - b.court);
  const ready = round ? allMatchesScored(round) : false;
  const totalCourts = sorted.length;

  return (
    <>
      <Stack.Screen options={{ title: 'Courts', headerBackTitle: 'Back' }} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentGreen} />
        </View>
      ) : (
        <ScrollView
          style={styles.root}
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingTop: headerOffset,
            paddingBottom: insets.bottom + 40,
            gap: 14,
          }}
        >
          <Text style={styles.heading}>{title}</Text>
          <Text style={styles.sub}>
            Round {round?.round ?? 1} · Kings at the top · Queens at the bottom · winners up,
            losers down · partners split
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {sorted.map((match, index) => {
            const isKings = match.court === 1;
            const isQueens = match.court === totalCourts && totalCourts > 1;
            const draft = draftScores[match.court] ?? { a: '', b: '' };
            const decided = match.winner === 'a' || match.winner === 'b';

            return (
              <View
                key={match.court}
                style={[
                  styles.courtCard,
                  isKings && styles.kingsCard,
                  isQueens && styles.queensCard,
                ]}
              >
                <View style={styles.courtHead}>
                  <View>
                    <Text style={styles.courtRank}>
                      {isKings ? '▲ KINGS' : isQueens ? '▼ QUEENS' : `#${match.court}`}
                    </Text>
                    <Text style={styles.courtLabel}>{match.label}</Text>
                  </View>
                  {decided ? (
                    <Text style={styles.scoreFinal}>
                      {match.score_a} – {match.score_b}
                    </Text>
                  ) : (
                    <Text style={styles.waiting}>Enter score</Text>
                  )}
                </View>

                <View style={styles.ladder}>
                  <TeamBlock
                    side="A"
                    nameA={match.team_a.player_a.display_name}
                    nameB={match.team_a.player_b.display_name}
                    won={match.winner === 'a'}
                    lost={match.winner === 'b'}
                  />
                  <Text style={styles.vs}>vs</Text>
                  <TeamBlock
                    side="B"
                    nameA={match.team_b.player_a.display_name}
                    nameB={match.team_b.player_b.display_name}
                    won={match.winner === 'b'}
                    lost={match.winner === 'a'}
                  />
                </View>

                <View style={styles.scoreRow}>
                  <TextInput
                    value={draft.a}
                    onChangeText={(v) =>
                      setDraftScores((prev) => ({
                        ...prev,
                        [match.court]: { ...draft, a: v.replace(/[^\d]/g, '') },
                      }))
                    }
                    keyboardType="number-pad"
                    inputMode="numeric"
                    placeholder="A"
                    placeholderTextColor={colors.textMuted}
                    cursorColor={colors.accentGreen}
                    selectionColor="rgba(200,255,46,0.28)"
                    keyboardAppearance="dark"
                    style={styles.scoreInput}
                  />
                  <Text style={styles.scoreDash}>–</Text>
                  <TextInput
                    value={draft.b}
                    onChangeText={(v) =>
                      setDraftScores((prev) => ({
                        ...prev,
                        [match.court]: { ...draft, b: v.replace(/[^\d]/g, '') },
                      }))
                    }
                    keyboardType="number-pad"
                    inputMode="numeric"
                    placeholder="B"
                    placeholderTextColor={colors.textMuted}
                    cursorColor={colors.accentGreen}
                    selectionColor="rgba(200,255,46,0.28)"
                    keyboardAppearance="dark"
                    style={styles.scoreInput}
                  />
                  <Pressable style={styles.saveScore} onPress={() => void saveScore(match.court)}>
                    <Text style={styles.saveScoreText}>{decided ? 'Update' : 'Propose'}</Text>
                  </Pressable>
                </View>

                {(() => {
                  const meta = scoreMeta.find((m) => m.court === match.court);
                  const status = meta?.status;
                  return (
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmLabel}>
                        {status === 'confirmed'
                          ? 'Confirmed'
                          : status === 'disputed'
                            ? 'Disputed — re-enter score'
                            : status === 'proposed'
                              ? 'Proposed — needs confirm'
                              : decided
                                ? 'Score saved'
                                : 'No score yet'}
                      </Text>
                      {status === 'proposed' && meta?.proposed_by !== userId ? (
                        <Pressable onPress={() => void onConfirm(match.court)}>
                          <Text style={styles.confirmBtn}>Confirm</Text>
                        </Pressable>
                      ) : null}
                      {status === 'proposed' || status === 'confirmed' ? (
                        <Pressable onPress={() => void onDispute(match.court)}>
                          <Text style={styles.disputeBtn}>Dispute</Text>
                        </Pressable>
                      ) : null}
                      {isOrganiser && status !== 'confirmed' && decided ? (
                        <Pressable onPress={() => void saveScore(match.court, true)}>
                          <Text style={styles.confirmBtn}>Force confirm</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })()}

                {index < sorted.length - 1 ? (
                  <Text style={styles.moveHint}>
                    Winners ↑ · Losers ↓ · partners split next round
                  </Text>
                ) : null}
              </View>
            );
          })}

          {round?.unassigned.length ? (
            <View style={styles.bench}>
              <Text style={styles.benchTitle}>Rest / waiting</Text>
              {round.unassigned.map((p) => (
                <View key={p.user_id} style={styles.benchRow}>
                  <Avatar name={p.display_name} size={32} />
                  <Text style={styles.benchName}>{p.display_name}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <Pressable
            style={[styles.nextBtn, !ready && styles.nextBtnDisabled]}
            onPress={() => void nextRound()}
            disabled={!ready}
          >
            <Text style={[styles.nextBtnText, !ready && styles.nextBtnTextDisabled]}>
              {ready ? 'Generate next round' : 'Score every court to unlock next round'}
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </>
  );
}

function TeamBlock({
  side,
  nameA,
  nameB,
  won,
  lost,
}: {
  side: string;
  nameA: string;
  nameB: string;
  won?: boolean;
  lost?: boolean;
}) {
  return (
    <View style={[styles.team, won && styles.teamWon, lost && styles.teamLost]}>
      <Text style={styles.teamSide}>Team {side}</Text>
      <View style={styles.player}>
        <Avatar name={nameA} size={34} />
        <Text style={styles.playerName} numberOfLines={1}>
          {nameA}
        </Text>
      </View>
      <View style={styles.player}>
        <Avatar name={nameB} size={34} />
        <Text style={styles.playerName} numberOfLines={1}>
          {nameB}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 24,
    color: colors.textPrimary,
  },
  sub: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  error: {
    fontFamily: 'Figtree_400Regular',
    color: colors.error,
  },
  courtCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 12,
  },
  kingsCard: {
    borderColor: colors.accentGreen,
    backgroundColor: '#141A10',
  },
  queensCard: {
    borderColor: colors.border,
    backgroundColor: '#141414',
  },
  courtHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courtRank: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.accentGreen,
  },
  courtLabel: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 18,
    color: colors.textPrimary,
    marginTop: 2,
  },
  scoreFinal: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 22,
    color: colors.accentGreen,
  },
  waiting: {
    fontFamily: 'Figtree_400Regular',
    color: colors.textMuted,
    fontSize: 13,
  },
  ladder: { gap: 8 },
  vs: {
    textAlign: 'center',
    fontFamily: 'Figtree_600SemiBold',
    color: colors.textMuted,
    fontSize: 12,
  },
  team: {
    backgroundColor: colors.elevated,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  teamWon: {
    borderColor: colors.accentGreen,
  },
  teamLost: {
    opacity: 0.55,
  },
  teamSide: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  player: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playerName: {
    flex: 1,
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreInput: {
    width: 56,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    textAlign: 'center',
    fontFamily: 'Figtree_700Bold',
    fontSize: 18,
  },
  scoreDash: {
    color: colors.textMuted,
    fontSize: 18,
  },
  saveScore: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveScoreText: {
    fontFamily: 'Figtree_700Bold',
    color: colors.background,
  },
  moveHint: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  confirmRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  confirmLabel: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
    minWidth: 120,
  },
  confirmBtn: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 13,
    color: colors.accentGreen,
  },
  disputeBtn: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 13,
    color: colors.error,
  },
  bench: {
    backgroundColor: colors.elevated,
    borderRadius: 14,
    padding: spacing.md,
    gap: 10,
  },
  benchTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  benchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benchName: {
    fontFamily: 'Figtree_400Regular',
    color: colors.textSecondary,
  },
  nextBtn: {
    marginTop: 8,
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  nextBtnDisabled: {
    backgroundColor: colors.elevated,
  },
  nextBtnText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 15,
    color: colors.background,
    textAlign: 'center',
  },
  nextBtnTextDisabled: {
    color: colors.textMuted,
  },
});
