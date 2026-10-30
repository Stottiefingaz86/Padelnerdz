import { colors, radii, spacing } from '@padel-nerdz/config';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';

type Player = { user_id: string; display_name: string; reliability?: number };

type Props = {
  title?: string;
  players: Player[];
};

export function PlayersCard({ title = 'Confirmed players', players }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.botRow}>
          <View style={styles.botAvatar}>
            <Text style={styles.botMark}>PN</Text>
          </View>
          <Text style={styles.botName}>Padel Nerdz</Text>
        </View>
        <Text style={styles.kicker}>LINEUP</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{players.length} paid · ready to play</Text>
        <View style={styles.list}>
          {players.map((p, i) => (
            <View key={p.user_id} style={styles.row}>
              <Text style={styles.rank}>{i + 1}</Text>
              <Avatar name={p.display_name} size={32} />
              <Text style={styles.name} numberOfLines={1}>
                {p.display_name}
              </Text>
              {p.reliability != null ? (
                <Text style={styles.rel}>{Math.round(p.reliability)}%</Text>
              ) : null}
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
    marginBottom: 8,
  },
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: {
    width: 18,
    fontFamily: 'Figtree_700Bold',
    fontSize: 13,
    color: colors.textMuted,
  },
  name: {
    flex: 1,
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  rel: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 12,
    color: colors.textMuted,
  },
});
