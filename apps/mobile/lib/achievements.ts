import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'pn.achievements.v1';
const CELEBRATED_KEY = 'pn.celebratedEvents.v1';

export type AchievementId =
  | 'first_mixin'
  | 'mixins_10'
  | 'mixins_50'
  | 'mixins_100'
  | 'mixin_winner'
  | 'group_rank_1'
  | 'most_improved'
  | 'first_group';

export type AchievementSymbol = {
  ios: string;
  android: string;
  web: string;
};

export type AchievementDef = {
  id: AchievementId;
  title: string;
  body: string;
  /** Short monogram shown in the badge (no emoji). */
  mark: string;
  symbol: AchievementSymbol;
};

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: 'first_mixin',
    title: 'First mix-in',
    body: 'You locked into your first session. The journey starts.',
    mark: '01',
    symbol: { ios: 'tennisball.fill', android: 'sports_tennis', web: 'sports_tennis' },
  },
  {
    id: 'mixins_10',
    title: '10 mix-ins',
    body: 'Double digits. You’re part of the circuit.',
    mark: '10',
    symbol: { ios: '10.circle.fill', android: 'filter_10', web: 'filter_10' },
  },
  {
    id: 'mixins_50',
    title: '50 mix-ins',
    body: 'Half a hundred. Club legend territory.',
    mark: '50',
    symbol: { ios: 'star.circle.fill', android: 'star', web: 'star' },
  },
  {
    id: 'mixins_100',
    title: '100 mix-ins',
    body: 'Century. Absolute padel nerd.',
    mark: '100',
    symbol: { ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' },
  },
  {
    id: 'mixin_winner',
    title: 'Mix-in winner',
    body: 'You took the session. Crown that form.',
    mark: 'W',
    symbol: { ios: 'crown.fill', android: 'emoji_events', web: 'emoji_events' },
  },
  {
    id: 'group_rank_1',
    title: 'Group #1',
    body: 'Top of the ladder in a group.',
    mark: '#1',
    symbol: { ios: 'trophy.fill', android: 'military_tech', web: 'military_tech' },
  },
  {
    id: 'most_improved',
    title: 'Most improved',
    body: 'Results climbed vs where you started.',
    mark: '↑',
    symbol: {
      ios: 'chart.line.uptrend.xyaxis',
      android: 'trending_up',
      web: 'trending_up',
    },
  },
  {
    id: 'first_group',
    title: 'Joined a group',
    body: 'You found your crew.',
    mark: 'G',
    symbol: { ios: 'person.3.fill', android: 'groups', web: 'groups' },
  },
];

export type UnlockedMap = Partial<Record<AchievementId, string>>; // iso date

async function loadUnlocked(): Promise<UnlockedMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as UnlockedMap) : {};
  } catch {
    return {};
  }
}

async function saveUnlocked(map: UnlockedMap) {
  await AsyncStorage.setItem(KEY, JSON.stringify(map));
}

export async function listAchievements(): Promise<
  (AchievementDef & { unlockedAt: string | null })[]
> {
  const unlocked = await loadUnlocked();
  return ACHIEVEMENT_DEFS.map((d) => ({
    ...d,
    unlockedAt: unlocked[d.id] ?? null,
  }));
}

/** Unlock if new — returns defs that just unlocked (for confetti). */
export async function unlockAchievements(
  ids: AchievementId[],
): Promise<AchievementDef[]> {
  const unlocked = await loadUnlocked();
  const fresh: AchievementDef[] = [];
  const now = new Date().toISOString();
  for (const id of ids) {
    if (unlocked[id]) continue;
    unlocked[id] = now;
    const def = ACHIEVEMENT_DEFS.find((d) => d.id === id);
    if (def) fresh.push(def);
  }
  if (fresh.length) await saveUnlocked(unlocked);
  return fresh;
}

export async function syncAchievementsFromStats(input: {
  mixinsPlayed: number;
  groupRank?: number | null;
  isWinner?: boolean;
  improved?: boolean;
  joinedGroup?: boolean;
}): Promise<AchievementDef[]> {
  const ids: AchievementId[] = [];
  if (input.joinedGroup) ids.push('first_group');
  if (input.mixinsPlayed >= 1) ids.push('first_mixin');
  if (input.mixinsPlayed >= 10) ids.push('mixins_10');
  if (input.mixinsPlayed >= 50) ids.push('mixins_50');
  if (input.mixinsPlayed >= 100) ids.push('mixins_100');
  if (input.isWinner) ids.push('mixin_winner');
  if (input.groupRank === 1) ids.push('group_rank_1');
  if (input.improved) ids.push('most_improved');
  return unlockAchievements(ids);
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
