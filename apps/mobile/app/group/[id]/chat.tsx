import { colors, spacing } from '@padel-nerdz/config';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AcceptNoticeCard } from '@/components/chat/AcceptNoticeCard';
import { ChatWallpaper } from '@/components/chat/ChatWallpaper';
import { MediaBubble } from '@/components/chat/MediaBubble';
import { MessageReactions } from '@/components/chat/MessageReactions';
import { HeaderBack } from '@/components/HeaderBack';
import { MixinCard } from '@/components/chat/MixinCard';
import { WrapCard } from '@/components/chat/WrapCard';
import { FlatPlusIcon, FlatSendIcon } from '@/components/FlatIcons';
import { useAuth } from '@/lib/auth';
import {
  listGroupMessages,
  sendGroupMessage,
  subscribeChat,
  type ChatMessage,
} from '@/lib/chat';
import { chatAlert, messageSent, revolutPulse, success, tap, warn } from '@/lib/feedback';
import { canOrganiseGroup, getGroup, listGroupMembers } from '@/lib/groups';
import { useGlassHeaderOffset } from '@/lib/layout';
import {
  listChannelReactions,
  type MessageReactionMap,
} from '@/lib/reactions';
import {
  ensurePaidSessionRoomAccess,
  getSession,
  listRegistrants,
  registerForSession,
  registrationStateForUser,
  type MyRegistrationState,
  type SessionSummary,
} from '@/lib/sessions';

