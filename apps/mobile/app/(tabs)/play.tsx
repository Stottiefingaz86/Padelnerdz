import { colors, spacing } from '@padel-nerdz/config';
import { Screen } from '@padel-nerdz/ui';
import { useFocusEffect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ActionRow } from '@/components/ActionRow';
import { VisualEmpty } from '@/components/VisualEmpty';
import { useAuth } from '@/lib/auth';
import { subscribeDemoStore } from '@/lib/demo-store';
import { tap } from '@/lib/feedback';
import { listMyGroups } from '@/lib/groups';
import { listGroupSessions, type SessionSummary } from '@/lib/sessions';

type PlayItem = SessionSummary & { groupName: string };

export default function PlayScreen() {
  const { profile, user , offline } = useAuth();
  const isGuest = offline;
  const userId = user?.id ?? profile?.id ?? '';

  const [items, setItems] = useState<PlayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasGroups, setHasGroups] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const groups = await listMyGroups(userId, isGuest);
      setHasGroups(groups.length > 0);
      const nested = await Promise.all(
        groups.map(async (group) => {
          const sessions = await listGroupSessions(group.id, isGuest);
          return sessions.map((session) => ({ ...session, groupName: group.name }));
        }),
      );
      setItems(nested.flat().sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
    } finally {
      setLoading(false);
    }
  }, [userId, isGuest]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      if (isGuest) return subscribeDemoStore(() => void refresh());
      return undefined;
    }, [refresh, isGuest]),
  );

  return (
    <Screen scroll contentStyle={styles.content}>
      <Animated.View entering={FadeInDown.duration(280)} style={styles.header}>
        <Text style={styles.kicker}>COURT</Text>
        <Text style={styles.title}>Play</Text>
        <Text style={styles.subtitle}>Upcoming mix-ins across your groups.</Text>
      </Animated.View>

      {loading ? <ActivityIndicator color={colors.accentGreen} /> : null}

      {!loading && items.length === 0 ? (
        <VisualEmpty
          image={require('../../assets/images/empty/play-hero.jpg')}
          kicker="PLAY NOW"
          title={hasGroups ? 'No mix-ins yet' : 'Join a group to see courts'}
          body={
            hasGroups
              ? 'Create a mix-in from group admin, or wait for your organiser to post one.'
              : 'Play fills up once you’re in a group with upcoming mix-ins. Discover public groups or create your own.'
          }
          actions={
            hasGroups
              ? [
                  {
                    label: 'Open chats',
                    primary: true,
                    onPress: () => {
                      void tap();
                      router.push('/(tabs)/chats');
                    },
                  },
                  {
                    label: 'Discover more groups',
                    onPress: () => {
                      void tap();
                      router.push('/(tabs)/discover');
                    },
                  },
                ]
              : [
                  {
                    label: 'Discover groups',
                    primary: true,
                    onPress: () => {
                      void tap();
                      router.push('/(tabs)/discover');
                    },
                  },
                  {
                    label: 'Create a group',
                    onPress: () => {
                      void tap();
                      router.push('/group/create');
                    },
                  },
                ]
          }
        />
      ) : null}

      <View style={styles.list}>
        {items.map((item, index) => (
          <Animated.View key={item.id} entering={FadeInDown.delay(40 * index).duration(280)}>
            <ActionRow
              accent="blue"
              title={item.title}
              subtitle={`${item.groupName} · ${new Date(item.starts_at).toLocaleString()} · ${item.registered_count}/${item.max_players}`}
              onPress={() => router.push(`/group/${item.group_id}/session/${item.id}`)}
            />
          </Animated.View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.xs,
  },
  kicker: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.accentGreen,
  },
  title: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 34,
    letterSpacing: -1,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 4,
  },
  list: {
    gap: spacing.sm,
  },
});
