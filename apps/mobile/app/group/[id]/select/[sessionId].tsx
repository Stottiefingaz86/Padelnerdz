import { colors, spacing } from '@padel-nerdz/config';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { select as hapticSelect, success, tap } from '@/lib/feedback';
import { useGlassHeaderOffset } from '@/lib/layout';
import {
  getSession,
  listRegistrants,
  selectPlayersForSession,
  type Registrant,
} from '@/lib/sessions';

const AVATAR_COLORS = ['#C8FF2E', '#9BE05A', '#FFD279', '#FF8A7A', '#B8FF6A', '#6BFFB0'];

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i) * (i + 1)) % 997;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function SelectPlayersScreen() {
  const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
  const insets = useSafeAreaInsets();
  const headerOffset = useGlassHeaderOffset();
  const { profile, user , offline } = useAuth();
  const isGuest = offline;
  const userId = user?.id ?? profile?.id ?? '';
  const displayName = profile?.display_name?.trim() || 'Organiser';

  const [regs, setRegs] = useState<Registrant[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [title, setTitle] = useState('Confirm lineup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !sessionId) return;
    const [session, list] = await Promise.all([
      getSession(sessionId, isGuest),
      listRegistrants(sessionId, id, isGuest),
    ]);
    if (session) {
      setMaxPlayers(session.max_players);
      setTitle(session.title);
    }
    const interested = list
      .filter((r) => r.status === 'registered' || r.status === 'selected')
      .sort((a, b) => b.reliability - a.reliability);
    setRegs(interested);
    setSelected(new Set(list.filter((r) => r.status === 'selected').map((r) => r.user_id)));
  }, [id, sessionId, isGuest]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const ranked = useMemo(() => regs, [regs]);

  function toggle(userIdToToggle: string) {
    void hapticSelect();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userIdToToggle)) next.delete(userIdToToggle);
      else {
        if (next.size >= maxPlayers) return prev;
        next.add(userIdToToggle);
      }
      return next;
    });
  }

  async function confirm() {
    if (!id || !sessionId || !userId) return;
    if (selected.size === 0) {
      setError('Select at least one player');
      return;
    }
    if (!isGuest) {
      try {
        const { getGroupPaymentSettings, isStripePayoutReady } = await import(
          '@/lib/payments'
        );
        const pay = await getGroupPaymentSettings(id, isGuest);
        if (!isStripePayoutReady(pay)) {
          setError('Connect your bank in Admin → Payments before confirming a paid lineup.');
          return;
        }
      } catch {
        // continue if settings unavailable
      }
    }
    setLoading(true);
    setError(null);
    try {
      await selectPlayersForSession({
        sessionId,
        groupId: id,
        organiserId: userId,
        displayName,
        selectedUserIds: Array.from(selected),
        isGuest,
      });
      void success();
      // Pay first, fixtures unlock after selected players confirm payment
      router.replace(`/group/${id}/chat`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not confirm selection');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Confirm lineup', headerBackTitle: 'Chat' }} />
      <View style={styles.root}>
        <FlatList
          data={ranked}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingTop: headerOffset }]}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.heading}>{title}</Text>
              <Text style={styles.sub}>
                Ranked by reliability. Tap to select, confirm with any number up to {maxPlayers}.
                Selected players pay next; courts generate after payments.
              </Text>
              <View style={styles.statRow}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{selected.size}</Text>
                  <Text style={styles.statLabel}>selected</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{ranked.length}</Text>
                  <Text style={styles.statLabel}>interested</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{maxPlayers}</Text>
                  <Text style={styles.statLabel}>max</Text>
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No interest yet. Share the mix-in in chat.</Text>
          }
          renderItem={({ item, index }) => {
            const on = selected.has(item.user_id);
            const letter = item.display_name.slice(0, 1).toUpperCase();
            const tint = colorFor(item.display_name);
            const rank = index + 1;
            return (
              <Pressable
                onPress={() => toggle(item.user_id)}
                style={[styles.row, on && styles.rowOn]}
              >
                <Text style={[styles.rank, on && styles.rankOn]}>#{rank}</Text>
                <View style={[styles.avatar, { backgroundColor: tint }]}>
                  <Text style={styles.avatarText}>{letter}</Text>
                </View>
                <View style={styles.copy}>
                  <Text style={styles.name}>{item.display_name}</Text>
                  <View style={styles.relRow}>
                    <View style={styles.relTrack}>
                      <View
                        style={[
                          styles.relFill,
                          { width: `${item.reliability > 0 ? item.reliability : 0}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.meta}>
                      {item.reliability > 0 ? `${item.reliability}%` : 'new'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.check, on && styles.checkOn]}>
                  {on ? <Text style={styles.checkMark}>✓</Text> : null}
                </View>
              </Pressable>
            );
          }}
        />

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            onPress={() => {
              void tap();
              void confirm();
            }}
            disabled={loading || selected.size === 0}
            style={[styles.confirm, (loading || selected.size === 0) && styles.confirmDisabled]}
          >
            <Text style={styles.confirmText}>
              {loading ? 'Confirming…' : `Confirm lineup · ${selected.size}`}
            </Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  list: { paddingBottom: 120 },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: 10,
  },
  heading: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 26,
    letterSpacing: -0.6,
    color: colors.textPrimary,
  },
  sub: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 4,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 22,
    color: colors.accentGreen,
  },
  statLabel: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 11,
    color: colors.textMuted,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: colors.border,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 40,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: spacing.md,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  rowOn: {
    borderColor: colors.accentGreen,
    backgroundColor: colors.accentGreenDim,
  },
  rank: {
    width: 28,
    fontFamily: 'Figtree_700Bold',
    fontSize: 13,
    color: colors.textMuted,
  },
  rankOn: { color: colors.accentGreen },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#0B0D10',
    fontFamily: 'Figtree_700Bold',
    fontSize: 18,
  },
  copy: { flex: 1, gap: 6 },
  name: {
    fontFamily: 'Figtree_600SemiBold',
    color: colors.textPrimary,
    fontSize: 16,
  },
  relRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  relTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.elevated,
    overflow: 'hidden',
  },
  relFill: {
    height: 4,
    backgroundColor: colors.accentGreen,
  },
  meta: {
    fontFamily: 'Figtree_400Regular',
    color: colors.textSecondary,
    fontSize: 12,
    width: 36,
    textAlign: 'right',
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: colors.accentGreen,
    borderColor: colors.accentGreen,
  },
  checkMark: {
    color: '#0B0D10',
    fontFamily: 'Figtree_700Bold',
    fontSize: 14,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    gap: 8,
  },
  confirm: {
    backgroundColor: colors.accentGreen,
    borderRadius: 24,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDisabled: { opacity: 0.4 },
  confirmText: {
    fontFamily: 'Figtree_700Bold',
    color: '#0B0D10',
    fontSize: 16,
  },
  error: { color: colors.error, textAlign: 'center' },
});
