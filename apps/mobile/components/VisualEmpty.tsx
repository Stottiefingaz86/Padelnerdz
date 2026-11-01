import { colors, radii, spacing } from '@padel-nerdz/config';
import {
  Image,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Action = { label: string; onPress: () => void; primary?: boolean };

type Props = {
  kicker?: string;
  title: string;
  body: string;
  actions?: Action[];
  /** Full-bleed photo — use brand / court stills from assets/images/empty/ */
  image?: ImageSourcePropType;
  /** cover crops; contain shows full artwork */
  imageFit?: 'cover' | 'contain';
  /**
   * Hero box aspect (width / height). Prefer this over heroHeight so the
   * bitmap can match the frame and never letterbox.
   */
  heroAspectRatio?: number;
  /** Fixed height fallback when aspect ratio is omitted */
  heroHeight?: number;
};

/**
 * Empty surfaces with a real photo hero + clear CTAs.
 * Copy sits under the image so branded stills aren’t covered.
 */
export function VisualEmpty({
  kicker,
  title,
  body,
  actions = [],
  image,
  imageFit = 'cover',
  heroAspectRatio = 16 / 9,
  heroHeight,
}: Props) {
  const heroBox =
    heroHeight != null
      ? { height: heroHeight }
      : { aspectRatio: heroAspectRatio };

  return (
    <View style={styles.wrap}>
      <View style={[styles.hero, heroBox]}>
        {image ? (
          <Image
            source={image}
            style={styles.heroImage}
            resizeMode={imageFit}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.heroFallback} />
        )}
      </View>

      {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>

      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              onPress={action.onPress}
              style={[styles.btn, action.primary ? styles.btnPrimary : styles.btnSecondary]}
            >
              <Text
                style={[
                  styles.btnText,
                  action.primary ? styles.btnTextPrimary : styles.btnTextSecondary,
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, paddingVertical: spacing.sm },
  hero: {
    width: '100%',
    position: 'relative',
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  heroFallback: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#1a1f18',
  },
  kicker: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.accentGreen,
    marginTop: 4,
  },
  title: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 26,
    letterSpacing: -0.6,
    color: colors.textPrimary,
    lineHeight: 32,
  },
  body: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  actions: { gap: 10, marginTop: 4 },
  btn: {
    minHeight: 52,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: colors.accentGreen },
  btnSecondary: {
    backgroundColor: colors.accentGreenDim,
    borderWidth: 1.5,
    borderColor: 'rgba(200,255,46,0.45)',
  },
  btnText: { fontFamily: 'Figtree_700Bold', fontSize: 15 },
  btnTextPrimary: { color: '#0B0D10' },
  btnTextSecondary: { color: colors.accentGreen },
});
