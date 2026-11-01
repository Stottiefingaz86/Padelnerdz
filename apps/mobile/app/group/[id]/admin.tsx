import { colors, radii, spacing } from '@padel-nerdz/config';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ChevronRight, Ellipsis } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderBack } from '@/components/HeaderBack';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/lib/auth';
import { select, success, tap, warn } from '@/lib/feedback';
import { useGlassHeaderOffset } from '@/lib/layout';
import {
  canOrganiseGroup,
  deleteGroup,
  getGroup,
  levelLabel,
  listGroupMembers,
  listPendingJoinRequests,
  resolveJoinRequest,
  updateGroup,
  type GroupMember,
  type GroupSummary,
  type JoinRequest,
} from '@/lib/groups';
import { resolveMediaDisplayUrl, uploadGroupImage } from '@/lib/media';
import {
  closeSession,
  listGroupSessions,
  listRegistrants,
  registerForSession,
  selectPlayersForSession,
  type Registrant,
  type SessionSummary,
} from '@/lib/sessions';

export default function GroupAdminScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const headerOffset = useGlassHeaderOffset();
  const { profile, user, offline } = useAuth();
  const isGuest = offline;
  const userId = user?.id ?? profile?.id ?? '';
  const displayName = profile?.display_name?.trim() || 'Organiser';

  const [group, setGroup] = useState<GroupSummary | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [regsBySession, setRegsBySession] = useState<Record<string, Registrant[]>>({});
  const [selectedBySession, setSelectedBySession] = useState<Record<string, Set<string>>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingMedia, setSavingMedia] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id || !userId) return;
    setLoading(true);
    try {
      const [g, people, upcoming, requests] = await Promise.all([
        getGroup(id, userId, isGuest),
        listGroupMembers(id, userId, isGuest),
        listGroupSessions(id, isGuest),
        listPendingJoinRequests(id).catch(() => [] as JoinRequest[]),
      ]);
      if (g) {
        const [avatar, cover] = await Promise.all([
          resolveMediaDisplayUrl(g.avatar_url),
          resolveMediaDisplayUrl(g.cover_url),
        ]);
        setGroup({
          ...g,
          avatar_url: avatar ?? g.avatar_url,
          cover_url: cover ?? g.cover_url,
        });
      } else {
        setGroup(g);
      }
      setMembers(people);
      setSessions(upcoming);
      setJoinRequests(requests);
      if (g && !canOrganiseGroup(g, userId)) {
        router.replace(`/group/${id}`);
        return;
      }

      const nextRegs: Record<string, Registrant[]> = {};
      const nextSelected: Record<string, Set<string>> = {};
      await Promise.all(
        upcoming.map(async (session) => {
          try {
            const list = await listRegistrants(session.id, id, isGuest);
            // Show everyone still in the mix-in (not cancelled)
            nextRegs[session.id] = list.filter((r) => r.status !== 'cancelled');
            nextSelected[session.id] = new Set(
              list
                .filter(
                  (r) =>
                    r.status === 'selected' ||
                    r.status === 'paid' ||
                    r.status === 'payment_claimed',
                )
                .map((r) => r.user_id),
            );
          } catch (e) {
            console.warn('Admin listRegistrants failed', session.id, e);
            nextRegs[session.id] = [];
            nextSelected[session.id] = new Set();
          }
        }),
      );
      setRegsBySession(nextRegs);
      setSelectedBySession(nextSelected);
    } finally {
      setLoading(false);
    }
  }, [id, userId, isGuest]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function togglePlayer(sessionId: string, playerId: string, maxPlayers: number) {
    void select();
    setSelectedBySession((prev) => {
      const current = new Set(prev[sessionId] ?? []);
      if (current.has(playerId)) current.delete(playerId);
      else {
        if (current.size >= maxPlayers) return prev;
        current.add(playerId);
      }
      return { ...prev, [sessionId]: current };
    });
  }

  async function confirmLineup(session: SessionSummary) {
    if (!id || !userId) return;
    const picked = Array.from(selectedBySession[session.id] ?? []);
    if (picked.length === 0) {
      Alert.alert('Select players', 'Tap players below, then confirm the lineup.');
      return;
    }
    if (!isGuest && (session.price_cents ?? 0) > 0) {
      try {
        const { getGroupPaymentSettings, isStripePayoutReady } = await import(
          '@/lib/payments'
        );
        const pay = await getGroupPaymentSettings(id, isGuest);
        if (!isStripePayoutReady(pay)) {
          Alert.alert(
            'Connect bank first',
            'Paid lineups need Stripe so players can pay in-app and you receive the court share automatically.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Payments', onPress: () => router.push(`/group/${id}/payments`) },
            ],
          );
          return;
        }
      } catch {
        // continue if settings unavailable
      }
    }
    setConfirmingId(session.id);
    try {
      await selectPlayersForSession({
        sessionId: session.id,
        groupId: id,
        organiserId: userId,
        displayName,
        selectedUserIds: picked,
        isGuest,
      });
      void success();
      Alert.alert(
        'Lineup confirmed',
        `${picked.length} player${picked.length === 1 ? '' : 's'} selected. They’ll be asked to pay next.`,
      );
      await load();
    } catch (e) {
      void warn();
      Alert.alert(
        'Couldn’t confirm',
        e instanceof Error ? e.message : 'Try again in a moment.',
      );
    } finally {
      setConfirmingId(null);
    }
  }

  function openMixinMore(session: SessionSummary, regs: Registrant[], lineupDone: boolean) {
    const options: string[] = [];
    if (!lineupDone && !regs.some((r) => r.user_id === userId)) options.push('I want to play');
    if (!lineupDone) options.push('Full lineup screen');
    if (session.session_room_id) {
      options.push('Fixtures', 'Scan tickets');
    }
    if (session.status === 'closed') options.push('Open wrap');
    else options.push('Close mix-in');
    options.push('Cancel');
    const cancelButtonIndex = options.length - 1;

    const run = (label: string) => {
      if (label === 'I want to play') {
        void registerMyself(session);
        return;
      }
      if (label === 'Full lineup screen') {
        router.push(`/group/${id}/select/${session.id}`);
        return;
      }
      if (label === 'Fixtures') {
        router.push(`/group/${id}/fixtures/${session.id}`);
        return;
      }
      if (label === 'Scan tickets') {
        router.push(`/group/${id}/check-in/${session.id}`);
        return;
      }
      if (label === 'Open wrap') {
        router.push(`/group/${id}/wrap/${session.id}`);
        return;
      }
      if (label === 'Close mix-in') {
        Alert.alert('Close mix-in?', 'Posts the wrap and locks session chat.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Close',
            style: 'destructive',
            onPress: () => {
              void (async () => {
                try {
                  await closeSession({
                    sessionId: session.id,
                    groupId: id!,
                    organiserId: userId,
                    isGuest,
                  });
                  void success();
                  await load();
                  router.push(`/group/${id}/wrap/${session.id}`);
                } catch {
                  void warn();
                }
              })();
            },
          },
        ]);
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex: options.indexOf('Close mix-in'),
        },
        (i) => {
          const label = options[i];
          if (!label || label === 'Cancel') return;
          void select();
          run(label);
        },
      );
      return;
    }

    Alert.alert(
      session.title,
      undefined,
      [
        ...options
          .filter((o) => o !== 'Cancel')
          .map((label) => ({
            text: label,
            style: (label === 'Close mix-in' ? 'destructive' : 'default') as
              | 'destructive'
              | 'default',
            onPress: () => run(label),
          })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  }

  async function pickGroupImage(kind: 'banner' | 'avatar') {
    if (!id || !userId) return;
    void tap();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos', 'Allow photo access to update the group image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: kind === 'avatar',
      aspect: kind === 'avatar' ? [1, 1] : undefined,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const localUri = result.assets[0].uri;
    setSavingMedia(true);
    try {
      const uploaded = await uploadGroupImage({
        userId,
        groupId: id,
        localUri,
        kind: kind === 'banner' ? 'cover' : 'avatar',
        mimeType: result.assets[0].mimeType,
      });
      // Persist storage path (or local uri in demo); resolve signed URL for display.
      const next = await updateGroup(id, userId, isGuest, {
        cover_url: kind === 'banner' ? uploaded.path : group?.cover_url,
        avatar_url: kind === 'avatar' ? uploaded.path : group?.avatar_url,
      });
      const display =
        (await resolveMediaDisplayUrl(kind === 'banner' ? next.cover_url : next.avatar_url)) ||
        uploaded.signedUrl;
      setGroup({
        ...next,
        cover_url: kind === 'banner' ? display : next.cover_url,
        avatar_url: kind === 'avatar' ? display : next.avatar_url,
      });
      void success();
    } catch (e) {
      void warn();
      Alert.alert('Couldn’t update', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSavingMedia(false);
    }
  }

  function confirmDeleteGroup() {
    if (!id || !userId || !group) return;
    Alert.alert(
      'Delete group?',
      `This permanently removes “${group.name}”, chats, and mix-ins. This can’t be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete group',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeleting(true);
              try {
                await deleteGroup(id, userId, isGuest);
                void success();
                router.replace('/(tabs)/chats');
              } catch (e) {
                void warn();
                Alert.alert(
                  'Couldn’t delete',
                  e instanceof Error ? e.message : 'Try again',
                );
              } finally {
                setDeleting(false);
              }
            })();
          },
        },
      ],
    );
  }

  async function registerMyself(session: SessionSummary) {
    if (!id || !userId) return;
    setRegisteringId(session.id);
    // Optimistic — show yourself immediately even if a later reload hiccups.
    setRegsBySession((prev) => {
      const list = prev[session.id] ?? [];
      if (list.some((r) => r.user_id === userId)) return prev;
      return {
        ...prev,
        [session.id]: [
          {
            id: `local-${userId}`,
            user_id: userId,
            display_name: `${displayName} (You)`,
            status: 'registered',
            reliability: 0,
            payment_claimed_at: null,
          },
          ...list,
        ],
      };
    });
    try {
      await registerForSession({
        sessionId: session.id,
        groupId: id,
        userId,
        displayName,
        isGuest,
      });
      void success();
      await load();
    } catch (e) {
      void warn();
      Alert.alert(
        'Couldn’t register',
        e instanceof Error ? e.message : 'Try again in a moment.',
      );
      await load();
    } finally {
      setRegisteringId(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accentGreen} />
      </View>
    );
  }

  const dockPad = 72 + Math.max(insets.bottom, 12);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Admin',
          headerBackTitle: 'Group',
          headerBackVisible: false,
          headerLeft: () => <HeaderBack fallbackHref={id ? `/group/${id}` : undefined} />,
        }}
      />
      <View style={styles.root}>
      <FlatList
        style={styles.list}
        data={members}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={{
          paddingTop: headerOffset,
          paddingBottom: dockPad + 24,
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.identity}>
              <Pressable
                style={styles.bannerTap}
                onPress={() => void pickGroupImage('banner')}
                disabled={savingMedia}
              >
                {group?.cover_url ? (
                  <Image source={{ uri: group.cover_url }} style={styles.cover} />
                ) : (
                  <View style={styles.coverPlaceholder}>
                    <Text style={styles.coverHint}>Tap to set banner</Text>
                  </View>
                )}
                <View style={styles.bannerEditChip}>
                  <Text style={styles.bannerEditText}>
                    {savingMedia ? 'Saving…' : 'Change banner'}
                  </Text>
                </View>
              </Pressable>

              <View style={styles.identityRow}>
                <Pressable
                  onPress={() => void pickGroupImage('avatar')}
                  disabled={savingMedia}
                  style={styles.avatarTap}
                >
                  {group?.avatar_url || group?.cover_url ? (
                    <Image
                      source={{ uri: group.avatar_url || group.cover_url! }}
                      style={styles.groupAvatar}
                    />
                  ) : (
                    <View style={styles.groupAvatarFallback}>
                      <Text style={styles.coverLetter}>
                        {(group?.name ?? 'G').slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.avatarEdit}>Change photo</Text>
                </Pressable>
                <View style={styles.identityCopy}>
                  <Text style={styles.bannerTitle}>{group?.name}</Text>
                  <Text style={styles.bannerMeta}>{members.length} members</Text>
                </View>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.menuCarousel}
            >
              {(
                [
                  { label: 'Payments', href: `/group/${id}/payments` },
                  { label: 'Settings', href: `/group/${id}/settings` },
                  { label: 'Leaderboard', href: `/group/${id}/leaderboard` },
                  { label: 'Invite', href: `/group/${id}/invite` },
                ] as const
              ).map((item) => (
                <Pressable
                  key={item.label}
                  style={styles.navChip}
                  onPress={() => {
                    void tap();
                    router.push(item.href);
                  }}
                >
                  <Text style={styles.navChipText}>{item.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.section}>Mix-ins</Text>

            {sessions.length === 0 ? (
              <Text style={styles.empty}>No mix-ins yet.</Text>
            ) : (
              sessions.map((session) => {
                const regs = regsBySession[session.id] ?? [];
                const selected = selectedBySession[session.id] ?? new Set();
                const hasLineupPicks = regs.some(
                  (r) =>
                    r.status === 'selected' ||
                    r.status === 'payment_claimed' ||
                    r.status === 'paid',
                );
                const lineupDone =
                  Boolean(session.session_room_id) ||
                  session.status === 'selected' ||
                  hasLineupPicks;
                const status =
                  session.status === 'closed'
                    ? 'Closed'
                    : session.session_room_id
                      ? 'Live'
                      : lineupDone
                        ? 'Awaiting pay'
                        : 'Interest';
                const confirming = confirmingId === session.id;
                const showPicker = !lineupDone && regs.length > 0;

                return (
                  <View key={session.id} style={styles.mixinCard}>
                    <View style={styles.cardTop}>
                      <View style={styles.cardCopy}>
                        <View style={styles.cardTitleRow}>
                          <Text style={styles.cardTitle} numberOfLines={1}>
                            {session.title}
                          </Text>
                          <View
                            style={[
                              styles.statusPill,
                              session.status === 'closed' && styles.statusPillMuted,
                              session.session_room_id &&
                                session.status !== 'closed' &&
                                styles.statusPillLive,
                            ]}
                          >
                            <Text style={styles.statusPillText}>{status}</Text>
                          </View>
                        </View>
                        <Text style={styles.cardMeta}>
                          {new Date(session.starts_at).toLocaleString([], {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {' · '}
                          {regs.length}/{session.max_players} interested
                        </Text>
                      </View>
                      <Pressable
                        style={styles.moreBtn}
                        onPress={() => {
                          void tap();
                          openMixinMore(session, regs, lineupDone);
                        }}
                        hitSlop={8}
                        accessibilityLabel="More mix-in actions"
                      >
                        <Icon icon={Ellipsis} color={colors.textSecondary} size="sm" />
                      </Pressable>
                    </View>

                    {showPicker ? (
                      <View style={styles.regList}>
                        {regs.slice(0, 6).map((reg) => {
                          const on = selected.has(reg.user_id);
                          return (
                            <Pressable
                              key={reg.id}
                              onPress={() =>
                                togglePlayer(session.id, reg.user_id, session.max_players)
                              }
                              style={[styles.regRow, on && styles.regRowOn]}
                            >
                              <View style={[styles.check, on && styles.checkOn]}>
                                {on ? <Text style={styles.checkMark}>✓</Text> : null}
                              </View>
                              <Text style={styles.regName} numberOfLines={1}>
                                {reg.display_name}
                                {reg.user_id === userId ? ' (You)' : ''}
                              </Text>
                            </Pressable>
                          );
                        })}
                        {regs.length > 6 ? (
                          <Text style={styles.emptyRegs}>+{regs.length - 6} more · use ⋯</Text>
                        ) : null}
                      </View>
                    ) : null}

                    {!lineupDone ? (
                      <Pressable
                        style={[
                          styles.primaryBtn,
                          (confirming || selected.size === 0) && styles.confirmDisabled,
                        ]}
                        disabled={confirming || selected.size === 0}
                        onPress={() => {
                          void tap();
                          void confirmLineup(session);
                        }}
                      >
                        <Text style={styles.primaryBtnText}>
                          {confirming
                            ? 'Confirming…'
                            : selected.size === 0
                              ? 'Select players above'
                              : `Confirm lineup · ${selected.size}`}
                        </Text>
                      </Pressable>
                    ) : session.status === 'closed' ? (
                      <Pressable
                        style={styles.secondaryBtn}
                        onPress={() => {
                          void select();
                          router.push(`/group/${id}/wrap/${session.id}`);
                        }}
                      >
                        <Text style={styles.secondaryBtnText}>Open wrap</Text>
                      </Pressable>
                    ) : session.session_room_id ? (
                      <Pressable
                        style={styles.secondaryBtn}
                        onPress={() => {
                          void select();
                          router.push(`/group/${id}/session-room/${session.session_room_id}`);
                        }}
                      >
                        <Text style={styles.secondaryBtnText}>Open session chat</Text>
                      </Pressable>
                    ) : (
                      <View style={styles.awaitingPill}>
                        <Text style={styles.awaitingText}>Waiting for payments</Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {joinRequests.length > 0 ? (
              <View style={{ gap: 10, marginBottom: 8 }}>
                <Text style={styles.section}>Join requests</Text>
                {joinRequests.map((req) => (
                  <View key={req.id} style={styles.mixinCard}>
                    <Text style={styles.cardTitle}>{req.display_name}</Text>
                    <Text style={styles.cardMeta}>Wants to join this group</Text>
                    <View style={styles.rowActions}>
                      <Pressable
                        style={styles.navBtn}
                        onPress={() => {
                          void (async () => {
                            try {
                              await resolveJoinRequest({
                                requestId: req.id,
                                groupId: id!,
                                userId: req.user_id,
                                displayName: req.display_name,
                                approve: true,
                                organiserId: userId,
                              });
                              void success();
                              await load();
                            } catch (e) {
                              void warn();
                              Alert.alert(
                                'Could not approve',
                                e instanceof Error ? e.message : 'Try again',
                              );
                            }
                          })();
                        }}
                      >
                        <Text style={styles.navBtnText}>Approve</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.actionChip, styles.actionChipDanger]}
                        onPress={() => {
                          void (async () => {
                            try {
                              await resolveJoinRequest({
                                requestId: req.id,
                                groupId: id!,
                                userId: req.user_id,
                                displayName: req.display_name,
                                approve: false,
                                organiserId: userId,
                              });
                              await load();
                            } catch {
                              void warn();
                            }
                          })();
                        }}
                      >
                        <Text style={styles.actionChipTextDanger}>Reject</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={styles.section}>Members</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.dangerZone}>
            <Text style={styles.section}>Danger zone</Text>
            <Pressable
              style={[styles.deleteBtn, deleting && { opacity: 0.5 }]}
              disabled={deleting}
              onPress={confirmDeleteGroup}
            >
              <Text style={styles.deleteBtnText}>
                {deleting ? 'Deleting…' : 'Delete group'}
              </Text>
            </Pressable>
            <Text style={styles.deleteHint}>
              Removes the group for everyone. Mix-ins and chat history are deleted.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const letter = item.display_name.slice(0, 1).toUpperCase();
          return (
            <Pressable
              style={styles.memberRow}
              onPress={() => {
                void tap();
                router.push(`/group/${id}/member/${item.user_id}`);
              }}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{letter}</Text>
              </View>
              <View style={styles.copy}>
                <Text style={styles.name}>
                  {item.display_name}
                  {item.is_you ? ' (You)' : ''}
                </Text>
                <Text style={styles.meta}>
                  {levelLabel(item.organiser_level)} ·{' '}
                  {item.reliability == null ? 'new' : `${item.reliability}%`} ·{' '}
                  {item.sessions_played} played
                </Text>
              </View>
              <Icon icon={ChevronRight} color={colors.textMuted} size="sm" strokeWidth={2.25} />
            </Pressable>
          );
        }}
      />

      <View style={[styles.createDock, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable
          style={styles.createMixinBtn}
          onPress={() => {
            void tap();
            if (id) router.push(`/group/${id}/create-mixin`);
          }}
          accessibilityRole="button"
          accessibilityLabel="Create mix-in"
        >
          <Text style={styles.createMixinBtnText}>Create mix-in</Text>
        </Pressable>
      </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  list: { flex: 1 },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: { padding: spacing.md, gap: spacing.md },
  identity: { gap: 12 },
  bannerTap: { position: 'relative' },
  cover: {
    width: '100%',
    height: 132,
    borderRadius: 14,
    backgroundColor: colors.elevated,
  },
  coverPlaceholder: {
    width: '100%',
    height: 132,
    borderRadius: 14,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverHint: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 14,
    color: colors.textMuted,
  },
  bannerEditChip: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(11,13,16,0.78)',
  },
  bannerEditText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 12,
    color: colors.textPrimary,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarTap: { alignItems: 'center', gap: 4 },
  groupAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.elevated,
  },
  groupAvatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  coverLetter: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 24,
    color: colors.textPrimary,
  },
  avatarEdit: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 11,
    color: colors.textMuted,
  },
  identityCopy: { flex: 1, gap: 4 },
  bannerTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 22,
    color: colors.textPrimary,
  },
  bannerMeta: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
  },
  menuCarousel: {
    gap: 8,
    paddingVertical: 2,
  },
  navChip: {
    paddingHorizontal: 16,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navChipText: {
    fontFamily: 'Figtree_600SemiBold',
    color: colors.textPrimary,
    fontSize: 14,
  },
  navBtn: {
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: {
    fontFamily: 'Figtree_600SemiBold',
    color: colors.textPrimary,
    fontSize: 14,
  },
  section: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: 4,
  },
  createDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  createMixinBtn: {
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createMixinBtnText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 16,
    color: '#0B0D10',
  },
  dangerZone: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: 10,
  },
  deleteBtn: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,90,90,0.55)',
    backgroundColor: 'rgba(255,90,90,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 15,
    color: '#FF6B6B',
  },
  deleteHint: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
  empty: {
    fontFamily: 'Figtree_400Regular',
    color: colors.textMuted,
    fontSize: 14,
  },
  mixinCard: {
    backgroundColor: colors.elevated,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardCopy: { flex: 1, gap: 4 },
  cardTitle: {
    flexShrink: 1,
    fontFamily: 'Figtree_700Bold',
    fontSize: 17,
    color: colors.textPrimary,
  },
  cardMeta: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
  },
  moreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statusPillLive: {
    borderColor: 'rgba(200,255,46,0.35)',
    backgroundColor: 'rgba(200,255,46,0.12)',
  },
  statusPillMuted: {
    opacity: 0.7,
  },
  statusPillText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 11,
    color: colors.textSecondary,
  },
  emptyRegs: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  regList: { gap: 6 },
  regRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  regRowOn: {
    borderColor: colors.accentGreen,
    backgroundColor: colors.accentGreenDim,
  },
  regLocked: { opacity: 0.7 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    borderColor: colors.accentGreen,
    backgroundColor: colors.accentGreen,
  },
  checkMark: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 13,
    color: '#0B0D10',
  },
  regName: {
    flex: 1,
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 15,
    color: '#0B0D10',
  },
  secondaryBtn: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 14,
    color: colors.textPrimary,
  },
  confirmDisabled: { opacity: 0.45 },
  awaitingPill: {
    minHeight: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  awaitingText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 13,
    color: colors.textMuted,
  },
  actionChip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionChipDanger: {
    backgroundColor: 'rgba(255,90,90,0.12)',
    borderColor: 'rgba(255,90,90,0.55)',
  },
  actionChipTextDanger: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 13,
    color: '#FF6B6B',
  },
  rowActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  copy: { flex: 1, gap: 2 },
  name: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  meta: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
});
