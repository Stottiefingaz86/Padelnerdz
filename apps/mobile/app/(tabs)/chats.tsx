import { colors, radii, spacing } from '@padel-nerdz/config';
import { useFocusEffect, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatListRow } from '@/components/chat/ChatListRow';
import { VisualEmpty } from '@/components/VisualEmpty';
import { useAuth } from '@/lib/auth';
import { previewForGroup, subscribeChat } from '@/lib/chat';
import { unreadCountForGroup } from '@/lib/chat-read';
import { listMyDmThreads, type DmThread } from '@/lib/dm';
import { subscribeDemoStore } from '@/lib/demo-store';
import { select, tap } from '@/lib/feedback';
import { listMyGroups, type GroupSummary } from '@/lib/groups';
import { resolveMediaDisplayUrl } from '@/lib/media';
import { listGroupSessions } from '@/lib/sessions';

type Filter = 'all' | 'groups' | 'mixins' | 'dms' | 'unread';

type ChatRow =
  | {
      kind: 'group';
      id: string;
      title: string;
      preview: string;
      time: string;
      unread: number;
      memberCount: number;
      imageUri: string | null;
    }
  | {
      kind: 'session';
      id: string;
      title: string;
      preview: string;
      time: string;
      unread: number;
      groupId: string;
      roomId: string;
    }
  | {
      kind: 'dm';
      id: string;
      title: string;
      preview: string;
      time: string;
      unread: number;
    };

function timeLabel(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'groups', label: 'Groups' },
  { id: 'mixins', label: 'Mix-ins' },
  { id: 'dms', label: 'DMs' },
  { id: 'unread', label: 'Unread' },
];

