import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSupabaseLoose, isSupabaseConfigured } from './supabase';
import { presentAchievementNotification } from './push';

const KEY = 'pn.achievements.v1';
const CELEBRATED_KEY = 'pn.celebratedEvents.v1';

export type MissionTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export type MissionMetric =
  | 'groups_joined'
  | 'mixins_paid'
  | 'wins'
  | 'podiums'
  | 'hosted'
  | 'closed_played'
  | 'group_top1_count'
  | 'no_shows_zero_streak'
  | 'flag';

export type AchievementId =
  | 'first_group'
  | 'first_mixin'
  | 'first_pay'
  | 'mixins_5'
  | 'mixins_10'
  | 'mixins_25'
  | 'mixins_50'
  | 'mixins_100'
  | 'mixin_winner'
  | 'wins_3'
  | 'podium_5'
  | 'group_rank_1'
  | 'groups_3'
  | 'reliable_5'
  | 'comeback'
  | 'host_first'
  | 'host_5'
  | 'most_improved';

/** @deprecated use AchievementId — kept for call-site compatibility */
export type AchievementSymbol = { ios: string; android: string; web: string };

export type AchievementDef = {
  id: AchievementId;
  title: string;
  body: string;
  /** Short monogram on the medal face */
  mark: string;
  tier: MissionTier;
  target: number;
  metric: MissionMetric;
  /** Legacy symbol fields unused by MedalBadge — kept for older imports */
  symbol?: AchievementSymbol;
};

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: 'first_group',
    title: 'Find your crew',
    body: 'Join your first padel group.',
    mark: 'G',
    tier: 'bronze',
    target: 1,
    metric: 'groups_joined',
  },
  {
    id: 'first_mixin',
    title: 'First mix-in',
    body: 'Lock into your first paid place.',
    mark: '01',
    tier: 'bronze',
    target: 1,
    metric: 'mixins_paid',
  },
  {
    id: 'first_pay',
    title: 'Paid in',
    body: 'Confirm a place with Stripe.',
    mark: '€',
    tier: 'bronze',
    target: 1,
    metric: 'mixins_paid',
  },
  {
    id: 'mixins_5',
    title: 'Warming up',
    body: 'Five mix-ins on the board.',
    mark: '5',
    tier: 'bronze',
    target: 5,
    metric: 'mixins_paid',
  },
  {
    id: 'mixins_10',
    title: 'Circuit regular',
    body: 'Double digits. You’re part of it.',
    mark: '10',
    tier: 'silver',
    target: 10,
    metric: 'mixins_paid',
  },
  {
    id: 'mixins_25',
    title: 'Club fixture',
    body: 'Twenty-five sessions deep.',
    mark: '25',
    tier: 'silver',
    target: 25,
    metric: 'mixins_paid',
  },
  {
    id: 'mixins_50',
    title: 'Half century',
    body: 'Club legend territory.',
    mark: '50',
    tier: 'gold',
    target: 50,
    metric: 'mixins_paid',
  },
  {
    id: 'mixins_100',
    title: 'Century',
    body: 'Absolute padel nerd.',
    mark: '100',
    tier: 'platinum',
    target: 100,
    metric: 'mixins_paid',
  },
  {
    id: 'mixin_winner',
    title: 'Mix-in winner',
    body: 'Take #1 in a session.',
    mark: 'W',
    tier: 'gold',
    target: 1,
    metric: 'wins',
  },
  {
    id: 'wins_3',
    title: 'Hat-trick',
    body: 'Three session wins.',
    mark: '3W',
    tier: 'gold',
    target: 3,
    metric: 'wins',
  },
  {
    id: 'podium_5',
    title: 'Podium hunter',
    body: 'Finish top 3 five times.',
    mark: 'P5',
    tier: 'silver',
    target: 5,
    metric: 'podiums',
  },
  {
    id: 'group_rank_1',
    title: 'Group #1',
    body: 'Top the ladder in a group.',
    mark: '#1',
    tier: 'platinum',
    target: 1,
    metric: 'group_top1_count',
  },
  {
    id: 'groups_3',
    title: 'Multi-crew',
    body: 'Join three different groups.',
    mark: '3G',
    tier: 'silver',
    target: 3,
    metric: 'groups_joined',
  },
  {
    id: 'reliable_5',
    title: 'Shows up',
    body: 'Complete five mix-ins without a no-show streak break.',
    mark: 'R5',
    tier: 'silver',
    target: 5,
    metric: 'closed_played',
  },
  {
    id: 'comeback',
    title: 'Comeback',
    body: 'Play again after a no-show.',
    mark: '↑',
    tier: 'bronze',
    target: 1,
    metric: 'flag',
  },
  {
    id: 'host_first',
    title: 'First host',
    body: 'Create your first mix-in.',
    mark: 'H',
    tier: 'bronze',
    target: 1,
    metric: 'hosted',
  },
  {
    id: 'host_5',
    title: 'Serial organiser',
    body: 'Host five mix-ins.',
    mark: 'H5',
    tier: 'gold',
    target: 5,
    metric: 'hosted',
  },
  {
    id: 'most_improved',
    title: 'Most improved',
    body: 'Results climbing vs where you started.',
    mark: '↑↑',
    tier: 'gold',
    target: 1,
    metric: 'flag',
  },
];