export default function GroupChatScreen() {
  const headerOffset = useGlassHeaderOffset(20);
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { profile, user , offline } = useAuth();
  const isGuest = offline;
  const userId = user?.id ?? profile?.id ?? '';
  const displayName = profile?.display_name?.trim() || 'Player';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [busySession, setBusySession] = useState<string | null>(null);
  const [organiser, setOrganiser] = useState(false);
  const [membersCanPost, setMembersCanPost] = useState(true);
  const [title, setTitle] = useState('Group chat');
  const [memberCount, setMemberCount] = useState(0);
  const [memberPreview, setMemberPreview] = useState('');
  const [myStates, setMyStates] = useState<Record<string, MyRegistrationState>>({});
  const [lineupConfirmed, setLineupConfirmed] = useState<Record<string, boolean>>({});
  const [sessionMeta, setSessionMeta] = useState<Record<string, SessionSummary>>({});
  const [reactions, setReactions] = useState<MessageReactionMap>({});
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const lastAlertId = useRef<string | null>(null);
  const myStatesRef = useRef(myStates);
  const lineupConfirmedRef = useRef(lineupConfirmed);
  const sessionMetaRef = useRef(sessionMeta);
  myStatesRef.current = myStates;
  lineupConfirmedRef.current = lineupConfirmed;
  sessionMetaRef.current = sessionMeta;

  const refresh = useCallback(async () => {
    if (!id || !userId) return;
    const [msgs, group, people, reactionMap] = await Promise.all([
      listGroupMessages(id, userId, isGuest),
      getGroup(id, userId, isGuest),
      listGroupMembers(id, userId, isGuest),
      listChannelReactions({
        channelType: 'group',
        channelId: id,
        userId,
        isGuest,
      }).catch(() => ({}) as MessageReactionMap),
    ]);
    setMessages(msgs);
    setReactions(reactionMap);
    setMemberCount(Math.max(people.length, group?.member_count ?? 0));
    setMemberPreview(
      people
        .slice(0, 3)
        .map((p) => p.display_name.split(' ')[0])
        .join(', ') + (people.length > 3 ? '…' : ''),
    );
    if (group) {
      setTitle(group.name);
      const org = canOrganiseGroup(group, userId);
      setOrganiser(org);
      setMembersCanPost(group.members_can_post || org);
    }

    const sessionIds = Array.from(
      new Set(
        msgs
          .filter((m) => m.kind === 'mixin_card' || m.payload?.session_id)
          .map((m) => String(m.payload.session_id ?? ''))
          .filter(Boolean),
      ),
    );

    const meta: Record<string, SessionSummary> = {};
    const states: Record<string, MyRegistrationState> = {};
    const confirmed: Record<string, boolean> = {};
    for (const sessionId of sessionIds) {
      try {
        const session = await getSession(sessionId, isGuest);
        const regs = await listRegistrants(sessionId, id, isGuest);
        states[sessionId] = registrationStateForUser(regs, userId);
        // payment_claimed still means lineup was set — don't flip the card back to "Confirm lineup"
        confirmed[sessionId] = regs.some((r) =>
          r.status === 'selected' ||
          r.status === 'payment_claimed' ||
          r.status === 'paid',
        );
        if (session) {
          meta[sessionId] = {
            ...session,
            registered_count: regs.filter((r) => r.status !== 'waitlist').length,
          };
        }
      } catch {
        // Keep prior state so a list blip doesn’t wipe “You’re in” after I want to play.
        states[sessionId] = myStatesRef.current[sessionId] ?? 'none';
        confirmed[sessionId] = lineupConfirmedRef.current[sessionId] ?? false;
        if (sessionMetaRef.current[sessionId]) {
          meta[sessionId] = sessionMetaRef.current[sessionId]!;
        }
      }
    }
    setSessionMeta((prev) => ({ ...prev, ...meta }));
    setMyStates((prev) => ({ ...prev, ...states }));
    setLineupConfirmed((prev) => ({ ...prev, ...confirmed }));

    const newest = msgs[msgs.length - 1];
    if (
      newest &&
      newest.id !== lastAlertId.current &&
      !newest.mine &&
      (newest.kind === 'text' ||
        newest.kind === 'image' ||
        newest.kind === 'video' ||
        newest.kind === 'mixin_card' ||
        newest.kind === 'accept_notice' ||
        newest.kind === 'wrap_card')
    ) {
      lastAlertId.current = newest.id;
      void chatAlert(id);
    }
  }, [id, userId, isGuest]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    void refresh();
    return subscribeChat(() => {
      void refresh();
    });
  }, [refresh]);

  async function onSend() {
    if (!id || !userId || !draft.trim() || sending) return;
    if (!membersCanPost && !organiser) {
      Alert.alert('Read only', 'Only organisers can post in this group.');
      return;
    }
    setSending(true);
    try {
      await sendGroupMessage({
        groupId: id,
        userId,
        displayName,
        body: draft,
        isGuest,
      });
      setDraft('');
      void messageSent(id);
      await refresh();
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } finally {
      setSending(false);
    }
  }

  async function onRegister(sessionId: string) {
    if (!id || !userId) {
      Alert.alert('Sign in required', 'You need an account to register interest.');
      return;
    }
    if (!sessionId) {
      Alert.alert('Mix-in missing', 'Couldn’t find this mix-in. Open it from Admin.');
      return;
    }
    setBusySession(sessionId);
    // Optimistic — organiser “I want to play” should feel instant.
    setMyStates((prev) => ({ ...prev, [sessionId]: 'interested' }));
    setSessionMeta((prev) => {
      const cur = prev[sessionId];
      if (!cur) return prev;
      return {
        ...prev,
        [sessionId]: {
          ...cur,
          registered_count: Math.max(cur.registered_count, 1),
        },
      };
    });
    try {
      await registerForSession({
        sessionId,
        groupId: id,
        userId,
        displayName,
        isGuest,
      });
      void revolutPulse(id);
      try {
        await refresh();
      } catch {
        // Registration already succeeded — don’t show a false failure.
      }
    } catch (e) {
      setMyStates((prev) => ({ ...prev, [sessionId]: 'none' }));
      void warn();
      Alert.alert(
        'Couldn’t register',
        e instanceof Error ? e.message : 'Try again — or tap “I want to play” in Admin.',
      );
    } finally {
      setBusySession(null);
    }
  }

  function onPay(sessionId: string) {
    void tap();
    router.push(`/group/${id}/pay/${sessionId}`);
  }

  async function openSessionChat(sessionId: string) {
    if (!id || !userId) return;
    void tap();
    try {
      let roomId =
        sessionMetaRef.current[sessionId]?.session_room_id ??
        (await getSession(sessionId, isGuest))?.session_room_id ??
        null;
      if (!roomId) {
        roomId = await ensurePaidSessionRoomAccess({
          sessionId,
          userId,
          isGuest,
        });
      } else {
        await ensurePaidSessionRoomAccess({ sessionId, userId, isGuest });
      }
      if (roomId) {
        router.push(`/group/${id}/session-room/${roomId}`);
        return;
      }
      Alert.alert(
        'Session chat',
        'Session chat unlocks once your payment is confirmed by the organiser.',
      );
    } catch (e) {
      Alert.alert(
        'Session chat',
        e instanceof Error ? e.message : 'Could not open session chat.',
      );
    }
  }

  async function pickAndSendMedia(video: boolean) {
    if (!id || !userId) return;
    if (!membersCanPost && !organiser) {
      Alert.alert('Read only', 'Only organisers can post in this group.');
      return;
    }
    void tap();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos', 'Allow photo library access to share media.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: video
        ? ImagePicker.MediaTypeOptions.Videos
        : ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      videoMaxDuration: 60,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setSending(true);
    try {
      const uri = asset.uri;
      if (!uri) throw new Error('No media URI');
      const { uploadChatMedia } = await import('@/lib/media');
      let path: string | null = null;
      let displayUri = uri;
      if (!isGuest) {
        const up = await uploadChatMedia({
          userId,
          channelId: id,
          localUri: uri,
          mimeType: asset.mimeType,
          kind: video ? 'video' : 'image',
        });
        path = up.path;
        displayUri = up.signedUrl;
      }
      await sendGroupMessage({
        groupId: id,
        userId,
        displayName,
        body: video ? 'Video' : 'Photo',
        isGuest,
        kind: video ? 'video' : 'image',
        payload: {
          path,
          uri: displayUri,
          width: asset.width,
          height: asset.height,
          duration: asset.duration ?? null,
          mime: asset.mimeType ?? null,
        },
      });
      void messageSent(id);
      await refresh();
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (e) {
      Alert.alert('Media', e instanceof Error ? e.message : 'Could not send media');
    } finally {
      setSending(false);
    }
  }

  function openPlusMenu() {
    void tap();
    const options = organiser
      ? ['Photo', 'Video', 'Create mix-in', 'Invite contacts', 'Cancel']
      : ['Photo', 'Video', 'Invite contacts', 'Cancel'];
    const cancelButtonIndex = options.length - 1;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex },
        (buttonIndex) => {
          if (buttonIndex === 0) void pickAndSendMedia(false);
          else if (buttonIndex === 1) void pickAndSendMedia(true);
          else if (organiser) {
            if (buttonIndex === 2) router.push(`/group/${id}/create-mixin`);
            if (buttonIndex === 3) router.push(`/group/${id}/invite`);
          } else if (buttonIndex === 2) {
            router.push(`/group/${id}/invite`);
          }
        },
      );
      return;
    }

    Alert.alert('Share', undefined, [
      { text: 'Photo', onPress: () => void pickAndSendMedia(false) },
      { text: 'Video', onPress: () => void pickAndSendMedia(true) },
      ...(organiser
        ? [{ text: 'Create mix-in', onPress: () => router.push(`/group/${id}/create-mixin`) }]
        : []),
      { text: 'Invite contacts', onPress: () => router.push(`/group/${id}/invite`) },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  function openGroupInfo() {
    void tap();
    router.push(`/group/${id}`);
  }

  const data = useMemo(() => messages, [messages]);

  return (
    <>
      <Stack.Screen
        options={{
          headerBackVisible: false,
          headerLeft: () => <HeaderBack fallbackHref="/(tabs)/chats" />,
          headerTitle: () => (
            <Pressable
              onPress={openGroupInfo}
              style={styles.headerTitleBtn}
              android_ripple={{ color: 'transparent' }}
            >
              <Text style={styles.headerTitle} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.headerSub} numberOfLines={1}>
                {memberCount ? `${memberCount} members` : 'Group info'}
              </Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={openGroupInfo}
              hitSlop={10}
              style={styles.headerAvatarBtn}
              android_ripple={{ color: 'transparent' }}
              accessibilityRole="button"
              accessibilityLabel="Group info"
            >
              <View style={styles.headerAvatar}>
                <Text style={styles.headerAvatarText}>{title.slice(0, 1).toUpperCase()}</Text>
              </View>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ChatWallpaper>
        <FlatList
          ref={listRef}
          data={data}
          style={styles.listFlex}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingTop: headerOffset }]}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <Text style={[styles.empty, { marginTop: headerOffset }]}>
              {organiser
                ? 'No messages yet. Tap ＋ to create a mix-in or invite players.'
                : 'No messages yet. Say hi or wait for a mix-in.'}
            </Text>
          }
          renderItem={({ item }) => {
            if (item.kind === 'system') {
              return (
                <View style={styles.systemWrap}>
                  <Text style={styles.systemText}>{item.body}</Text>
                </View>
              );
            }

            if (item.kind === 'accept_notice') {
              const selected = Array.isArray(item.payload.selected)
                ? (item.payload.selected as string[])
                : [];
              return (
                <AcceptNoticeCard
                  title={String(item.payload.title ?? item.body ?? 'Mix-in')}
                  players={selected}
                />
              );
            }

            if (item.kind === 'wrap_card') {
              const wrapSessionId = String(item.payload.session_id ?? '');
              return (
                <WrapCard
                  title={String(item.payload.title ?? item.body)}
                  subtitle="Tap to play the session wrap"
                  mediaUrl={(item.payload.media_url as string | null) ?? null}
                  playerCount={Number(item.payload.player_count ?? 0) || undefined}
                  photoCount={Number(item.payload.photo_count ?? 0) || undefined}
                  matchCount={Number(item.payload.match_count ?? 0) || undefined}
                  onOpen={
                    wrapSessionId
                      ? () => {
                          void tap();
                          router.push(`/group/${id}/wrap/${wrapSessionId}`);
                        }
                      : undefined
                  }
                />
              );
            }

            if (item.kind === 'mixin_card') {
              const sessionId = String(item.payload.session_id ?? '');
              const session = sessionMeta[sessionId];
              return (
                <MixinCard
                  title={String(item.payload.title ?? item.body)}
                  startsAt={String(item.payload.starts_at ?? new Date().toISOString())}
                  venue={(item.payload.venue_label as string | null) ?? null}
                  format={String(item.payload.format ?? '')}
                  registeredCount={session?.registered_count ?? 0}
                  maxPlayers={Number(item.payload.max_players ?? 8)}
                  priceCents={
                    (item.payload.price_cents as number | null | undefined) ??
                    session?.price_cents ??
                    null
                  }
                  commissionCents={
                    (item.payload.commission_cents as number | null | undefined) ??
                    session?.commission_cents ??
                    null
                  }
                  playerTotalCents={
                    (item.payload.player_total_cents as number | null | undefined) ?? null
                  }
                  courts={Number(item.payload.courts ?? session?.courts ?? 0) || undefined}
                  bannerUrl={
                    (item.payload.banner_url as string | null | undefined) ??
                    session?.banner_url ??
                    null
                  }
                  isOrganiser={organiser}
                  myState={myStates[sessionId] ?? 'none'}
                  lineupConfirmed={lineupConfirmed[sessionId]}
                  hasSessionRoom={Boolean(session?.session_room_id)}
                  busy={busySession === sessionId}
                  onRegister={() => void onRegister(sessionId)}
                  onPay={() => onPay(sessionId)}
                  onSelectPlayers={() => router.push(`/group/${id}/select/${sessionId}`)}
                  onOpenSessionRoom={() => void openSessionChat(sessionId)}
                />
              );
            }

            if (item.kind === 'image' || item.kind === 'video') {
              return (
                <View>
                  <MediaBubble
                    path={
                      item.payload.path ? String(item.payload.path) : null
                    }
                    uri={String(item.payload.uri ?? '')}
                    kind={item.kind}
                    sender={item.sender_name}
                    mine={item.mine}
                    createdAt={item.created_at}
                  />
                  <MessageReactions
                    messageId={item.id}
                    channelType="group"
                    channelId={id!}
                    userId={userId}
                    isGuest={isGuest}
                    reactions={reactions[item.id]}
                    align={item.mine ? 'right' : 'left'}
                    onChanged={setReactions}
                  />
                </View>
              );
            }

            return (
              <View>
                <View style={[styles.bubble, item.mine ? styles.mine : styles.theirs]}>
                  {!item.mine ? <Text style={styles.sender}>{item.sender_name}</Text> : null}
                  <Text style={styles.body}>{item.body}</Text>
                  <Text style={styles.time}>
                    {new Date(item.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <MessageReactions
                  messageId={item.id}
                  channelType="group"
                  channelId={id!}
                  userId={userId}
                  isGuest={isGuest}
                  reactions={reactions[item.id]}
                  align={item.mine ? 'right' : 'left'}
                  onChanged={setReactions}
                />
              </View>
            );
          }}
        />

        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <Pressable onPress={openPlusMenu} style={styles.plus}>
            <FlatPlusIcon color={colors.textPrimary} size={20} />
          </Pressable>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={
              !membersCanPost && !organiser ? 'Only organisers can post' : 'Message'
            }
            placeholderTextColor={colors.textMuted}
            editable={membersCanPost || organiser}
            cursorColor={colors.accentGreen}
            selectionColor="rgba(200,255,46,0.28)"
            keyboardAppearance="dark"
            multiline
          />
          <Pressable
            onPress={() => void onSend()}
            disabled={sending || !draft.trim() || (!membersCanPost && !organiser)}
            style={[
              styles.send,
              (!draft.trim() || sending || (!membersCanPost && !organiser)) &&
                styles.sendDisabled,
            ]}
          >
            <FlatSendIcon />
          </Pressable>
        </View>
        </ChatWallpaper>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  listFlex: { flex: 1, backgroundColor: 'transparent' },
  headerTitleBtn: {
    maxWidth: 180,
    alignItems: Platform.OS === 'ios' ? 'center' : 'flex-start',
    paddingVertical: 2,
  },
  headerTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 16,
    color: colors.textPrimary,
  },
  headerSub: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 2,
  },
  muteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  muteText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 13,
    color: colors.textSecondary,
  },
  headerAvatarBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontFamily: 'Figtree_700Bold',
    color: '#0B0D10',
    fontSize: 14,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: 4,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    paddingHorizontal: 24,
    fontFamily: 'Figtree_400Regular',
    lineHeight: 22,
  },
  systemWrap: {
    alignSelf: 'center',
    maxWidth: '90%',
    backgroundColor: colors.elevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 8,
  },
  systemText: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 2,
    marginVertical: 2,
  },
  mediaBubble: {
    paddingHorizontal: 6,
    paddingTop: 6,
    overflow: 'hidden',
  },
  mediaImage: {
    width: 220,
    height: 220,
    borderRadius: 10,
    backgroundColor: colors.elevated2,
  },
  videoBadge: {
    position: 'absolute',
    left: 14,
    top: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  videoBadgeText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 12,
    color: colors.textPrimary,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.bubbleOut,
    borderBottomRightRadius: 4,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.elevated,
    borderBottomLeftRadius: 4,
  },
  sender: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 12.5,
    color: colors.accentGreen,
    marginBottom: 1,
  },
  body: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 21,
  },
  time: {
    alignSelf: 'flex-end',
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  plus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.elevated,
  },
  tool: {
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    backgroundColor: colors.elevated,
    color: colors.textPrimary,
    fontFamily: 'Figtree_400Regular',
    fontSize: 16,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.35 },
  sendIcon: {
    color: '#0B0D10',
    fontSize: 16,
    marginLeft: 2,
  },
});