export default function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const { profile, user, signOut , offline } = useAuth();
  const isGuest = offline;
  const userId = user?.id ?? profile?.id ?? '';

  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [groupAvatars, setGroupAvatars] = useState<Record<string, string | null>>({});
  const [sessionRooms, setSessionRooms] = useState<
    { id: string; title: string; groupId: string; roomId: string; updatedAt: string }[]
  >([]);
  const [dms, setDms] = useState<DmThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [unreadByGroup, setUnreadByGroup] = useState<Record<string, number>>({});

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [mine, threads] = await Promise.all([
        listMyGroups(userId, isGuest),
        listMyDmThreads(userId, isGuest),
      ]);
      setGroups(mine);
      const avatarEntries = await Promise.all(
        mine.map(async (g) => {
          const raw = g.avatar_url || g.cover_url;
          return [g.id, await resolveMediaDisplayUrl(raw)] as const;
        }),
      );
      setGroupAvatars(Object.fromEntries(avatarEntries));
      setDms(threads);
      const unreadEntries = await Promise.all(
        mine.map(async (g) => [g.id, await unreadCountForGroup(g.id, userId)] as const),
      );
      setUnreadByGroup(Object.fromEntries(unreadEntries));
      const rooms: {
        id: string;
        title: string;
        groupId: string;
        roomId: string;
        updatedAt: string;
      }[] = [];
      for (const g of mine) {
        const sessions = await listGroupSessions(g.id, isGuest);
        for (const s of sessions) {
          if (s.session_room_id) {
            rooms.push({
              id: s.id,
              title: s.title,
              groupId: g.id,
              roomId: s.session_room_id,
              updatedAt: s.starts_at,
            });
          }
        }
      }
      setSessionRooms(rooms);
    } catch {
      // Keep last good list; avoid uncaught promise alerts on transient API errors.
    } finally {
      setLoading(false);
    }
  }, [userId, isGuest]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      const unsub = subscribeDemoStore(() => void refresh());
      const unsub2 = subscribeChat(() => void refresh());
      return () => {
        unsub();
        unsub2();
      };
    }, [refresh]),
  );

  const rows: ChatRow[] = useMemo(() => {
    const groupRows: ChatRow[] = groups.map((group) => {
      const preview = previewForGroup(group.id);
      const body = preview?.body ?? 'Tap to open group chat';
      return {
        kind: 'group',
        id: group.id,
        title: group.name,
        preview: body,
        time: timeLabel(preview?.at ?? group.created_at),
        unread: unreadByGroup[group.id] ?? 0,
        memberCount: group.member_count,
        imageUri: groupAvatars[group.id] ?? null,
      };
    });

    const sessionRows: ChatRow[] = sessionRooms.map((room) => ({
      kind: 'session',
      id: room.roomId,
      title: room.title,
      preview: 'Private mix-in room',
      time: timeLabel(room.updatedAt),
      unread: 0,
      groupId: room.groupId,
      roomId: room.roomId,
    }));

    const dmRows: ChatRow[] = dms.map((dm) => ({
      kind: 'dm',
      id: dm.id,
      title: dm.peer_name,
      preview: dm.preview,
      time: timeLabel(dm.last_message_at),
      unread: 0,
    }));

    return [...dmRows, ...groupRows, ...sessionRows].sort((a, b) => {
      // Keep relative order; DMs already sorted by last_message
      if (a.kind === 'dm' && b.kind !== 'dm') return -1;
      if (a.kind !== 'dm' && b.kind === 'dm') return 1;
      return 0;
    });
  }, [groups, groupAvatars, sessionRooms, dms, unreadByGroup]);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'groups':
        return rows.filter((r) => r.kind === 'group');
      case 'mixins':
        return rows.filter((r) => r.kind === 'session');
      case 'dms':
        return rows.filter((r) => r.kind === 'dm');
      case 'unread':
        return rows.filter((r) => r.unread > 0);
      default:
        return rows;
    }
  }, [rows, filter]);

  const showFirstRun = !loading && filter === 'all' && rows.length === 0;

  function openJoin() {
    void tap();
    router.push('/join');
  }

  function openCreate() {
    void tap();
    router.push('/group/create');
  }

  async function openSignup() {
    void tap();
    await signOut();
    router.replace('/(auth)/phone');
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={openJoin} style={styles.joinCta} hitSlop={6}>
            <Text style={styles.joinCtaText}>Join Group</Text>
          </Pressable>
          <Pressable onPress={openCreate} style={styles.newBtn} hitSlop={6}>
            <Text style={styles.newBtnText}>＋</Text>
          </Pressable>
        </View>
      </View>

      {isGuest ? (
        <Pressable style={styles.guestBanner} onPress={() => void openSignup()}>
          <View style={styles.guestCopy}>
            <Text style={styles.guestTitle}>Demo mode</Text>
            <Text style={styles.guestBody}>Create a real account with your phone</Text>
          </View>
          <Text style={styles.guestAction}>Sign up</Text>
        </Pressable>
      ) : null}

      {!showFirstRun ? (
        <View style={styles.filters}>
          {FILTERS.map((item) => {
            const on = filter === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  void select();
                  setFilter(item.id);
                }}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {loading ? <ActivityIndicator color={colors.accentGreen} style={{ marginTop: 24 }} /> : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        contentContainerStyle={filtered.length === 0 ? styles.emptyWrap : undefined}
        ListEmptyComponent={
          !loading ? (
            showFirstRun ? (
              <View style={styles.firstRun}>
                <VisualEmpty
                  image={require('../../assets/images/empty/brand-hero.jpg')}
                  kicker="GET STARTED"
                  title="Your padel community starts here"
                  body="Create a group for your club, or join one with an invite code. Mix-ins and courts live inside the group chat."
                  actions={[
                    { label: 'Create a group', primary: true, onPress: openCreate },
                    { label: 'Join Group', onPress: openJoin },
                  ]}
                />
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Nothing here</Text>
                <Text style={styles.emptyBody}>Try another filter, or create a group.</Text>
                <Pressable style={styles.secondaryCta} onPress={openCreate}>
                  <Text style={styles.secondaryCtaText}>Create a group</Text>
                </Pressable>
              </View>
            )
          ) : (
            <View />
          )
        }
        renderItem={({ item }) => {
          if (item.kind === 'group') {
            return (
              <ChatListRow
                title={item.title}
                subtitle={`Group · ${item.memberCount} members`}
                preview={item.preview}
                timeLabel={item.time}
                unread={item.unread}
                imageUri={item.imageUri}
                onPress={() => router.push(`/group/${item.id}/chat`)}
              />
            );
          }
          if (item.kind === 'dm') {
            return (
              <ChatListRow
                title={item.title}
                subtitle="Direct message"
                preview={item.preview}
                timeLabel={item.time}
                accent="#2A3A1A"
                unread={item.unread}
                onPress={() => router.push(`/dm/${item.id}`)}
              />
            );
          }
          return (
            <ChatListRow
              title={item.title}
              subtitle="Session room"
              preview={item.preview}
              timeLabel={item.time}
              accent="#1A3A4A"
              unread={item.unread}
              onPress={() =>
                router.push(`/group/${item.groupId}/session-room/${item.roomId}`)
              }
            />
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 34,
    letterSpacing: -1,
    color: colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 4,
  },
  joinCta: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: colors.accentGreenDim,
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinCtaText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 14,
    color: colors.accentGreen,
  },
  newBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBtnText: {
    color: '#0B0D10',
    fontSize: 22,
    marginTop: -1,
    fontFamily: 'Figtree_700Bold',
  },
  guestBanner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guestCopy: { flex: 1, gap: 2 },
  guestTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 13,
    color: colors.textPrimary,
  },
  guestBody: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
  },
  guestAction: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 13,
    color: colors.accentGreen,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.elevated,
  },
  chipOn: {
    backgroundColor: colors.accentGreenDim,
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.35)',
  },
  chipText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipTextOn: {
    color: colors.accentGreen,
  },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  firstRun: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
    gap: 10,
  },
  firstKicker: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.accentGreen,
  },
  firstTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 28,
    letterSpacing: -0.8,
    color: colors.textPrimary,
    lineHeight: 34,
  },
  firstBody: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 10,
  },
  primaryCta: {
    backgroundColor: colors.accentGreen,
    borderRadius: radii.pill,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 16,
    color: '#0B0D10',
  },
  secondaryCta: {
    borderRadius: radii.pill,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(200,255,46,0.5)',
    backgroundColor: colors.accentGreenDim,
  },
  secondaryCtaText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 16,
    color: colors.accentGreen,
  },
  empty: {
    paddingHorizontal: spacing.lg,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 22,
    color: colors.textPrimary,
  },
  emptyBody: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 8,
  },
});
