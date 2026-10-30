import { colors, spacing } from '@padel-nerdz/config';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  title: string;
  subtitle?: string;
  mediaUrl?: string | null;
  playerCount?: number;
  onOpen?: () => void;
};

/** Session wrap-up card posted to main group chat when admin closes the mix-in. */
export function WrapCard({ title, subtitle, mediaUrl, playerCount, onOpen }: Props) {
  return (
    <Pressable style={styles.wrap} onPress={onOpen} disabled={!onOpen}>
      <View style={styles.card}>
        {mediaUrl ? (
          <Image source={{ uri: mediaUrl }} style={styles.media} />
        ) : (
          <View style={styles.mediaEmpty}>
            <Text style={styles.mediaEmptyText}>Session wrap</Text>
          </View>
        )}
        <Text style={styles.kicker}>Wrap-up</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        {playerCount != null ? (
          <Text style={styles.meta}>{playerCount} players · closed</Text>
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
    height: 120,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaEmptyText: {
    fontFamily: 'Figtree_700Bold',
    color: colors.accentGreen,
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
  meta: {
    marginHorizontal: spacing.md,
    marginTop: 8,
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textMuted,
  },
});
