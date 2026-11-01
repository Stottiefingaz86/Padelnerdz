import { colors, spacing } from '@padel-nerdz/config';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarPlus, Plus, QrCode, ScanLine, SendHorizontal } from 'lucide-react-native';

import { Avatar } from '@/components/Avatar';
import { ArrivalGuideCard } from '@/components/chat/ArrivalGuideCard';
import { ChatWallpaper } from '@/components/chat/ChatWallpaper';
import { FixturesCard } from '@/components/chat/FixturesCard';
import { MediaBubble } from '@/components/chat/MediaBubble';
import { MessageReactions } from '@/components/chat/MessageReactions';
import { PlayersCard } from '@/components/chat/PlayersCard';
import { SessionTicketCard } from '@/components/chat/SessionTicketCard';
import { WrapCard } from '@/components/chat/WrapCard';
import { HeaderBack } from '@/components/HeaderBack';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/lib/auth';
import {
  ensureArrivalGuideMessage,
  listSessionRoomMessages,
  sendSessionRoomMessage,
  subscribeChat,
  type ChatMessage,
} from '@/lib/chat';
import { addSessionToCalendar } from '@/lib/calendar';
import { chatAlert, messageSent, select, success, tap, warn } from '@/lib/feedback';
import { setTyping, subscribeTyping } from '@/lib/typing';
import {
  blockGroupMember,
  canOrganiseGroup,
  getGroup,
  removeGroupMember,
  type GroupSummary,
} from '@/lib/groups';
import { getSessionFixtures, type FixtureRound } from '@/lib/fixtures';
import { useGlassHeaderOffset } from '@/lib/layout';
import {
  listChannelReactions,
  type MessageReactionMap,
} from '@/lib/reactions';
import {
  ensurePaidSessionRoomAccess,
  getSession,
  listGroupSessions,
  listRegistrants,
  markSessionCheckIn,
  markSessionNoShow,
  type Registrant,
  type SessionSummary,
} from '@/lib/sessions';

const EMOJIS = ['👍', '🔥', '😂', '💪', '🎾', '🙌', '❤️', '👏'];
const STACK_FACE_COUNT = 5;