/** Alias for product copy */
export const MISSIONS = ACHIEVEMENT_DEFS;

export type UnlockedMap = Partial<Record<AchievementId, string>>;

export type MissionStats = {
  mixins_paid: number;
  wins: number;
  podiums: number;
  groups_joined: number;
  hosted: number;
  no_shows: number;
  closed_played: number;
  group_top1_count: number;
  /** Client flags */
  comeback?: boolean;
  improved?: boolean;
  joinedGroup?: boolean;
};

export type MissionProgress = AchievementDef & {
  unlockedAt: string | null;
  current: number;
  progress: number; // 0..1
};

async function loadLocalUnlocked(): Promise<UnlockedMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as UnlockedMap) : {};
  } catch {
    return {};
  }
}

async function saveLocalUnlocked(map: UnlockedMap) {
  await AsyncStorage.setItem(KEY, JSON.stringify(map));
}

function metricValue(stats: MissionStats, metric: MissionMetric): number {
  switch (metric) {
    case 'groups_joined':
      return stats.groups_joined;
    case 'mixins_paid':
      return stats.mixins_paid;
    case 'wins':
      return stats.wins;
    case 'podiums':
      return stats.podiums;
    case 'hosted':
      return stats.hosted;
    case 'closed_played':
      return stats.closed_played;
    case 'group_top1_count':
      return stats.group_top1_count;
    case 'no_shows_zero_streak':
      return stats.no_shows === 0 ? stats.closed_played : 0;
    case 'flag':
      return 0;
    default:
      return 0;
  }
}

function currentForMission(def: AchievementDef, stats: MissionStats): number {
  if (def.id === 'comeback') return stats.comeback ? 1 : 0;
  if (def.id === 'most_improved') return stats.improved ? 1 : 0;
  if (def.id === 'first_group' && stats.joinedGroup) {
    return Math.max(stats.groups_joined, 1);
  }
  return metricValue(stats, def.metric);
}

export async function listAchievements(
  stats?: MissionStats | null,
): Promise<MissionProgress[]> {
  const unlocked = await loadUnlockedMap();
  return progressFromUnlocked(unlocked, stats);
}

/** Medals for another player (group peer read). Falls back to empty unlocks. */
export async function listAchievementsForUser(
  userId: string,
  opts?: { isSelf?: boolean; isGuest?: boolean; stats?: MissionStats | null },
): Promise<MissionProgress[]> {
  if (opts?.isSelf) return listAchievements(opts.stats);
  if (opts?.isGuest || !isSupabaseConfigured || userId.startsWith('demo-') || userId === 'guest') {
    return progressFromUnlocked({}, opts?.stats);
  }
  try {
    const { data, error } = await getSupabaseLoose()
      .from('player_achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', userId);
    if (error) throw error;
    const unlocked: UnlockedMap = {};
    for (const row of data ?? []) {
      const id = row.achievement_id as AchievementId;
      if (ACHIEVEMENT_DEFS.some((d) => d.id === id)) {
        unlocked[id] = row.unlocked_at as string;
      }
    }
    return progressFromUnlocked(unlocked, opts?.stats);
  } catch {
    return progressFromUnlocked({}, opts?.stats);
  }
}

function progressFromUnlocked(
  unlocked: UnlockedMap,
  stats?: MissionStats | null,
): MissionProgress[] {
  const s: MissionStats = stats ?? {
    mixins_paid: 0,
    wins: 0,
    podiums: 0,
    groups_joined: 0,
    hosted: 0,
    no_shows: 0,
    closed_played: 0,
    group_top1_count: 0,
  };
  return ACHIEVEMENT_DEFS.map((d) => {
    const current = Math.min(currentForMission(d, s), d.target);
    const unlockedAt = unlocked[d.id] ?? null;
    return {
      ...d,
      unlockedAt,
      current: unlockedAt ? d.target : current,
      progress: unlockedAt ? 1 : Math.min(1, current / Math.max(1, d.target)),
    };
  });
}

async function loadUnlockedMap(): Promise<UnlockedMap> {
  const local = await loadLocalUnlocked();
  if (!isSupabaseConfigured) return local;
  try {
    const { data, error } = await getSupabaseLoose().rpc('list_my_achievements');
    if (error || !data) return local;
    const merged: UnlockedMap = { ...local };
    for (const row of data as { achievement_id: string; unlocked_at: string }[]) {
      const id = row.achievement_id as AchievementId;
      if (ACHIEVEMENT_DEFS.some((d) => d.id === id)) {
        merged[id] = row.unlocked_at;
      }
    }
    await saveLocalUnlocked(merged);
    return merged;
  } catch {
    return local;
  }
}

