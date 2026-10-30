import {
  allMatchesScored,
  applyMatchScore,
  generateKingsAndQueensRound1,
  generateNextKingsAndQueensRound,
  resultsFromRound,
  type FixturePlayer,
  type FixtureRound,
} from '@padel-nerdz/domain';

import {
  getDemoFixtures,
  getDemoSession,
  listDemoRegistrations,
  maybeGenerateDemoFixturesAfterPayment,
  saveDemoFixtures,
} from './demo-store';
import { getSupabaseLoose, isSupabaseConfigured } from './supabase';

export type { FixtureRound, FixturePlayer };

export type ScoreStatus = 'proposed' | 'confirmed' | 'disputed' | null;

export type CourtScoreMeta = {
  court: number;
  status: ScoreStatus;
  proposed_by: string | null;
  confirmed_by: string | null;
};

async function loadPaidPlayers(sessionId: string): Promise<{
  players: FixturePlayer[];
  courts: number;
}> {
  const { data: session } = await getSupabaseLoose()
    .from('sessions')
    .select('id, courts')
    .eq('id', sessionId)
    .maybeSingle();
  if (!session) return { players: [], courts: 1 };

  const { data: regs } = await getSupabaseLoose()
    .from('session_registrations')
    .select('user_id, status, profiles(display_name)')
    .eq('session_id', sessionId)
    .eq('status', 'paid');

  const players: FixturePlayer[] = (regs ?? []).map((r: any) => ({
    user_id: r.user_id as string,
    display_name:
      (r.profiles as { display_name?: string | null } | null)?.display_name?.trim() ||
      'Player',
  }));

  return { players, courts: Math.max(1, (session.courts as number) ?? 1) };
}

async function saveLiveRound(sessionId: string, round: FixtureRound) {
  const { error } = await getSupabaseLoose().from('session_fixture_rounds').upsert(
    {
      session_id: sessionId,
      round: round.round,
      payload: round,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'session_id,round' },
  );
  if (error) throw error;
}

async function loadLatestLiveRound(sessionId: string): Promise<FixtureRound | null> {
  const { data, error } = await getSupabaseLoose()
    .from('session_fixture_rounds')
    .select('payload')
    .eq('session_id', sessionId)
    .order('round', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.payload) return null;
  return data.payload as FixtureRound;
}

export async function listCourtScoreMeta(
  sessionId: string,
  round: number,
): Promise<CourtScoreMeta[]> {
  if (!isSupabaseConfigured || sessionId.startsWith('demo-')) return [];
  const { data } = await getSupabaseLoose()
    .from('match_score_states')
    .select('court, status, proposed_by, confirmed_by')
    .eq('session_id', sessionId)
    .eq('round', round);
  return (data ?? []).map((r: any) => ({
    court: r.court as number,
    status: r.status as ScoreStatus,
    proposed_by: (r.proposed_by as string) ?? null,
    confirmed_by: (r.confirmed_by as string) ?? null,
  }));
}

/**
 * Fixtures only exist after payments — built from paid players.
 */
export async function ensureSessionFixtures(input: {
  sessionId: string;
  isGuest: boolean;
  force?: boolean;
}): Promise<FixtureRound | null> {
  if (input.isGuest || !isSupabaseConfigured || input.sessionId.startsWith('demo-')) {
    const existing = getDemoFixtures(input.sessionId);
    if (existing && !input.force) return existing;

    if (input.force) {
      const session = getDemoSession(input.sessionId);
      if (!session) return null;
      const paid = listDemoRegistrations(input.sessionId).filter((r) => r.status === 'paid');
      if (paid.length < 4) return existing ?? null;
      const players: FixturePlayer[] = paid
        .sort((a, b) => b.reliability - a.reliability)
        .map((r) => ({ user_id: r.user_id, display_name: r.display_name }));
      const round = generateKingsAndQueensRound1(players, session.courts);
      saveDemoFixtures(input.sessionId, round);
      return round;
    }

    maybeGenerateDemoFixturesAfterPayment(input.sessionId);
    return getDemoFixtures(input.sessionId) ?? null;
  }

  const existing = await loadLatestLiveRound(input.sessionId);
  if (existing && !input.force) return existing;

  const { players, courts } = await loadPaidPlayers(input.sessionId);
  if (players.length < 4) return existing ?? null;

  const round = generateKingsAndQueensRound1(players, courts);
  await saveLiveRound(input.sessionId, round);
  return round;
}

