import { colors, radii, spacing } from '@padel-nerdz/config';
import { Screen } from '@padel-nerdz/ui';
import { useFocusEffect, router } from 'expo-router';
import { CalendarPlus, ChevronRight, QrCode } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SessionTicketCard, type TicketPlayer } from '@/components/chat/SessionTicketCard';
import { Icon } from '@/components/Icon';
import { VisualEmpty } from '@/components/VisualEmpty';
import { useAuth } from '@/lib/auth';
import { addSessionToCalendar } from '@/lib/calendar';
import { subscribeDemoStore } from '@/lib/demo-store';
import { tap, warn } from '@/lib/feedback';
import { listMyGroups } from '@/lib/groups';
import {
  listGroupSessions,
  listRegistrants,
  registrationStateForUser,
  type MyRegistrationState,
  type SessionSummary,
} from '@/lib/sessions';

type PlayItem = SessionSummary & {
  groupName: string;
  myState: MyRegistrationState;
  players: TicketPlayer[];
};

function whenLabel(iso: string) {
  return new Date(iso).toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PlayScreen() {
  const { profile, user, offline } = useAuth();
  const isGuest = offline;
  const userId = user?.id ?? profile?.id ?? '';

  const [items, setItems] = useState<PlayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasGroups, setHasGroups] = useState(false);
  const [ticketSession, setTicketSession] = useState<PlayItem | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const groups = await listMyGroups(userId, isGuest);
      setHasGroups(groups.length > 0);
      const nested = await Promise.all(
        groups.map(async (group) => {
          const sessions = await listGroupSessions(group.id, isGuest);
          return Promise.all(
            sessions.map(async (session) => {
              let myState: MyRegistrationState = 'none';
              let players: TicketPlayer[] = [];
              try {
                const regs = await listRegistrants(session.id, group.id, isGuest);
                myState = registrationStateForUser(regs, userId);
                players = regs
                  .filter((r) => r.status === 'paid' || r.status === 'selected')
                  .map((r) => ({
                    user_id: r.user_id,
                    display_name: r.display_name,
                    status: r.status,
                    checked_in_at: r.checked_in_at,
                  }));
              } catch {
                /* keep defaults */
              }
              return { ...session, groupName: group.name, myState, players };
            }),
          );
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

  async function onAddToCalendar(item: PlayItem) {
    void tap();
    try {
      await addSessionToCalendar({
        title: item.title,
        startsAt: item.starts_at,
        venue: item.venue_label,
      });
    } catch (e) {
      void warn();
      Alert.alert('Calendar', e instanceof Error ? e.message : 'Could not open calendar');
    }
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <Animated.View entering={FadeInDown.duration(280)} style={styles.header}>
        <Text style={styles.kicker}>YOUR MIX-INS</Text>
        <Text style={styles.title}>My Games</Text>
        <Text style={styles.subtitle}>
          Open a game to manage your place. Ticket and calendar appear once you’re confirmed.
        </Text>
      </Animated.View>

      {loading ? <ActivityIndicator color={colors.accentGreen} /> : null}

      {!loading && items.length === 0 ? (
        <VisualEmpty
          image={require('../../assets/images/empty/play-hero.jpg')}
          kicker="MY GAMES"
          title={hasGroups ? 'No games yet' : 'Join a group to see games'}
          body={
            hasGroups
              ? 'Create a mix-in from group admin, or wait for your organiser to post one.'
              : 'My Games fills up once you’re in a group with upcoming mix-ins. Discover public groups or create your own.'
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
        {items.map((item, index) => {
          const confirmed = item.myState === 'paid';
          return (
            <Animated.View key={item.id} entering={FadeInDown.delay(40 * index).duration(280)}>
              <Pressable
                style={({ pressed }) => [styles.gameCard, pressed && styles.gameCardPressed]}
                onPress={() => {
                  void tap();
                  router.push(`/group/${item.group_id}/session/${item.id}`);
                }}
                accessibilityRole="button"
                accessibilityHint="Opens mix-in details"
              >
                <View style={styles.gameCopy}>
                  <Text style={styles.gameGroup} numberOfLines={1}>
                    {item.groupName}
                  </Text>
                  <Text style={styles.gameTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.gameWhen} numberOfLines={1}>
                    {whenLabel(item.starts_at)}
                  </Text>
                  <Text style={styles.gameWhere} numberOfLines={1}>
                    {item.venue_label?.trim() || 'Venue TBC'}
                    {' · '}
                    {item.registered_count}/{item.max_players}
                    {confirmed ? ' · Confirmed' : ''}
                  </Text>
                </View>

                {confirmed ? (
                  <View style={styles.gameActions}>
                    <Pressable
                      style={styles.actionBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        void tap();
                        setTicketSession(item);
                      }}
                      hitSlop={6}
                      accessibilityLabel="Open ticket QR"
                    >
                      <Icon icon={QrCode} color={colors.accentGreen} size="md" />
                    </Pressable>
                    <Pressable
                      style={styles.actionBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        void onAddToCalendar(item);
                      }}
                      hitSlop={6}
                      accessibilityLabel="Add to calendar"
                    >
                      <Icon icon={CalendarPlus} color={colors.accentGreen} size="md" />
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.chevronWrap}>
                    <Icon icon={ChevronRight} color={colors.textMuted} size="md" strokeWidth={2.25} />
                  </View>
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      {ticketSession ? (
        <SessionTicketCard
          visible
          onClose={() => setTicketSession(null)}
          title={ticketSession.title}
          startsAt={ticketSession.starts_at}
          venue={ticketSession.venue_label}
          format={ticketSession.format}
          courts={ticketSession.courts}
          maxPlayers={ticketSession.max_players}
          players={ticketSession.players}
          viewerUserId={userId}
          sessionId={ticketSession.id}
          onAddToCalendar={() => void onAddToCalendar(ticketSession)}
        />
      ) : null}
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
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: radii.lg,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.22)',
  },
  gameCardPressed: {
    opacity: 0.88,
    backgroundColor: colors.surface,
  },
  gameCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  gameGroup: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.4,
    color: colors.accentGreen,
    textTransform: 'uppercase',
  },
  gameTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 17,
    color: colors.textPrimary,
  },
  gameWhen: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: 2,
  },
  gameWhere: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
  },
  chevronWrap: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
