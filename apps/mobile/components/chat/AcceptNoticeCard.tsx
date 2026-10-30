import { colors, radii, spacing } from '@padel-nerdz/config';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  title: string;
  players: string[];
};

/** Bot card when organiser confirms lineup — lists who must pay next. */
export function AcceptNoticeCard({ title, players }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.botRow}>
          <View style={styles.botAvatar}>
            <Text style={styles.botMark}>PN</Text>
          </View>
          <Text style={styles.botName}>Padel Nerdz</Text>
        </View>
        <Text style={styles.kicker}>LINEUP SET</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>Selected players — pay to confirm. Courts unlock after payment.</Text>
        <View style={styles.list}>
          {players.map((name, i) => (
            <View key={`${name}-${i}`} style={styles.row}>
              <View style={styles.dot} />
              <Text style={styles.name}>{name}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', marginVertical: 6 },
  card: {
    borderRadius: radii.lg,
    backgroundColor: colors.elevated,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: 4,
  },
  botRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botMark: { fontFamily: 'Figtree_700Bold', fontSize: 10, color: '#0B0D10' },
  botName: { fontFamily: 'Figtree_700Bold', fontSize: 13, color: colors.accentGreen },
  kicker: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    letterSpacing: 0.9,
    color: colors.accentGreen,
  },
  title: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 18,
    color: colors.textPrimary,
  },
  sub: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  list: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentGreen,
  },
  name: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
  },
});