export async function getSessionFixtures(
  sessionId: string,
  isGuest: boolean,
): Promise<FixtureRound | null> {
  if (isGuest || !isSupabaseConfigured || sessionId.startsWith('demo-')) {
    return getDemoFixtures(sessionId) ?? null;
  }
  return loadLatestLiveRound(sessionId);
}

/** Propose a score (needs opponent/organiser confirm before next round). */
export async function setMatchScore(input: {
  sessionId: string;
  isGuest: boolean;
  court: number;
  scoreA: number;
  scoreB: number;
  userId?: string;
  organiserForce?: boolean;
}): Promise<FixtureRound | null> {
  const current = await getSessionFixtures(input.sessionId, input.isGuest);
  if (!current) return null;
  const next = applyMatchScore(current, input.court, input.scoreA, input.scoreB);

  if (input.isGuest || !isSupabaseConfigured || input.sessionId.startsWith('demo-')) {
    saveDemoFixtures(input.sessionId, next);
    return next;
  }

  await saveLiveRound(input.sessionId, next);

  const status = input.organiserForce ? 'confirmed' : 'proposed';
  await getSupabaseLoose().from('match_score_states').upsert(
    {
      session_id: input.sessionId,
      round: next.round,
      court: input.court,
      score_a: input.scoreA,
      score_b: input.scoreB,
      status,
      proposed_by: input.userId ?? null,
      confirmed_by: input.organiserForce ? input.userId ?? null : null,
      disputed_by: null,
      dispute_note: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'session_id,round,court' },
  );

  return next;
}

export async function confirmMatchScore(input: {
  sessionId: string;
  round: number;
  court: number;
  userId: string;
  isGuest: boolean;
}): Promise<void> {
  if (input.isGuest || !isSupabaseConfigured || input.sessionId.startsWith('demo-')) return;
  const { error } = await getSupabaseLoose()
    .from('match_score_states')
    .update({
      status: 'confirmed',
      confirmed_by: input.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', input.sessionId)
    .eq('round', input.round)
    .eq('court', input.court)
    .in('status', ['proposed', 'disputed']);
  if (error) throw error;
}

export async function disputeMatchScore(input: {
  sessionId: string;
  round: number;
  court: number;
  userId: string;
  note?: string;
  isGuest: boolean;
}): Promise<void> {
  if (input.isGuest || !isSupabaseConfigured || input.sessionId.startsWith('demo-')) return;
  const { error } = await getSupabaseLoose()
    .from('match_score_states')
    .update({
      status: 'disputed',
      disputed_by: input.userId,
      dispute_note: input.note ?? null,
      confirmed_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', input.sessionId)
    .eq('round', input.round)
    .eq('court', input.court);
  if (error) throw error;
}

export async function allCourtsConfirmed(
  sessionId: string,
  round: FixtureRound,
  isGuest: boolean,
): Promise<boolean> {
  if (!allMatchesScored(round)) return false;
  if (isGuest || !isSupabaseConfigured || sessionId.startsWith('demo-')) return true;
  const meta = await listCourtScoreMeta(sessionId, round.round);
  if (meta.length === 0) {
    // Legacy / first score without meta rows — treat scored as OK for beta
    return true;
  }
  return round.matches.every((m) => {
    const row = meta.find((x) => x.court === m.court);
    return row?.status === 'confirmed';
  });
}

export async function advanceToNextRound(input: {
  sessionId: string;
  isGuest: boolean;
  forceUnconfirmed?: boolean;
}): Promise<{ round: FixtureRound | null; error?: string }> {
  const current = await getSessionFixtures(input.sessionId, input.isGuest);
  if (!current) return { round: null, error: 'No fixtures yet — players must pay first' };
  if (!allMatchesScored(current)) {
    return { round: current, error: 'Enter a score on every court before generating the next round' };
  }
  if (!input.forceUnconfirmed) {
    const ok = await allCourtsConfirmed(input.sessionId, current, input.isGuest);
    if (!ok) {
      return {
        round: current,
        error: 'Every court needs a confirmed score (or organiser force) before next round',
      };
    }
  }
  const results = resultsFromRound(current);
  const next = generateNextKingsAndQueensRound(current, results);
  if (input.isGuest || !isSupabaseConfigured || input.sessionId.startsWith('demo-')) {
    saveDemoFixtures(input.sessionId, next);
  } else {
    await saveLiveRound(input.sessionId, next);
  }
  return { round: next };
}
