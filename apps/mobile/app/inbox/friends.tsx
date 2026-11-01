import { colors, spacing } from '@padel-nerdz/config';
import { TextField } from '@padel-nerdz/ui';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { HeaderBack } from '@/components/HeaderBack';
import { useAuth } from '@/lib/auth';
import { listMyDmThreads, openDmWithMember, type DmThread } from '@/lib/dm';
import { select, success, tap, warn } from '@/lib/feedback';
import {
  acceptFriendRequest,
  addFriendByTag,
  declineFriendRequest,
  friendDeepLink,
  friendQrImageUrl,
  getMyFriendTag,
  listFriendRequests,
  listFriends,
  removeFriend,
  type Friend,
  type FriendRequest,
} from '@/lib/friends';
import { useGlassHeaderOffset } from '@/lib/layout';

/** Friends, requests, QR — secondary to the Instagram-style Messages list. */
export default function InboxFriendsScreen() {
  const insets = useSafeAreaInsets();
  const headerOffset = useGlassHeaderOffset();
  const { profile, user, offline } = useAuth();
  const isGuest = offline;
  const userId = user?.id ?? profile?.id ?? '';

  const [myTag, setMyTag] = useState('');
  const [addTag, setAddTag] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [dms, setDms] = useState<DmThread[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [messagingId, setMessagingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const mine = await getMyFriendTag(profile?.display_name ?? undefined);
    setMyTag(mine);
    const [f, r, threads] = await Promise.all([
      listFriends(isGuest),
      listFriendRequests(isGuest),
      userId ? listMyDmThreads(userId, isGuest) : Promise.resolve([]),
    ]);
    setFriends(f);
    setRequests(r);
    setDms(threads);
  }, [profile?.display_name, userId, isGuest]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  async function onAdd() {
    setError(undefined);
    try {
      await addFriendByTag(addTag, isGuest);
      setAddTag('');
      void success();
      await refresh();
    } catch (e) {
      void warn();
      setError(e instanceof Error ? e.message : 'Could not send follow request');
    }
  }

  async function shareMyTag() {
    void tap();
    await Share.share({
      message: `Add me on Padel Nerdz: @${myTag}\n${friendDeepLink(myTag)}`,
      url: friendDeepLink(myTag),
    });
  }

  async function messageFriend(friend: Friend) {
    if (!userId || messagingId) return;
    setMessagingId(friend.id);
    try {
      const existing = dms.find((d) => d.peer_id === friend.id);
      if (existing) {
        router.push(`/dm/${existing.id}`);
        return;
      }
      const threadId = await openDmWithMember({
        peerId: friend.id,
        peerName: friend.display_name,
        groupId: null,
        actorId: userId,
        isGuest,
      });
      void success();
      router.push(`/dm/${threadId}`);
      await refresh();
    } catch (e) {
      void warn();
      setError(e instanceof Error ? e.message : 'Could not open message');
    } finally {
      setMessagingId(null);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Friends',
          headerBackVisible: false,
          headerLeft: () => <HeaderBack fallbackHref="/inbox" />,
        }}
      />
      <FlatList
        style={styles.root}
        data={friends}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: headerOffset,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: spacing.md,
          gap: 4,
        }}
        ListHeaderComponent={
          <View style={styles.head}>
            {requests.length > 0 ? (
              <View style={styles.block}>
                <Text style={styles.section}>Follow requests · {requests.length}</Text>
                {requests.map((req) => (
                  <View key={req.id} style={styles.row}>
                    <Avatar name={req.from_name} size={44} />
                    <View style={styles.copy}>
                      <Text style={styles.name}>{req.from_name}</Text>
                      <Text style={styles.meta}>@{req.from_tag}</Text>
                    </View>
                    <Pressable
                      style={styles.accept}
                      onPress={() => {
                        void tap();
                        void acceptFriendRequest(req.id, isGuest).then(() => {
                          void success();
                          void refresh();
                        });
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
                ))}
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardKicker}>YOUR TAG</Text>
              <Image source={{ uri: friendQrImageUrl(myTag || 'player') }} style={styles.qr} />
              <Text style={styles.tag}>@{myTag || '…'}</Text>
              <Pressable style={styles.share} onPress={() => void shareMyTag()}>
                <Text style={styles.shareText}>Share tag / QR</Text>
              </Pressable>
            </View>

            <TextField
              label="Follow by @tag"
              value={addTag}
              onChangeText={setAddTag}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="alex"
              error={error}
            />
            <Pressable
              style={styles.addBtn}
              onPress={() => {
                void select();
                void onAdd();
              }}
            >
              <Text style={styles.addText}>Send follow</Text>
            </Pressable>

            <Text style={styles.section}>Friends</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No friends yet</Text>
            <Text style={styles.empty}>
              Share your QR or @tag. After they approve your follow, you can message.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar name={item.display_name} size={44} />
            <View style={styles.copy}>
              <Text style={styles.name}>{item.display_name}</Text>
              <Text style={styles.meta}>@{item.friend_tag}</Text>
            </View>
            <Pressable
              style={styles.msgBtn}
              onPress={() => {
                void tap();
                void messageFriend(item);
              }}
              disabled={messagingId === item.id}
            >
              <Text style={styles.msgText}>
                {messagingId === item.id ? '…' : 'Message'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void tap();
                void removeFriend(item.id, isGuest).then(refresh);
              }}
            >
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </View>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  head: { gap: spacing.md, marginBottom: spacing.sm },
  block: { gap: 4 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    padding: spacing.lg,
    gap: 10,
  },
  cardKicker: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.accentGreen,
    alignSelf: 'flex-start',
  },
  qr: {
    width: 140,
    height: 140,
    borderRadius: 12,
    backgroundColor: colors.elevated,
  },
  tag: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 22,
    color: colors.accentGreen,
  },
  share: { paddingVertical: 8, paddingHorizontal: 12 },
  shareText: {
    fontFamily: 'Figtree_600SemiBold',
    color: colors.textPrimary,
  },
  addBtn: {
    backgroundColor: colors.accentGreen,
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    fontFamily: 'Figtree_700Bold',
    color: colors.background,
    fontSize: 16,
  },
  section: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 13,
    letterSpacing: 0.6,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: spacing.md,
    gap: 6,
  },
  emptyTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  empty: {
    color: colors.textMuted,
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  copy: { flex: 1, gap: 2, minWidth: 0 },
  name: {
    fontFamily: 'Figtree_600SemiBold',
    color: colors.textPrimary,
    fontSize: 16,
  },
  meta: {
    fontFamily: 'Figtree_400Regular',
    color: colors.textSecondary,
    fontSize: 13,
  },
  accept: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.accentGreen,
  },
  acceptText: {
    fontFamily: 'Figtree_700Bold',
    color: '#0B0D10',
    fontSize: 12,
  },
  decline: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.elevated,
  },
  declineText: {
    fontFamily: 'Figtree_600SemiBold',
    color: colors.textPrimary,
    fontSize: 12,
  },
  msgBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.accentGreenDim,
  },
  msgText: {
    fontFamily: 'Figtree_700Bold',
    color: colors.accentGreen,
    fontSize: 12,
  },
  remove: {
    fontFamily: 'Figtree_600SemiBold',
    color: colors.error,
    fontSize: 13,
  },
});
