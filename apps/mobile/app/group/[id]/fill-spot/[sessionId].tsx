import { colors, spacing } from '@padel-nerdz/config';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { useAuth } from '@/lib/auth';
import { select as hapticSelect, success, tap, warn } from '@/lib/feedback';
import { canOrganiseGroup, getGroup } from '@/lib/groups';
import { useGlassHeaderOffset } from '@/lib/layout';
import {
  getSession,
  listRegistrants,
  offerSessionSpot,
  postNeedPlayer,
  type Registrant,
} from '@/lib/sessions';

/**
 * Organiser fills a spot after someone can’t make it — pick from waitlist / interest.
 */
export default function FillSpotScreen() {
  const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
  const insets = useSafeAreaInsets();
  const headerOffset = useGlassHeaderOffset();
  const { profile, user, offline } = useAuth();
  const isGuest = offline;
  const userId = user?.id ?? profile?.id ?? '';
  const displayName = profile?.display_name?.trim() || 'Organiser';

  const [candidates, setCandidates] = useState<Registrant[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [title, setTitle] = useState('Fill open spot');
  const [openSpots, setOpenSpots] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !sessionId || !userId) return;
    const [group, session, regs] = await Promise.all([
      getGroup(id, userId, isGuest),
      getSession(sessionId, isGuest),
      listRegistrants(sessionId, id, isGuest),
    ]);
    if (!canOrganiseGroup(group, userId)) {
      router.replace(`/group/${id}/session/${sessionId}`);
      return;
    }
    if (session) {
      setTitle(session.title);
      const locked = regs.filter((r) => r.status === 'paid' || r.status === 'selected').length;
      setOpenSpots(Math.max(0, session.max_players - locked));
    }
    setCandidates(
      regs
        .filter((r) => r.status === 'waitlist' || r.status === 'registered')
        .sort((a, b) => b.reliability - a.reliability),
    );
  }, [id, sessionId, userId, isGuest]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const subtitle = useMemo(() => {
    if (openSpots <= 0) return 'Lineup looks full. If someone withdraws, come back here.';
    return `${openSpots} open spot${openSpots === 1 ? '' : 's'}. Offer it to a waitlisted or interested player — they still need to pay.`;
  }, [openSpots]);

  async function confirmOffer() {
    if (!id || !sessionId || !picked) {
      setError('Pick a player');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { name } = await offerSessionSpot({
        sessionId,
        groupId: id,
        replacementUserId: picked,
        organiserId: userId,
        isGuest,
      });
      void success();
      router.replace(`/group/${id}/chat`);
      // name used for feedback via chat card
      void name;
    } catch (e) {
      void warn();
      setError(e instanceof Error ? e.message : 'Could not offer spot');
    } finally {
      setLoading(false);
    }
  }

  async function onNeedPlayer() {
    if (!id || !sessionId) return;
    setLoading(true);
    try {
      await postNeedPlayer({
        sessionId,
        groupId: id,
        organiserId: userId,
        organiserName: displayName,
        isGuest,
        spots: Math.max(1, openSpots),
      });
      void success();
      router.replace(`/group/${id}/chat`);
    } catch (e) {
      void warn();
      setError(e instanceof Error ? e.message : 'Could not post');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Fill spot', headerBackTitle: 'Back' }} />
      <View style={[styles.root, { paddingBottom: insets.bottom + 16 }]}>
        <FlatList
          data={candidates}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingTop: headerOffset }]}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.heading}>{title}</Text>
              <Text style={styles.sub}>{subtitle}</Text>
              <Text style={styles.hint}>
                No in-app refunds when someone pulls out — players settle money outside the app if
                needed.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No reserves yet</Text>
              <Text style={styles.emptyBody}>
                Post in group chat that you need a player, or wait for more interest registrations.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const on = picked === item.user_id;
            return (
              <Pressable
                style={[styles.row, on && styles.rowOn]}
                onPress={() => {
                  void hapticSelect();
                  setPicked(item.user_id);
                  setError(null);
                }}
              >
                <View style={styles.copy}>
                  <Text style={styles.name}>{item.display_name}</Text>
                  <Text style={styles.meta}>
                    {item.status === 'waitlist' ? 'Waitlist' : 'Interested'} ·{' '}
                    {item.reliability ? `${item.reliability}%` : 'new'}
                    reliable
                  </Text>
                </View>
                <View style={[styles.radio, on && styles.radioOn]} />
              </Pressable>
            );
          }}
        />
        <View style={styles.footer}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AppButton
            label="Offer spot"
            onPress={() => {
              void tap();
              void confirmOffer();
            }}
            loading={loading}
            disabled={!picked || openSpots <= 0}
          />
          <AppButton
            label="Post: need a player"
            variant="ghost"
            onPress={() => {
              void tap();
              void onNeedPlayer();
            }}
            disabled={loading}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, gap: 8, paddingBottom: 24 },
  header: { gap: 8, marginBottom: spacing.md },
  heading: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 22,
    color: colors.textPrimary,
  },
  sub: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  hint: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
  empty: { padding: spacing.lg, gap: 8 },
  emptyTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 16,
    color: colors.textPrimary,
  },
  emptyBody: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  rowOn: {
    borderColor: colors.accentGreen,
    backgroundColor: colors.accentGreenDim,
  },
  copy: { flex: 1, gap: 2 },
  name: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
  },
  meta: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioOn: {
    borderColor: colors.accentGreen,
    backgroundColor: colors.accentGreen,
  },
  footer: {
    paddingHorizontal: spacing.md,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    paddingTop: 12,
  },
  error: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.error,
    textAlign: 'center',
  },
});