export async function unlockAchievements(
  ids: AchievementId[],
): Promise<AchievementDef[]> {
  const unlocked = await loadUnlockedMap();
  const fresh: AchievementDef[] = [];
  const now = new Date().toISOString();

  for (const id of ids) {
    if (unlocked[id]) continue;
    let at = now;
    if (isSupabaseConfigured) {
      try {
        const { data } = await getSupabaseLoose().rpc('claim_achievement', {
          p_achievement_id: id,
        });
        if (data === null) {
          // already on server
          unlocked[id] = now;
          continue;
        }
        if (typeof data === 'string') at = data;
      } catch {
        // fall through to local
      }
    }
    unlocked[id] = at;
    const def = ACHIEVEMENT_DEFS.find((d) => d.id === id);
    if (def) fresh.push(def);
  }
  if (fresh.length) await saveLocalUnlocked(unlocked);
  return fresh;
}

export async function fetchMissionStats(
  fallback?: Partial<MissionStats>,
): Promise<MissionStats> {
  const base: MissionStats = {
    mixins_paid: 0,
    wins: 0,
    podiums: 0,
    groups_joined: 0,
    hosted: 0,
    no_shows: 0,
    closed_played: 0,
    group_top1_count: 0,
    ...fallback,
  };
  if (!isSupabaseConfigured) return base;
  try {
    const { data, error } = await getSupabaseLoose().rpc('my_mission_stats');
    if (error || !data) return base;
    const j = data as Record<string, number>;
    return {
      ...base,
      mixins_paid: j.mixins_paid ?? 0,
      wins: j.wins ?? 0,
      podiums: j.podiums ?? 0,
      groups_joined: j.groups_joined ?? 0,
      hosted: j.hosted ?? 0,
      no_shows: j.no_shows ?? 0,
      closed_played: j.closed_played ?? 0,
      group_top1_count: j.group_top1_count ?? 0,
    };
  } catch {
    return base;
  }
}

/** Evaluate catalog vs stats — returns defs that just unlocked. */
export async function syncAchievementsFromStats(input: {
  mixinsPlayed?: number;
  groupRank?: number | null;
  isWinner?: boolean;
  improved?: boolean;
  joinedGroup?: boolean;
  comeback?: boolean;
  hosted?: number;
}): Promise<AchievementDef[]> {
  const stats = await fetchMissionStats({
    mixins_paid: input.mixinsPlayed ?? 0,
    wins: input.isWinner ? 1 : 0,
    groups_joined: input.joinedGroup ? 1 : 0,
    group_top1_count: input.groupRank === 1 ? 1 : 0,
    hosted: input.hosted ?? 0,
    improved: input.improved,
    joinedGroup: input.joinedGroup,
    comeback: input.comeback,
  });

  // Prefer server aggregates when higher
  if (input.mixinsPlayed != null) {
    stats.mixins_paid = Math.max(stats.mixins_paid, input.mixinsPlayed);
  }
  if (input.joinedGroup) stats.groups_joined = Math.max(stats.groups_joined, 1);
  if (input.groupRank === 1) stats.group_top1_count = Math.max(stats.group_top1_count, 1);
  if (input.isWinner) stats.wins = Math.max(stats.wins, 1);
  if (input.hosted != null) stats.hosted = Math.max(stats.hosted, input.hosted);
  stats.improved = input.improved;
  stats.comeback = input.comeback;
  stats.joinedGroup = input.joinedGroup;

  const ids: AchievementId[] = [];
  for (const def of ACHIEVEMENT_DEFS) {
    if (currentForMission(def, stats) >= def.target) ids.push(def.id);
  }
  return unlockAchievements(ids);
}

/** Celebrate + notify for newly unlocked missions. */
export async function presentFreshUnlocks(
  fresh: AchievementDef[],
  celebrate: (input: {
    title: string;
    body?: string;
    mark?: string;
    tier?: MissionTier;
    achievementId?: AchievementId;
  }) => void,
) {
  if (!fresh.length) return;
  const hero = fresh[0]!;
  celebrate({
    title: hero.title,
    body:
      fresh.length > 1
        ? `${hero.body} (+${fresh.length - 1} more)`
        : hero.body,
    mark: hero.mark,
    tier: hero.tier,
    achievementId: hero.id,
  });
  for (const def of fresh) {
    await presentAchievementNotification({
      title: `Mission unlocked · ${def.title}`,
      body: def.body,
    });
  }
}

/** One-shot celebrate flags (e.g. selected for session X). */
export async function markCelebrated(eventKey: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(CELEBRATED_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    if (map[eventKey]) return false;
    map[eventKey] = true;
    await AsyncStorage.setItem(CELEBRATED_KEY, JSON.stringify(map));
    return true;
  } catch {
    return true;
  }
}