export default function SessionRoomChatScreen() {
  const { id, roomId } = useLocalSearchParams<{ id: string; roomId: string }>();
  const insets = useSafeAreaInsets();
  const headerOffset = useGlassHeaderOffset(24);
  const { profile, user , offline } = useAuth();
  const isGuest = offline;
  const userId = user?.id ?? profile?.id ?? '';
  const displayName = profile?.display_name?.trim() || 'Player';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [players, setPlayers] = useState<Registrant[]>([]);
  const [session, setSession] = useState<SessionSummary | null>(null);
  const [group, setGroup] = useState<GroupSummary | null>(null);
  const [title, setTitle] = useState('Session');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [allowed, setAllowed] = useState(true);
  const [fixturesReady, setFixturesReady] = useState(false);
  const [fixtures, setFixtures] = useState<FixtureRound | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [playersMenuOpen, setPlayersMenuOpen] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [typingLabel, setTypingLabel] = useState<string | null>(null);
  const [reactions, setReactions] = useState<MessageReactionMap>({});
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const lastAlertId = useRef<string | null>(null);
  const nearBottom = useRef(true);
  const typingIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guidePosted = useRef(false);
  const lockAlerted = useRef(false);
  const refreshing = useRef(false);
  const organiser = canOrganiseGroup(group, userId);
  const sessionClosed = session?.status === 'closed';
  const stackTotal = Math.max(players.length, group?.member_count ?? 0);

  function onChatScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    nearBottom.current =
      contentOffset.y + layoutMeasurement.height >= contentSize.height - 80;
  }

  const refresh = useCallback(async () => {
    if (!roomId || !userId || refreshing.current) return;
    refreshing.current = true;
    try {
      let msgs = await listSessionRoomMessages(roomId, userId, isGuest);

      if (id) {
        const [sessions, g] = await Promise.all([
          listGroupSessions(id, isGuest),
          getGroup(id, userId, isGuest),
        ]);
        setGroup(g);
        const found = sessions.find((s) => s.session_room_id === roomId);
        if (found) {
          setSession(found);
          setTitle(found.title);
          try {
            await ensurePaidSessionRoomAccess({
              sessionId: found.id,
              userId,
              isGuest,
            });
          } catch {
            /* access ensure is best-effort while reading */
          }
          if (!guidePosted.current) {
            try {
              const posted = await ensureArrivalGuideMessage({
                roomId,
                sessionId: found.id,
                venue: found.venue_label,
                title: found.title,
                userId,
                isGuest,
              });
              guidePosted.current = true;
              if (posted) {
                msgs = await listSessionRoomMessages(roomId, userId, isGuest);
              }
            } catch {
              guidePosted.current = true;
            }
          }
          let confirmed: Registrant[] = [];
          try {
            const regs = await listRegistrants(found.id, id, isGuest);
            confirmed = regs.filter((r) => r.status === 'paid' || r.status === 'no_show');
            setPlayers(confirmed);
            const me = confirmed.find((r) => r.user_id === userId || r.user_id === 'guest');
            const myReg = regs.find((r) => r.user_id === userId);
            const canEnter =
              Boolean(me) ||
              myReg?.status === 'paid' ||
              isGuest ||
              canOrganiseGroup(g, userId);
            setAllowed(canEnter);
            if (!canEnter && !lockAlerted.current) {
              lockAlerted.current = true;
              Alert.alert(
                'Session locked',
                'Pay to confirm your place before opening session chat.',
              );
              router.replace(`/group/${id}/pay/${found.id}`);
            }
          } catch (e) {
            console.warn('session players failed', e);
            setPlayers([]);
          }
          try {
            const fx = await getSessionFixtures(found.id, isGuest);
            setFixtures(fx);
            setFixturesReady(Boolean(fx));
          } catch {
            setFixtures(null);
            setFixturesReady(false);
          }
        } else {
          const maybe = await getSession(
            roomId.replace('demo-room-', 'demo-session-'),
            isGuest,
          );
          if (maybe) {
            setSession(maybe);
            setTitle(maybe.title);
          }
        }
      }
      const newest = msgs[msgs.length - 1];
      if (newest) {
        if (lastAlertId.current == null) {
          lastAlertId.current = newest.id;
        } else if (
          newest.id !== lastAlertId.current &&
          !newest.mine &&
          (newest.kind === 'text' || newest.kind === 'image' || newest.kind === 'video')
        ) {
          lastAlertId.current = newest.id;
          void chatAlert(roomId);
        } else {
          lastAlertId.current = newest.id;
        }
      }
      setMessages(msgs);
      if (roomId) {
        const reactionMap = await listChannelReactions({
          channelType: 'session_room',
          channelId: roomId,
          userId,
          isGuest,
        }).catch(() => ({}) as MessageReactionMap);
        setReactions(reactionMap);
      }
    } catch (e) {
      console.warn('session room refresh failed', e);
    } finally {
      refreshing.current = false;
    }
  }, [roomId, userId, isGuest, id]);

  useEffect(() => {
    void refresh();
    return subscribeChat(() => {
      void refresh();
    });
  }, [refresh]);

  useEffect(() => {
    if (!roomId || !userId) return;
    return subscribeTyping(roomId, userId, setTypingLabel);
  }, [roomId, userId]);

  useEffect(() => {
    return () => {
      if (typingIdleTimer.current) clearTimeout(typingIdleTimer.current);
      if (roomId && userId) {
        setTyping({ roomId, userId, displayName, active: false });
      }
    };
  }, [roomId, userId, displayName]);

  function onDraftChange(text: string) {
    setDraft(text);
    if (!roomId || !userId) return;
    if (text.trim()) {
      setTyping({ roomId, userId, displayName, active: true });
      if (typingIdleTimer.current) clearTimeout(typingIdleTimer.current);
      typingIdleTimer.current = setTimeout(() => {
        setTyping({ roomId, userId, displayName, active: false });
      }, 1600);
    } else {
      setTyping({ roomId, userId, displayName, active: false });
    }
  }

  async function onSend(body = draft) {
    if (sessionClosed) {
      Alert.alert('Read only', 'This session is closed.');
      return;
    }
    if (!roomId || !userId || !body.trim() || sending) return;
    setSending(true);
    setTyping({ roomId, userId, displayName, active: false });
    try {
      await sendSessionRoomMessage({
        roomId,
        userId,
        displayName,
        body,
        isGuest,
      });
      setDraft('');
      setShowEmoji(false);
      void messageSent(roomId);
      nearBottom.current = true;
      await refresh();
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (e) {
      void warn();
      Alert.alert('Message', e instanceof Error ? e.message : 'Could not send');
    } finally {
      setSending(false);
    }
  }

  function openPlayerActions(player: Registrant) {
    if (!id || !session) return;

    if (!organiser) {
      router.push(`/group/${id}/member/${player.user_id}`);
      return;
    }

    const isSelf = player.user_id === userId || player.user_id === 'guest';
    const checkedIn = Boolean(player.checked_in_at);
    const options = isSelf
      ? ['View profile', 'Cancel']
      : player.status === 'no_show'
        ? ['View profile', 'Remove from group', 'Block from group', 'Cancel']
        : checkedIn
          ? [
              'Mark did not show',
              'View profile',
              'Remove from group',
              'Block from group',
              'Cancel',
            ]
          : [
              'Mark arrived',
              'Mark did not show',
              'View profile',
              'Remove from group',
              'Block from group',
              'Cancel',
            ];
    const cancelButtonIndex = options.length - 1;

    const run = async (action: string) => {
      try {
        if (action === 'View profile') {
          router.push(`/group/${id}/member/${player.user_id}`);
          return;
        }
        if (action === 'Mark arrived') {
          await markSessionCheckIn({
            sessionId: session.id,
            groupId: id,
            userId: player.user_id,
            isGuest,
          });
          void success();
          await sendSessionRoomMessage({
            roomId: roomId!,
            userId,
            displayName: 'Padel Nerdz',
            body: `${player.display_name} checked in.`,
            isGuest,
            kind: 'system',
          });
          await refresh();
          return;
        }
        if (action === 'Mark did not show') {
          await markSessionNoShow({
            sessionId: session.id,
            groupId: id,
            userId: player.user_id,
            isGuest,
          });
          void success();
          await sendSessionRoomMessage({
            roomId: roomId!,
            userId,
            displayName: 'Padel Nerdz',
            body: `${player.display_name} marked as no-show.`,
            isGuest,
            kind: 'system',
          });
          await refresh();
          return;
        }
        if (action === 'Remove from group') {
          Alert.alert(
            'Remove player',
            `Remove ${player.display_name} from this group?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove',
                style: 'destructive',
                onPress: () => {
                  void (async () => {
                    await removeGroupMember({
                      groupId: id,
                      memberId: player.user_id,
                      actorId: userId,
                      isGuest,
                    });
                    void success();
                    await refresh();
                  })();
                },
              },
            ],
          );
          return;
        }
        if (action === 'Block from group') {
          Alert.alert(
            'Block player',
            `Block ${player.display_name}? They can’t rejoin this group.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Block',
                style: 'destructive',
                onPress: () => {
                  void (async () => {
                    await blockGroupMember({
                      groupId: id,
                      memberId: player.user_id,
                      blockedBy: userId,
                      isGuest,
                    });
                    void success();
                    await refresh();
                  })();
                },
              },
            ],
          );
        }
      } catch (e) {
        void warn();
        Alert.alert('Error', e instanceof Error ? e.message : 'Action failed');
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex: options.includes('Block from group')
            ? options.indexOf('Block from group')
            : undefined,
          title: player.display_name,
        },
        (buttonIndex) => {
          const label = options[buttonIndex];
          if (!label || label === 'Cancel') return;
          void select();
          void run(label);
        },
      );
      return;
    }

    Alert.alert(player.display_name, undefined, [
      ...options
        .filter((o) => o !== 'Cancel')
        .map((label) => ({
          text: label,
          style:
            label === 'Block from group' || label === 'Remove from group'
              ? ('destructive' as const)
              : ('default' as const),
          onPress: () => {
            void run(label);
          },
        })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  async function pickMedia(video = false) {
    if (sessionClosed) {
      Alert.alert('Read only', 'This session is closed.');
      return;
    }
    if (!roomId || !userId) return;
    void tap();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      void warn();
      Alert.alert('Photos', 'Allow photo library access to share media in this session.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: video ? ['videos'] : ['images'],
      quality: 0.85,
      videoMaxDuration: 60,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!asset.uri) {
      Alert.alert('Media', 'Couldn’t read that file. Try another photo.');
      return;
    }
    setSending(true);
    try {
      let path: string | null = null;
      let displayUri = asset.uri;
      if (!isGuest) {
        const { uploadChatMedia } = await import('@/lib/media');
        const up = await uploadChatMedia({
          userId,
          channelId: roomId,
          localUri: asset.uri,
          mimeType: asset.mimeType,
          kind: video ? 'video' : 'image',
        });
        path = up.path;
        displayUri = up.signedUrl;
      }
      await sendSessionRoomMessage({
        roomId,
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
      setShowEmoji(false);
      void messageSent(roomId);
      nearBottom.current = true;
      await refresh();
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (e) {
      void warn();
      Alert.alert('Media', e instanceof Error ? e.message : 'Could not send media');
    } finally {
      setSending(false);
    }
  }

  function openTicket() {
    void tap();
    setTicketOpen(true);
  }

  function openScanTickets() {
    if (!organiser || !session || !id) return;
    void tap();
    setPlayersMenuOpen(false);
    setAttachMenuOpen(false);
    router.push(`/group/${id}/check-in/${session.id}`);
  }

  function openPlayersMenu() {
    void tap();
    setPlayersMenuOpen(true);
  }

  async function onAddToCalendar() {
    if (!session) return;
    void tap();
    try {
      await addSessionToCalendar({
        title: session.title,
        startsAt: session.starts_at,
        venue: session.venue_label,
      });
    } catch (e) {
      void warn();
      Alert.alert('Calendar', e instanceof Error ? e.message : 'Could not open calendar');
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerBackVisible: false,
          headerLeft: () => <HeaderBack fallbackHref={id ? `/group/${id}/chat` : undefined} />,
          title,
          headerTitleAlign: 'center',
          headerRight: () => (
            <Pressable
              onPress={() => {
                void tap();
                openPlayersMenu();
              }}
              style={styles.headerStackBtn}
              hitSlop={8}
              accessibilityLabel={`${stackTotal} in group`}
            >
              {players.length === 0 ? (
                <View style={styles.headerStack}>
                  <View style={styles.headerStackEmpty}>
                    <Text style={styles.headerStackCount}>0</Text>
                  </View>
                  {stackTotal > 0 ? (
                    <View style={[styles.headerStackMore, { marginLeft: 4 }]}>
                      <Text style={styles.headerStackMoreText}>{stackTotal}</Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={styles.headerStack}>
                  {players.slice(0, STACK_FACE_COUNT).map((p, i) => (
                    <View
                      key={p.user_id}
                      style={[
                        styles.headerStackAvatar,
                        {
                          marginLeft: i === 0 ? 0 : -10,
                          zIndex: STACK_FACE_COUNT - i,
                        },
                      ]}
                    >
                      <Avatar name={p.display_name} size={28} />
                    </View>
                  ))}
                  <View style={[styles.headerStackMore, { marginLeft: -8, zIndex: 0 }]}>
                    <Text style={styles.headerStackMoreText}>{stackTotal}</Text>
                  </View>
                </View>
              )}
            </Pressable>
          ),
        }}
      />
      {session ? (
        <SessionTicketCard
          visible={ticketOpen}
          onClose={() => setTicketOpen(false)}
          title={session.title}
          startsAt={session.starts_at}
          venue={session.venue_label}
          format={session.format}
          courts={session.courts}
          maxPlayers={session.max_players}
          players={players}
          fixtures={fixtures}
          viewerUserId={userId}
          sessionId={session.id}
          onAddToCalendar={() => void onAddToCalendar()}
          onOpenFixtures={
            fixturesReady && session
              ? () => router.push(`/group/${id}/fixtures/${session.id}`)
              : undefined
          }
        />
      ) : null}
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ChatWallpaper>
        <View style={[styles.sessionTop, { paddingTop: headerOffset }]}>
          {session ? (
            <View style={styles.actionCard}>
              <View style={styles.actionCopy}>
                <Text style={styles.actionWhen} numberOfLines={1}>
                  {new Date(session.starts_at).toLocaleString([], {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                <Text style={styles.actionWhere} numberOfLines={1}>
                  {session.venue_label?.trim() || 'Venue TBC'}
                </Text>
              </View>
              <View style={styles.actionBtns}>
                <Pressable
                  style={styles.actionBtn}
                  onPress={openTicket}
                  accessibilityLabel="Open ticket QR"
                >
                  <Icon icon={QrCode} color={colors.accentGreen} size="md" />
                </Pressable>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => void onAddToCalendar()}
                  accessibilityLabel="Add to calendar"
                >
                  <Icon icon={CalendarPlus} color={colors.accentGreen} size="md" />
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={styles.listFlex}
          contentContainerStyle={styles.list}
          onScroll={onChatScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() => {
            if (nearBottom.current) {
              listRef.current?.scrollToEnd({ animated: false });
            }
          }}
          renderItem={({ item }) => {
            if (item.kind === 'system') {
              return (
                <View style={styles.systemWrap}>
                  <Text style={styles.systemText}>{item.body}</Text>
                </View>
              );
            }
            if (item.kind === 'wrap_card') {
              const wrapSessionId = String(item.payload.session_id ?? session?.id ?? '');
              return (
                <WrapCard
                  title={String(item.payload.title ?? item.body)}
                  subtitle="Tap to play the session wrap"
                  mediaUrl={(item.payload.media_url as string | null) ?? null}
                  playerCount={Number(item.payload.player_count ?? 0) || undefined}
                  photoCount={Number(item.payload.photo_count ?? 0) || undefined}
                  matchCount={Number(item.payload.match_count ?? 0) || undefined}
                  onOpen={
                    wrapSessionId && id
                      ? () => {
                          void tap();
                          router.push(`/group/${id}/wrap/${wrapSessionId}`);
                        }
                      : undefined
                  }
                />
              );
            }
            if (item.kind === 'arrival_card') {
              return (
                <ArrivalGuideCard
                  venue={
                    (item.payload.venue_label as string | null | undefined) ??
                    session?.venue_label
                  }
                  organiserView={organiser}
                  onOpenTicket={openTicket}
                />
              );
            }
            if (item.kind === 'players_card') {
              const list = Array.isArray(item.payload.players)
                ? (item.payload.players as Array<{
                    user_id: string;
                    display_name: string;
                    reliability?: number;
                  }>)
                : [];
              return (
                <PlayersCard
                  title={String(item.payload.title ?? item.body ?? 'Confirmed players')}
                  players={list}
                />
              );
            }
            if (item.kind === 'fixtures_card') {
              const matches = Array.isArray(item.payload.matches)
                ? (item.payload.matches as Array<{
                    court: number;
                    label: string;
                    team_a: string;
                    team_b: string;
                  }>)
                : [];
              const sessionIdForCard = String(item.payload.session_id ?? session?.id ?? '');
              return (
                <FixturesCard
                  round={Number(item.payload.round ?? 1)}
                  matches={matches}
                  format={session?.format}
                  onOpen={() => {
                    void tap();
                    if (sessionIdForCard) {
                      router.push(`/group/${id}/fixtures/${sessionIdForCard}`);
                    }
                  }}
                />
              );
            }
            if (item.kind === 'image' || item.kind === 'video') {
              return (
                <View>
                  <MediaBubble
                    path={item.payload.path ? String(item.payload.path) : null}
                    uri={String(item.payload.uri ?? '')}
                    kind={item.kind}
                    sender={item.sender_name}
                    mine={item.mine}
                    createdAt={item.created_at}
                  />
                  <MessageReactions
                    messageId={item.id}
                    channelType="session_room"
                    channelId={roomId!}
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
                  channelType="session_room"
                  channelId={roomId!}
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

        {typingLabel ? (
          <View style={styles.typingBar}>
            <Text style={styles.typingText}>{typingLabel}</Text>
          </View>
        ) : null}

        {showEmoji ? (
          <View style={styles.emojiBar}>
            {EMOJIS.map((e) => (
              <Pressable
                key={e}
                onPress={() => {
                  void tap();
                  onDraftChange(draft + e);
                }}
                style={styles.emojiBtn}
              >
                <Text style={styles.emoji}>{e}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Modal
          visible={playersMenuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setPlayersMenuOpen(false)}
        >
          <View style={styles.sheetScrim}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setPlayersMenuOpen(false)} />
            <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <Text style={styles.sheetTitle}>Players · {players.length}</Text>
              {organiser && session ? (
                <Pressable style={styles.sheetScan} onPress={openScanTickets}>
                  <Icon icon={ScanLine} color="#0B0D10" size="md" />
                  <Text style={styles.sheetScanText}>Scan tickets</Text>
                </Pressable>
              ) : null}
              {fixturesReady && session ? (
                <Pressable
                  style={styles.sheetRow}
                  onPress={() => {
                    void select();
                    setPlayersMenuOpen(false);
                    router.push(`/group/${id}/fixtures/${session.id}`);
                  }}
                >
                  <Text style={styles.sheetRowText}>Open fixtures</Text>
                </Pressable>
              ) : null}
              {players.length === 0 ? (
                <Text style={styles.sheetEmpty}>
                  {organiser
                    ? 'No confirmed players yet — scan when they arrive.'
                    : 'Confirmed players appear after payment.'}
                </Text>
              ) : (
                players.map((p) => (
                  <Pressable
                    key={p.user_id}
                    style={styles.sheetRow}
                    onPress={() => {
                      void select();
                      setPlayersMenuOpen(false);
                      openPlayerActions(p);
                    }}
                  >
                    <Avatar name={p.display_name} size={32} />
                    <Text style={styles.sheetRowText}>{p.display_name}</Text>
                  </Pressable>
                ))
              )}
              <Pressable style={styles.sheetCancel} onPress={() => setPlayersMenuOpen(false)}>
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={attachMenuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setAttachMenuOpen(false)}
        >
          <View style={styles.sheetScrim}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setAttachMenuOpen(false)} />
            <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <Text style={styles.sheetTitle}>Attach</Text>
              {organiser && session ? (
                <Pressable style={styles.sheetScan} onPress={openScanTickets}>
                  <Icon icon={ScanLine} color="#0B0D10" size="md" />
                  <Text style={styles.sheetScanText}>Scan tickets</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={styles.sheetRow}
                onPress={() => {
                  setAttachMenuOpen(false);
                  void pickMedia(false);
                }}
              >
                <Text style={styles.sheetRowText}>Photo</Text>
              </Pressable>
              <Pressable
                style={styles.sheetRow}
                onPress={() => {
                  setAttachMenuOpen(false);
                  void pickMedia(true);
                }}
              >
                <Text style={styles.sheetRowText}>Video</Text>
              </Pressable>
              <Pressable
                style={styles.sheetRow}
                onPress={() => {
                  setAttachMenuOpen(false);
                  setShowEmoji((v) => !v);
                }}
              >
                <Text style={styles.sheetRowText}>Emoji</Text>
              </Pressable>
              <Pressable style={styles.sheetCancel} onPress={() => setAttachMenuOpen(false)}>
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {sessionClosed ? (
          <View style={[styles.closedBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Text style={styles.closedBarText}>Session closed — chat is read-only</Text>
            {session ? (
              <Pressable
                style={styles.closedWrapBtn}
                onPress={() => {
                  void tap();
                  router.push(`/group/${id}/wrap/${session.id}`);
                }}
              >
                <Text style={styles.closedWrapBtnText}>Open wrap</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            <Pressable
              onPress={() => {
                void tap();
                setAttachMenuOpen(true);
              }}
              style={styles.plus}
              accessibilityLabel="Attach photo or video"
            >
              <Icon icon={Plus} color={colors.textPrimary} size="md" />
            </Pressable>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={onDraftChange}
              placeholder="Message"
              placeholderTextColor={colors.textMuted}
              cursorColor={colors.accentGreen}
              selectionColor="rgba(200,255,46,0.28)"
              keyboardAppearance="dark"
              underlineColorAndroid="transparent"
              multiline
            />
            <Pressable
              onPress={() => void onSend()}
              disabled={sending || !draft.trim()}
              style={[styles.send, (!draft.trim() || sending) && styles.sendDisabled]}
              accessibilityLabel="Send"
            >
              <Icon icon={SendHorizontal} color="#0B0D10" size={18} />
            </Pressable>
          </View>
        )}
        </ChatWallpaper>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  listFlex: { flex: 1, backgroundColor: 'transparent' },
  sessionTop: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  sheetScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: spacing.md,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  sheetTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 13,
    letterSpacing: 0.5,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sheetScan: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.accentGreen,
    paddingHorizontal: 16,
  },
  sheetScanText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 16,
    color: '#0B0D10',
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.elevated,
  },
  sheetRowText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    flex: 1,
  },
  sheetEmpty: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  sheetCancel: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  sheetCancelText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
    color: colors.textSecondary,
  },
  actionCard: {
    marginHorizontal: spacing.md,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: 16,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.28)',
  },
  typingBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  typingText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 13,
    color: colors.accentGreen,
  },
  actionCopy: { flex: 1, gap: 2 },
  actionWhen: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 14,
    color: colors.textPrimary,
  },
  actionWhere: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
  },
  actionBtns: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.accentGreenDim,
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerStackBtn: {
    marginRight: Platform.OS === 'ios' ? 4 : 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerStack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 2,
  },
  headerStackAvatar: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.background,
    overflow: 'hidden',
  },
  headerStackMore: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.elevated,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerStackMoreText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 10,
    color: colors.textPrimary,
  },
  headerStackEmpty: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerStackCount: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    color: colors.textMuted,
  },
  list: {
    padding: spacing.md,
    gap: 4,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  systemWrap: {
    alignSelf: 'center',
    maxWidth: '88%',
    backgroundColor: colors.elevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 8,
  },
  systemText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    marginVertical: 2,
    gap: 2,
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
    color: colors.accentGreen,
    fontSize: 12.5,
    fontFamily: 'Figtree_600SemiBold',
  },
  body: {
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: 'Figtree_400Regular',
    lineHeight: 21,
  },
  mediaBubble: { paddingHorizontal: 6, paddingTop: 6, overflow: 'hidden' },
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
  time: {
    alignSelf: 'flex-end',
    fontSize: 11,
    color: colors.textMuted,
  },
  emojiBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  emojiBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  plus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.elevated,
  },
  closedBar: {
    paddingTop: 12,
    paddingHorizontal: spacing.md,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  closedBarText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 13,
    color: colors.textMuted,
  },
  closedWrapBtn: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  closedWrapBtnText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 15,
    color: '#0B0D10',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingHorizontal: 8,
    paddingTop: 8,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  tool: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.elevated,
  },
  toolText: { fontSize: 16 },
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
  sendIcon: { color: '#0B0D10', fontSize: 16, marginLeft: 2 },
});
