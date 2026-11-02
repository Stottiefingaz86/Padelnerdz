import { colors, radii, spacing } from '@padel-nerdz/config';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderBack } from '@/components/HeaderBack';
import { useAuth } from '@/lib/auth';
import { select, tap } from '@/lib/feedback';
import { useGlassHeaderOffset } from '@/lib/layout';
import {
  fetchGroupLeaderboard,
  type LeaderboardPeriod,
  type LeaderboardRow,
} from '@/lib/points';

const PERIODS: { id: LeaderboardPeriod; label: string }[] = [
  { id: 'this_month', label: 'This month' },
  { id: 'last_year', label: 'Last year' },
  { id: 'all_time', label: 'All time' },
];

export default function GroupLeaderboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const headerOffset = useGlassHeaderOffset();
  const { profile, user, offline } = useAuth();
  const isGuest = offline;
  const viewerId = user?.id ?? profile?.id ?? '';

  const [period, setPeriod] = useState<LeaderboardPeriod>('all_time');
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !viewerId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGroupLeaderboard({
        groupId: id,
        period,
        viewerId,
        isGuest,
      });
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load leaderboard');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [id, period, viewerId, isGuest]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function openProfile(row: LeaderboardRow) {
    if (!id) return;
    void tap();
    router.push(`/group/${id}/member/${row.user_id}`);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Leaderboard',
          headerBackVisible: false,
          headerLeft: () => <HeaderBack fallbackHref={id ? `/group/${id}` : undefined} />,
        }}
      />
      <ScrollView
        style={styles.root}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerOffset, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <Text style={styles.kicker}>GROUP LADDER</Text>
        <Text style={styles.title}>Points from lifetime play</Text>
        <Text style={styles.sub}>
          Tap a player to view their profile, stats, add friend, or message.
        </Text>

        <View style={styles.segments}>
          {PERIODS.map((p) => {
            const on = period === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => {
                  void select();
                  setPeriod(p.id);
                }}
                style={[styles.seg, on && styles.segOn]}
              >
                <Text style={[styles.segText, on && styles.segTextOn]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.accentGreen} style={{ marginTop: 32 }} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : rows.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No points yet</Text>
            <Text style={styles.emptyBody}>
              Play a mix-in and confirm your place, the ladder fills as the group plays.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {rows.map((row) => (
              <Pressable
                key={row.user_id}
                style={[styles.row, row.is_you && styles.rowYou]}
                onPress={() => openProfile(row)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${row.display_name} profile`}
              >
                <Text style={styles.rank}>#{row.rank}</Text>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {row.display_name.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.copy}>
                  <Text style={styles.name} numberOfLines={1}>
                    {row.display_name}
                    {row.is_you ? ' · you' : ''}
                  </Text>
                  <Text style={styles.meta}>View profile · message</Text>
                </View>
                <Text style={styles.points}>{row.points}</Text>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  kicker: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.accentGreen,
  },
  title: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 26,
    letterSpacing: -0.5,
    color: colors.textPrimary,
  },
  sub: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginTop: -4,
  },
  segments: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  seg: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  segOn: {
    borderColor: 'rgba(200,255,46,0.45)',
    backgroundColor: 'rgba(200,255,46,0.1)',
  },
  segText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 12,
    color: colors.textMuted,
  },
  segTextOn: {
    color: colors.accentGreen,
  },
  list: {
    gap: 8,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rowYou: {
    borderColor: 'rgba(200,255,46,0.35)',
    backgroundColor: 'rgba(200,255,46,0.06)',
  },
  rank: {
    width: 36,
    fontFamily: 'Figtree_700Bold',
    fontSize: 15,
    color: colors.textSecondary,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.elevated,
  },
  avatarText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 16,
    color: colors.textPrimary,
  },
  copy: { flex: 1, gap: 2 },
  name: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  meta: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
  points: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 18,
    color: colors.accentGreen,
    minWidth: 36,
    textAlign: 'right',
  },
  chevron: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 22,
    color: colors.textMuted,
  },
  empty: {
    marginTop: 24,
    padding: 20,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 16,
    color: colors.textPrimary,
  },
  emptyBody: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  error: {
    marginTop: 24,
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
    color: colors.error,
  },
});
