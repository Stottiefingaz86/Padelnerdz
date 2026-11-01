import type { ImageSourcePropType } from 'react-native';

import type { AchievementId } from '@/lib/achievements';

/**
 * Holographic medal art (batch 1). Missing ids fall back to drawn MedalBadge marks.
 * Drop new PNGs in assets/achievements/{id}.png and register here.
 */
const ART: Partial<Record<AchievementId, ImageSourcePropType>> = {
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
};

export function medalArtFor(id: AchievementId | string | undefined): ImageSourcePropType | null {
  if (!id) return null;
  return ART[id as AchievementId] ?? null;
}
