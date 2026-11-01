import { colors } from '@padel-nerdz/config';
import {
  Image,
  type ImageSourcePropType,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import type { AchievementId, MissionTier } from '@/lib/achievements';
import { medalArtFor } from '@/lib/medal-art';

const TIER: Record<
  MissionTier,
  { ring: string; disc: string; mark: string; rim: string }
> = {
  bronze: {
    ring: '#A66B3F',
    disc: '#6B4423',
    mark: '#F0D0B0',
    rim: 'rgba(166,107,63,0.55)',
  },
  silver: {
    ring: '#A8B4C4',
    disc: '#4A5564',
    mark: '#E8EEF5',
    rim: 'rgba(168,180,196,0.55)',
  },
  gold: {
    ring: '#D4AF37',
    disc: '#7A5C12',
    mark: '#FFE9A0',
    rim: 'rgba(212,175,55,0.6)',
  },
  platinum: {
    ring: '#6DCBFF',
    disc: '#1A3A4A',
    mark: '#C8FF2E',
    rim: 'rgba(109,203,255,0.55)',
  },
};

type Size = 'sm' | 'md' | 'lg' | 'hero';

const SIZES: Record<Size, { box: number; mark: number; ring: number }> = {
  sm: { box: 44, mark: 13, ring: 2 },
  md: { box: 64, mark: 16, ring: 0 },
  lg: { box: 80, mark: 20, ring: 0 },
  hero: { box: 120, mark: 26, ring: 0 },
};

type Props = {
  mark: string;
  tier: MissionTier;
  unlocked?: boolean;
  size?: Size;
  style?: ViewStyle;
  /** Prefer holographic PNG when available */
  achievementId?: AchievementId | string;
  image?: ImageSourcePropType | null;
};

/** Medal face: custom art when provided, otherwise code-drawn mark. */
export function MedalBadge({
  mark,
  tier,
  unlocked = true,
  size = 'md',
  style,
  achievementId,
  image,
}: Props) {
  const t = TIER[tier];
  const s = SIZES[size];
  const locked = !unlocked;
  const art = image ?? (achievementId ? medalArtFor(achievementId) : null);

  if (art) {
    return (
      <View
        style={[
          styles.artWrap,
          {
            width: s.box,
            height: s.box,
            opacity: locked ? 0.38 : 1,
          },
          !locked && styles.artShadow,
          style,
        ]}
      >
        <Image
          source={art}
          style={{ width: s.box, height: s.box }}
          resizeMode="contain"
          accessibilityLabel={mark}
        />
        {locked ? <View style={styles.artLock} pointerEvents="none" /> : null}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.outer,
        {
          width: s.box,
          height: s.box,
          borderRadius: s.box / 2,
          borderWidth: Math.max(s.ring, 2),
          borderColor: locked ? 'rgba(255,255,255,0.12)' : t.ring,
          backgroundColor: locked ? colors.surface : t.disc,
          opacity: locked ? 0.55 : 1,
        },
        !locked && { shadowColor: t.ring, shadowOpacity: 0.35, shadowRadius: 8 },
        style,
      ]}
    >
      <View
        style={[
          styles.inner,
          {
            borderColor: locked ? 'rgba(255,255,255,0.08)' : t.rim,
            backgroundColor: locked ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.22)',
          },
        ]}
      >
        <Text
          style={[
            styles.mark,
            {
              fontSize: s.mark,
              color: locked ? colors.textMuted : t.mark,
            },
          ]}
          numberOfLines={1}
        >
          {mark}
        </Text>
      </View>
      {!locked ? <View style={[styles.shine, { backgroundColor: t.rim }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  artWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  artShadow: {
    shadowColor: '#C8FF2E',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  artLock: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11,13,16,0.45)',
    borderRadius: 999,
  },
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  inner: {
    ...StyleSheet.absoluteFill,
    margin: 5,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    fontFamily: 'Figtree_700Bold',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  shine: {
    position: 'absolute',
    top: '14%',
    left: '18%',
    width: '36%',
    height: '18%',
    borderRadius: 99,
    opacity: 0.35,
  },
});
