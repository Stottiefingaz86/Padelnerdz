import { colors, spacing } from '@padel-nerdz/config';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { FixturesCard } from '@/components/chat/FixturesCard';
import { MediaBubble } from '@/components/chat/MediaBubble';
import { PlayersCard } from '@/components/chat/PlayersCard';
import { FlatPlusIcon, FlatSendIcon } from '@/components/FlatIcons';
import { useAuth } from '@/lib/auth';
import {
  listSessionRoomMessages,
  sendSessionRoomMessage,
  subscribeChat,
  type ChatMessage,
} from '@/lib/chat';
import { select, success, tap, warn } from '@/lib/feedback';
import {
  blockGroupMember,
  canOrganiseGroup,
  getGroup,
  removeGroupMember,
  type GroupSummary,
} from '@/lib/groups';
import { getSessionFixtures } from '@/lib/fixtures';
import { useGlassHeaderOffset } from '@/lib/layout';
import {
  getSession,
  listGroupSessions,
  listRegistrants,
  markSessionNoShow,
  type Registrant,
  type SessionSummary,
} from '@/lib/sessions';

const EMOJIS = ['👍', '🔥', '😂', '💪', '🎾', '🙌', '❤️', '👏'];

export default function SessionRoomChatScreen() {
  const { id, roomId } = useLocalSearchParams<{ id: string; roomId: string }>();
  const insets = useSafeAreaInsets();
  const headerOffset = useGlassHeaderOffset(8);
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
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const organiser = canOrganiseGroup(group, userId);

  const refresh = useCallback(async () => {
    if (!roomId || !userId) return;
    setMessages(await listSessionRoomMessages(roomId, userId, isGuest));

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
        const regs = await listRegistrants(found.id, id, isGuest);
        // Session room is for paid players only (accept ≠ unlock)
        const confirmed = regs.filter((r) => r.status === 'paid' || r.status === 'no_show');
        setPlayers(confirmed);
        const fixtures = await getSessionFixtures(found.id, isGuest);
        setFixturesReady(Boolean(fixtures));
        const me = confirmed.find((r) => r.user_id === userId || r.user_id === 'guest');
        const canEnter = Boolean(me) || isGuest || canOrganiseGroup(g, userId);
        setAllowed(canEnter);
        if (!canEnter) {
          Alert.alert('Session locked', 'Pay to confirm your place before opening session chat.');
          router.replace(`/group/${id}/pay/${found.id}`);
        }
      } else {
        const maybe = await getSession(roomId.replace('demo-room-', 'demo-session-'), isGuest);
        if (maybe) {
          setSession(maybe);
          setTitle(maybe.title);
        }
      }
    }
  }, [roomId, userId, isGuest, id]);

  useEffect(() => {
    void refresh();
    return subscribeChat(() => {
      void refresh();
    });
  }, [refresh]);

  async function onSend(body = draft) {
    if (!roomId || !userId || !body.trim() || sending) return;
    setSending(true);
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
      await refresh();
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
    const options = isSelf
      ? ['View profile', 'Cancel']
      : player.status === 'no_show'
        ? ['View profile', 'Remove from group', 'Block from group', 'Cancel']
        : [
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
    void tap();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: video
        ? ImagePicker.MediaTypeOptions.Videos
        : ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      videoMaxDuration: 60,
    });
    if (result.canceled || !result.assets[0] || !roomId || !userId) return;
    const asset = result.assets[0];
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
        },
      });
      setShowEmoji(false);
      await refresh();
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title, headerBackTitle: 'Back' }} />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.playersBar, { paddingTop: headerOffset }]}>
          <View style={styles.playersHead}>
            <Text style={styles.playersLabel}>Players · {players.length || '—'}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.playerRow}>
            {players.length === 0 ? (
              <Text style={styles.playerHint}>Confirmed players appear here after payment</Text>
            ) : (
              players.map((p) => (
                <Pressable
                  key={p.user_id}
                  style={[styles.playerChip, p.status === 'no_show' && styles.playerNoShow]}
                  onPress={() => {
                    void tap();
                    openPlayerActions(p);
                  }}
                >
                  <Avatar name={p.display_name} size={36} />
                  <Text style={styles.playerName} numberOfLines={1}>
                    {p.display_name.split(' ')[0]}
                  </Text>
                  {p.status === 'no_show' ? (
                    <Text style={styles.noShowBadge}>No-show</Text>
                  ) : null}
                </Pressable>
              ))
            )}
          </ScrollView>
          {session && fixturesReady ? (
            <Pressable
              style={styles.fixturesCta}
              onPress={() => {
                void tap();
                router.push(`/group/${id}/fixtures/${session.id}`);
              }}
            >
              <View>
                <Text style={styles.fixturesCtaKicker}>MIX-IN COURTS</Text>
                <Text style={styles.fixturesCtaTitle}>Open fixtures & scores</Text>
              </View>
              <Text style={styles.fixturesCtaChevron}>→</Text>
            </Pressable>
          ) : session ? (
            <View style={styles.fixturesWaiting}>
              <Text style={styles.fixturesWaitingText}>
                Courts unlock once enough players have paid
              </Text>
            </View>
          ) : null}
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            if (item.kind === 'system') {
              return (
                <View style={styles.systemWrap}>
                  <Text style={styles.systemText}>{item.body}</Text>
                </View>
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
                <MediaBubble
                  path={item.payload.path ? String(item.payload.path) : null}
                  uri={String(item.payload.uri ?? '')}
                  kind={item.kind}
                  sender={item.sender_name}
                  mine={item.mine}
                  createdAt={item.created_at}
                />
              );
            }
            return (
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
            );
          }}
        />

        {showEmoji ? (
          <View style={styles.emojiBar}>
            {EMOJIS.map((e) => (
              <Pressable
                key={e}
                onPress={() => {
                  void tap();
                  setDraft((d) => d + e);
                }}
                style={styles.emojiBtn}
              >
                <Text style={styles.emoji}>{e}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <Pressable
            onPress={() => {
              void tap();
              const options = ['Photo', 'Video', 'Emoji', 'Cancel'];
              const cancelButtonIndex = 3;
              if (Platform.OS === 'ios') {
                ActionSheetIOS.showActionSheetWithOptions(
                  { options, cancelButtonIndex },
                  (i) => {
                    if (i === 0) void pickMedia(false);
                    else if (i === 1) void pickMedia(true);
                    else if (i === 2) setShowEmoji((v) => !v);
                  },
                );
                return;
              }
              Alert.alert('Attach', undefined, [
                { text: 'Photo', onPress: () => void pickMedia(false) },
                { text: 'Video', onPress: () => void pickMedia(true) },
                { text: 'Emoji', onPress: () => setShowEmoji((v) => !v) },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
            style={styles.plus}
          >
            <FlatPlusIcon color={colors.textPrimary} size={20} />
          </Pressable>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
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
          >
            <FlatSendIcon />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  playersBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
    paddingBottom: 10,
    gap: 8,
  },
  playersHead: {
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playersLabel: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 12,
    color: colors.textMuted,
  },
  fixturesCta: {
    marginHorizontal: spacing.md,
    marginTop: 4,
    backgroundColor: colors.accentGreen,
    borderRadius: 14,
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fixturesCtaKicker: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: 'rgba(11,13,16,0.65)',
  },
  fixturesCtaTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 16,
    color: '#0B0D10',
    marginTop: 2,
  },
  fixturesCtaChevron: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 22,
    color: '#0B0D10',
  },
  fixturesWaiting: {
    marginHorizontal: spacing.md,
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  fixturesWaitingText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 13,
    color: colors.textMuted,
  },
  playerRow: {
    paddingHorizontal: spacing.md,
    gap: 12,
    alignItems: 'center',
  },
  playerHint: {
    color: colors.textMuted,
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
  },
  playerChip: { alignItems: 'center', width: 64, gap: 4 },
  playerNoShow: { opacity: 0.45 },
  playerName: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 11,
    color: colors.textSecondary,
    width: '100%',
    textAlign: 'center',
  },
  noShowBadge: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 9,
    color: colors.error,
    letterSpacing: 0.2,
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
