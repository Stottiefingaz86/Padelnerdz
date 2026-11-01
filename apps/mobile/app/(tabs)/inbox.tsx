import { colors, spacing } from '@padel-nerdz/config';
import { router, useFocusEffect } from 'expo-router';
import { MessageCircle, Search, UserPlus, UserRoundPlus } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/lib/auth';
import { listMyDmThreads, type DmThread } from '@/lib/dm';
import { select, tap } from '@/lib/feedback';
import {
  acceptFriendRequest,
  declineFriendRequest,
  listFriendRequests,
  type FriendRequest,
} from '@/lib/friends';

function formatThreadTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) {
    return 'Yesterday';
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Instagram-style Messages inbox — thread list first, friends/QR live under People.
 */
export default function InboxTabScreen() {
  const insets = useSafeAreaInsets();
  const { profile, user, offline } = useAuth();
  const isGuest = offline;
  const userId = user?.id ?? profile?.id ?? '';

  const [query, setQuery] = useState('');
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [dms, setDms] = useState<DmThread[]>([]);

  const refresh = useCallback(async () => {
    const [r, threads] = await Promise.all([
      listFriendRequests(isGuest),
      userId ? listMyDmThreads(userId, isGuest) : Promise.resolve([]),
    ]);
    setRequests(r);
    setDms(threads);
  }, [userId, isGuest]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dms;
    return dms.filter(
      (d) =>
        d.peer_name.toLowerCase().includes(q) ||
        d.preview.toLowerCase().includes(q),
    );
  }, [dms, query]);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Inbox</Text>
        <Pressable
          onPress={() => {
            void tap();
            router.push('/inbox/friends');
          }}
          hitSlop={10}
          style={styles.headerIconBtn}
          accessibilityLabel="Friends and requests"
        >
          <Icon icon={UserPlus} color={colors.textPrimary} size="md" />
          {requests.length > 0 ? (
            <View style={styles.headerDot}>
              <Text style={styles.headerDotText}>
                {requests.length > 9 ? '9+' : requests.length}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.list,
            filtered.length === 0 ? styles.listGrow : null,
          ]}
          ListHeaderComponent={
            <View style={styles.listHead}>
              <View style={styles.searchWrap}>
                <Icon icon={Search} color={colors.textMuted} size={16} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search"
                  placeholderTextColor={colors.textMuted}
                  cursorColor={colors.accentGreen}
                  selectionColor="rgba(200,255,46,0.28)"
                  keyboardAppearance="dark"
                  underlineColorAndroid="transparent"
                  style={styles.search}
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
              </View>

              {requests.length > 0 ? (
                <Pressable
                  style={styles.requestsRow}
                  onPress={() => {
                    void select();
                    router.push('/inbox/friends');
                  }}
                >
                  <View style={styles.requestsAvatar}>
                    <Icon icon={UserRoundPlus} color={colors.accentGreen} size="md" />
                  </View>
                  <View style={styles.copy}>
                    <Text style={styles.requestsTitle}>Follow requests</Text>
                    <Text style={styles.requestsMeta}>
                      {requests.length} pending · Approve to unlock messaging
                    </Text>
                  </View>
                  <View style={styles.requestsBadge}>
                    <Text style={styles.requestsBadgeText}>{requests.length}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ) : null}

              {requests.length > 0
                ? requests.slice(0, 2).map((req) => (
                    <View key={req.id} style={styles.requestQuick}>
                      <Avatar name={req.from_name} size={44} />
                      <View style={styles.copy}>
                        <Text style={styles.name} numberOfLines={1}>
                          {req.from_name}
                        </Text>
                        <Text style={styles.meta} numberOfLines={1}>
                          @{req.from_tag}
                        </Text>
                      </View>
                      <Pressable
                        style={styles.accept}
                        onPress={() => {
                          void tap();
                          void acceptFriendRequest(req.id, isGuest).then(refresh);
                        }}
                      >
                        <Text style={styles.acceptText}>Approve</Text>
                      </Pressable>
                      <Pressable
                        style={styles.decline}
                        onPress={() => {
                          void tap();
                          void declineFriendRequest(req.id, isGuest).then(refresh);
                        }}
                      >
                        <Text style={styles.declineText}>Decline</Text>
                      </Pressable>
                    </View>
                  ))
                : null}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Icon icon={MessageCircle} color={colors.textMuted} size={36} />
              </View>
              <Text style={styles.emptyTitle}>Your messages</Text>
              <Text style={styles.emptyBody}>
                Send a message to a friend or organiser — chats show up here like Instagram DMs.
              </Text>
              <Pressable
                style={styles.emptyCta}
                onPress={() => {
                  void select();
                  router.push('/inbox/friends');
                }}
              >
                <Text style={styles.emptyCtaText}>Find people</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => {
            const unread = Boolean(item.unread);
            return (
              <Pressable
                style={styles.thread}
                onPress={() => {
                  void select();
                  router.push(`/dm/${item.id}`);
                }}
              >
                <Avatar name={item.peer_name} size={56} />
                <View style={styles.copy}>
                  <Text
                    style={[styles.name, unread && styles.nameUnread]}
                    numberOfLines={1}
                  >
                    {item.peer_name}
                  </Text>
                  <Text
                    style={[styles.preview, unread && styles.previewUnread]}
                    numberOfLines={1}
                  >
                    {item.preview}
                  </Text>
                </View>
                <View style={styles.trail}>
                  <Text style={[styles.time, unread && styles.timeUnread]}>
                    {formatThreadTime(item.last_message_at)}
                  </Text>
                  {unread ? <View style={styles.unreadDot} /> : <View style={styles.unreadSlot} />}
                </View>
              </Pressable>
            );
          }}
        />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 34,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  headerDot: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDotText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 9,
    color: '#0B0D10',
  },
  list: { paddingBottom: spacing.xxl },
  listGrow: { flexGrow: 1 },
  listHead: { gap: 4, marginBottom: 4 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.md,
    marginBottom: 10,
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.elevated,
  },
  search: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: 'Figtree_400Regular',
    fontSize: 16,
    paddingVertical: 0,
  },
  requestsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  requestsAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentGreenDim,
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestsTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  requestsMeta: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  requestsBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestsBadgeText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 12,
    color: '#0B0D10',
  },
  chevron: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 26,
    color: colors.textMuted,
    marginTop: -2,
  },
  requestQuick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  accept: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.accentGreen,
  },
  acceptText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 13,
    color: '#0B0D10',
  },
  decline: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.elevated,
  },
  declineText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 13,
    color: colors.textPrimary,
  },
  thread: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  name: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 15,
    color: colors.textPrimary,
  },
  nameUnread: {
    fontFamily: 'Figtree_700Bold',
  },
  meta: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
  },
  preview: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    color: colors.textMuted,
  },
  previewUnread: {
    fontFamily: 'Figtree_600SemiBold',
    color: colors.textPrimary,
  },
  trail: {
    alignItems: 'flex-end',
    gap: 8,
    minWidth: 52,
  },
  time: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
  timeUnread: {
    color: colors.accentGreen,
    fontFamily: 'Figtree_600SemiBold',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentGreen,
  },
  unreadSlot: {
    width: 8,
    height: 8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 48,
    gap: 10,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 22,
    color: colors.textPrimary,
  },
  emptyBody: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyCta: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  emptyCtaText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 15,
    color: colors.accentGreen,
  },
});
