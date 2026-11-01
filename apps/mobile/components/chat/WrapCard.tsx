import { colors, spacing } from '@padel-nerdz/config';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  title: string;
  subtitle?: string;
  mediaUrl?: string | null;
  playerCount?: number;
  photoCount?: number;
  matchCount?: number;
  onOpen?: () => void;
};

/** Session wrap-up card posted to main group chat when admin closes the mix-in. */
export function WrapCard({
  title,
  subtitle,
  mediaUrl,
  playerCount,
  photoCount,
  matchCount,
  onOpen,
}: Props) {
  return (
    <Pressable style={styles.wrap} onPress={onOpen} disabled={!onOpen}>
      <View style={styles.card}>
        {mediaUrl ? (
          <Image source={{ uri: mediaUrl }} style={styles.media} />
        ) : (
          <View style={styles.mediaEmpty}>
            <Text style={styles.mediaEmptyKicker}>Session wrap</Text>
            <Text style={styles.mediaEmptyTitle} numberOfLines={2}>
              {title}
            </Text>
          </View>
        )}
        <Text style={styles.kicker}>Wrap-up</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        <View style={styles.stats}>
          {playerCount != null ? (
            <Text style={styles.meta}>{playerCount} players</Text>
          ) : null}
          {matchCount != null && matchCount > 0 ? (
            <Text style={styles.meta}>{matchCount} matches</Text>
          ) : null}
          {photoCount != null && photoCount > 0 ? (
            <Text style={styles.meta}>{photoCount} photos</Text>
          ) : null}
        </View>
        {onOpen ? (
          <View style={styles.cta}>
            <Text style={styles.ctaText}>Open slideshow</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 8 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    paddingBottom: spacing.md,
  },
  media: { width: '100%', height: 180, backgroundColor: colors.elevated },
  mediaEmpty: {
    minHeight: 160,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: '#12151A',
    justifyContent: 'flex-end',
    gap: 6,
    borderBottomWidth: 3,
    borderBottomColor: colors.accentGreen,
  },
  mediaEmptyKicker: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.accentGreen,
    textTransform: 'uppercase',
  },
  mediaEmptyTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 26,
    lineHeight: 30,
    color: colors.textPrimary,
  },
  kicker: {
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.accentGreen,
    textTransform: 'uppercase',
  },
  title: {
    marginHorizontal: spacing.md,
    marginTop: 4,
    fontFamily: 'Figtree_700Bold',
    fontSize: 18,
    color: colors.textPrimary,
  },
  sub: {
    marginHorizontal: spacing.md,
    marginTop: 4,
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  stats: {
    marginHorizontal: spacing.md,
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  meta: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 13,
    color: colors.textMuted,
  },
  cta: {
    marginTop: 14,
    marginHorizontal: spacing.md,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 15,
    color: '#0B0D10',
  },
});
