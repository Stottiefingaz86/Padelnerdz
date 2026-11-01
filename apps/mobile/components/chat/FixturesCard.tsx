import { colors, radii, spacing } from '@padel-nerdz/config';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type MatchRow = {
  court: number;
  label: string;
  team_a: string;
  team_b: string;
};

type Props = {
  round: number;
  matches: MatchRow[];
  onOpen: () => void;
  format?: string | null;
};

export function FixturesCard({ round, matches, onOpen, format }: Props) {
  const isTournament = format === 'tournament_by_wins';
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.botRow}>
          <View style={styles.botAvatar}>
            <Text style={styles.botMark}>PN</Text>
          </View>
          <Text style={styles.botName}>Padel Nerdz</Text>
        </View>
        <Text style={styles.kicker}>{isTournament ? 'TOURNAMENT' : 'COURTS'}</Text>
        <Text style={styles.title}>{isTournament ? `Stage ${round}` : `Round ${round}`}</Text>
        <Text style={styles.sub}>
          {isTournament
            ? 'Group tables · games won = points · then knockout'
            : 'Kings & Queens on top · win and you stay'}
        </Text>

        <View style={styles.matches}>
          {matches.map((m) => (
            <View key={m.court} style={styles.match}>
              <Text style={styles.court}>{m.label}</Text>
              <Text style={styles.team}>{m.team_a}</Text>
              <Text style={styles.vs}>vs</Text>
              <Text style={styles.team}>{m.team_b}</Text>
            </View>
          ))}
        </View>

        <Pressable onPress={onOpen} style={styles.cta}>
          <Text style={styles.ctaText}>Open courts & enter scores</Text>
        </Pressable>
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
    marginBottom: 10,
  },
  matches: { gap: 10, marginBottom: 12 },
  match: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: 2,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  court: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 12,
    color: colors.accentGreen,
    marginBottom: 4,
  },
  team: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 14,
    color: colors.textPrimary,
  },
  vs: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 11,
    color: colors.textMuted,
    marginVertical: 2,
  },
  cta: {
    backgroundColor: colors.accentGreen,
    borderRadius: radii.pill,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 15,
    color: '#0B0D10',
  },
});
