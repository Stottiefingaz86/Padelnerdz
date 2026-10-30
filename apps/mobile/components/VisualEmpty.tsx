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
  /** cover crops; contain shows full artwork (wide globe art) */
  imageFit?: 'cover' | 'contain';
  heroHeight?: number;
};

/**
 * Empty surfaces with a real photo hero + clear CTAs.
 * Copy sits under the image so branded stills (logo on photo) aren’t covered.
 */
export function VisualEmpty({
  kicker,
  title,
  body,
  actions = [],
  image,
  imageFit = 'cover',
  heroHeight = 160,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.hero, { height: heroHeight }]}>
        {image ? (
          <Image
            source={image}
            style={[
              styles.heroImage,
              imageFit === 'contain' ? styles.heroContain : null,
            ]}
            resizeMode={imageFit}
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
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: '#0B0D10',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  heroContain: {
    // keep letterbox black so wide branded art isn’t crushed
  },
  heroFallback: {
    ...StyleSheet.absoluteFill,
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
