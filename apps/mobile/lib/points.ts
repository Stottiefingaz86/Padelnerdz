import { getSupabaseLoose, isSupabaseConfigured } from './supabase';

export type PointEventKind =
  | 'paid_place'
  | 'best_finish_1'
  | 'best_finish_2'
  | 'best_finish_3'
  | 'session_closed_played'
  | 'no_show';

export type LeaderboardPeriod = 'all_time' | 'this_month' | 'last_year';

export type LeaderboardRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  points: number;
  rank: number;
  is_you?: boolean;
};

export async function awardPointEvent(input: {
  groupId: string;
  userId: string;
  kind: PointEventKind;
  sessionId?: string | null;
  isGuest: boolean;
}): Promise<void> {
  if (input.isGuest || !isSupabaseConfigured) {
    const { awardDemoPointEvent } = await import('./demo-store');
    awardDemoPointEvent({
      groupId: input.groupId,
      userId: input.userId,
      kind: input.kind,
      sessionId: input.sessionId ?? null,
    });
    return;
  }

  const { error } = await getSupabaseLoose().rpc('award_point_event', {
    p_group_id: input.groupId,
    p_user_id: input.userId,
    p_kind: input.kind,
    p_session_id: input.sessionId ?? null,
  });
  if (error) throw error;
}

export async function awardSessionClosedPlayed(input: {
  sessionId: string;
  isGuest: boolean;
}): Promise<void> {
  if (input.isGuest || !isSupabaseConfigured) return;
  const { error } = await getSupabaseLoose().rpc('award_session_closed_played', {
    p_session_id: input.sessionId,
  });
  if (error) console.warn('award_session_closed_played', error.message);
}

export async function awardSessionFinishes(input: {
  sessionId: string;
  finishes: { user_id: string; place: number }[];
  isGuest: boolean;
}): Promise<void> {
  if (input.isGuest || !isSupabaseConfigured || input.finishes.length === 0) return;
  const { error } = await getSupabaseLoose().rpc('award_session_finishes', {
    p_session_id: input.sessionId,
    p_finishes: input.finishes,
  });
  if (error) console.warn('award_session_finishes', error.message);
}

export async function fetchGroupLeaderboard(input: {
  groupId: string;
  period: LeaderboardPeriod;
  viewerId: string;
  isGuest: boolean;
}): Promise<LeaderboardRow[]> {
  if (input.isGuest || !isSupabaseConfigured || input.groupId.startsWith('demo-')) {
    const { listDemoLeaderboard } = await import('./demo-store');
    return listDemoLeaderboard(input.groupId, input.period, input.viewerId);
  }

  const { data, error } = await getSupabaseLoose().rpc('group_leaderboard', {
    p_group_id: input.groupId,
    p_period: input.period,
  });
  if (error) throw error;

  return ((data ?? []) as {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    points: number | string;
    rank: number | string;
  }[]).map((row) => ({
    user_id: row.user_id,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    points: Number(row.points) || 0,
    rank: Number(row.rank) || 0,
    is_you: row.user_id === input.viewerId,
  }));
}

/** All-time points map for member list enrichment. */
export async function fetchGroupAllTimePoints(
  groupId: string,
  viewerId: string,
  isGuest: boolean,
): Promise<Map<string, number>> {
  try {
    const rows = await fetchGroupLeaderboard({
      groupId,
      period: 'all_time',
      viewerId,
      isGuest,
    });
    return new Map(rows.map((r) => [r.user_id, r.points]));
  } catch {
    return new Map();
  }
}
