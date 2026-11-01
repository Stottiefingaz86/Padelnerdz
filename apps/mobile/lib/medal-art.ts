import type { ImageSourcePropType } from 'react-native';

import type { AchievementId } from '@/lib/achievements';

/**
 * Holographic medal art. Drop PNGs in assets/achievements/{id}.png.
 * Every AchievementId should have art when available.
 */
const ART: Record<AchievementId, ImageSourcePropType> = {
  first_group: require('../assets/achievements/first_group.png'),
  first_mixin: require('../assets/achievements/first_mixin.png'),
  first_pay: require('../assets/achievements/first_pay.png'),
  mixins_5: require('../assets/achievements/mixins_5.png'),
  mixins_10: require('../assets/achievements/mixins_10.png'),
  mixins_25: require('../assets/achievements/mixins_25.png'),
  mixins_50: require('../assets/achievements/mixins_50.png'),
  mixins_100: require('../assets/achievements/mixins_100.png'),
  mixin_winner: require('../assets/achievements/mixin_winner.png'),
  wins_3: require('../assets/achievements/wins_3.png'),
  podium_5: require('../assets/achievements/podium_5.png'),
  group_rank_1: require('../assets/achievements/group_rank_1.png'),
  groups_3: require('../assets/achievements/groups_3.png'),
  reliable_5: require('../assets/achievements/reliable_5.png'),
  comeback: require('../assets/achievements/comeback.png'),
  host_first: require('../assets/achievements/host_first.png'),
  host_5: require('../assets/achievements/host_5.png'),
  most_improved: require('../assets/achievements/most_improved.png'),
};

export function medalArtFor(id: AchievementId | string | undefined): ImageSourcePropType | null {
  if (!id) return null;
  return ART[id as AchievementId] ?? null;
}
