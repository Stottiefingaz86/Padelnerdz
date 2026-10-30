import { colors, radii, spacing } from '@padel-nerdz/config';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { select, success, tap, warn } from '@/lib/feedback';
import { useGlassHeaderOffset } from '@/lib/layout';
import {
  canOrganiseGroup,
  getGroup,
  levelLabel,
  listGroupMembers,
  listPendingJoinRequests,
  resolveJoinRequest,
  type GroupMember,
  type GroupSummary,
  type JoinRequest,
} from '@/lib/groups';
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
      setGroup(g);
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
            const interested = list.filter(
              (r) =>
                r.status === 'registered' ||
                r.status === 'selected' ||
                r.status === 'waitlist' ||
                r.status === 'payment_claimed' ||
                r.status === 'paid',
            );
            nextRegs[session.id] = interested;
            nextSelected[session.id] = new Set(
              list.filter((r) => r.status === 'selected' || r.status === 'paid' || r.status === 'payment_claimed').map((r) => r.user_id),
            );
          } catch {
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

  return (
    <>
      <Stack.Screen options={{ title: 'Admin', headerBackTitle: 'Group' }} />
      <FlatList
        style={styles.root}
        data={members}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={{
          paddingTop: headerOffset,
          paddingBottom: insets.bottom + 32,
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.banner}>
              {group?.cover_url ? (
                <Image source={{ uri: group.cover_url }} style={styles.cover} />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Text style={styles.coverLetter}>
                    {(group?.name ?? 'G').slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.bannerTitle}>{group?.name}</Text>
              <Text style={styles.bannerMeta}>
                {members.length} members ·{' '}
                {group?.members_can_post ? 'Anyone can post' : 'Admins only can post'}
              </Text>
            </View>

            <View style={styles.quick}>
              <Pressable
                style={styles.primary}
                onPress={() => {
                  void tap();
                  router.push(`/group/${id}/create-mixin`);
                }}
              >
                <Text style={styles.primaryText}>Create mix-in</Text>
              </Pressable>
              <Pressable
                style={styles.secondary}
                onPress={() => router.push(`/group/${id}/payments`)}
              >
                <Text style={styles.secondaryText}>Payments</Text>
              </Pressable>
              <Pressable
                style={styles.secondary}
                onPress={() => router.push(`/group/${id}/settings`)}
              >
                <Text style={styles.secondaryText}>Settings</Text>
              </Pressable>
            </View>

            <Text style={styles.section}>Your mix-ins · lineup control</Text>
            <Text style={styles.sectionHelp}>
              See who’s registered, tap who should play, then confirm. Full control lives here — not
              only in chat.
            </Text>

            {sessions.length === 0 ? (
              <Text style={styles.empty}>No mix-ins yet. Create one above.</Text>
            ) : (
              sessions.map((session) => {
                const regs = regsBySession[session.id] ?? [];
                const selected = selectedBySession[session.id] ?? new Set();
                const lineupDone = Boolean(session.session_room_id) || session.status === 'selected';
                const status =
                  session.status === 'closed'
                    ? 'Closed'
                    : session.session_room_id
                      ? 'Session open'
                      : session.status === 'selected'
                        ? 'Awaiting payments'
                        : 'Collecting interest';
                const confirming = confirmingId === session.id;

                return (
                  <View key={session.id} style={styles.mixinCard}>
                    <Text style={styles.cardTitle}>{session.title}</Text>
                    <Text style={styles.cardMeta}>
                      {new Date(session.starts_at).toLocaleString([], {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' · '}
                      {regs.length}/{session.max_players} registered · {status}
                    </Text>

                    {regs.length === 0 ? (
                      <Text style={styles.emptyRegs}>
                        Nobody registered yet. Tap “I want to play” if you’re joining this mix-in.
                      </Text>
                    ) : (
                      <View style={styles.regList}>
                        {regs.map((reg) => {
                          const on = selected.has(reg.user_id);
                          const locked = lineupDone;
                          return (
                            <Pressable
                              key={reg.id}
                              disabled={locked}
                              onPress={() =>
                                togglePlayer(session.id, reg.user_id, session.max_players)
                              }
                              style={[styles.regRow, on && styles.regRowOn, locked && styles.regLocked]}
                            >
                              <View style={[styles.check, on && styles.checkOn]}>
                                {on ? <Text style={styles.checkMark}>✓</Text> : null}
                              </View>
                              <View style={styles.regCopy}>
                                <Text style={styles.regName}>
                                  {reg.display_name}
                                  {reg.user_id === userId ? ' (You)' : ''}
                                </Text>
                                <Text style={styles.regMeta}>
                                  {reg.status.replace('_', ' ')}
                                  {reg.reliability > 0 ? ` · ${reg.reliability}%` : ' · new'}
                                </Text>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}

                    {!lineupDone && !regs.some((r) => r.user_id === userId) ? (
                      <Pressable
                        style={[
                          styles.playBtn,
                          registeringId === session.id && styles.confirmDisabled,
                        ]}
                        disabled={registeringId === session.id}
                        onPress={() => {
                          void tap();
                          void registerMyself(session);
                        }}
                      >
                        <Text style={styles.playBtnText}>
                          {registeringId === session.id ? 'Registering…' : 'I want to play'}
                        </Text>
                      </Pressable>
                    ) : null}

                    {!lineupDone && regs.some((r) => r.user_id === userId) ? (
                      <Text style={styles.youIn}>You’re registered to play this mix-in.</Text>
                    ) : null}

                    {!lineupDone ? (
                      <Pressable
                        style={[
                          styles.confirmBtn,
                          (confirming || selected.size === 0) && styles.confirmDisabled,
                        ]}
                        disabled={confirming || selected.size === 0}
                        onPress={() => {
                          void tap();
                          void confirmLineup(session);
                        }}
                      >
                        <Text style={styles.confirmText}>
                          {confirming
                            ? 'Confirming…'
                            : `Confirm lineup · ${selected.size}/${session.max_players}`}
                        </Text>
                      </Pressable>
                    ) : null}

                    <View style={styles.cardActions}>
                      {!session.session_room_id && session.status !== 'closed' ? (
                        <Pressable
                          onPress={() => {
                            void select();
                            router.push(`/group/${id}/select/${session.id}`);
                          }}
                        >
                          <Text style={styles.link}>Full screen select</Text>
                        </Pressable>
                      ) : null}
                      {session.status === 'selected' || session.session_room_id ? (
                        <Pressable
                          onPress={() => {
                            void select();
                            router.push(`/group/${id}/verify-payments/${session.id}`);
                          }}
                        >
                          <Text style={styles.link}>Verify payments</Text>
                        </Pressable>
                      ) : null}
                      {session.session_room_id ? (
                        <Pressable
                          onPress={() =>
                            router.push(`/group/${id}/session-room/${session.session_room_id}`)
                          }
                        >
                          <Text style={styles.link}>Open session</Text>
                        </Pressable>
                      ) : null}
                      {session.session_room_id ? (
                        <Pressable
                          onPress={() => {
                            void select();
                            router.push(`/group/${id}/fixtures/${session.id}`);
                          }}
                        >
                          <Text style={styles.link}>Fixtures</Text>
                        </Pressable>
                      ) : null}
                      {session.status !== 'closed' ? (
                        <Pressable
                          onPress={() => {
                            void select();
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
                                router.push(`/group/${id}/chat`);
                              } catch {
                                void warn();
                              }
                            })();
                          }}
                        >
                          <Text style={styles.linkDanger}>Close + wrap</Text>
                        </Pressable>
                      ) : null}
                    </View>
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
                        <Text style={styles.link}>Approve</Text>
                      </Pressable>
                      <Pressable
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
                        <Text style={styles.linkDanger}>Reject</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.membersHead}>
              <Text style={styles.section}>Members · reliability</Text>
              <Pressable onPress={() => router.push(`/group/${id}/invite`)}>
                <Text style={styles.link}>Invite</Text>
              </Pressable>
            </View>
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
                  {item.reliability == null ? 'new' : `${item.reliability}% reliable`} ·{' '}
                  {item.sessions_played} played
                </Text>
                {item.notes ? (
                  <Text style={styles.note} numberOfLines={1}>
                    Note · {item.notes}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          );
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: { padding: spacing.md, gap: spacing.md },
  banner: { gap: 6 },
  cover: {
    width: '100%',
    height: 120,
    borderRadius: 14,
    backgroundColor: colors.elevated,
  },
  coverPlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 14,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverLetter: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 42,
    color: colors.accentGreen,
  },
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
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primary: {
    paddingHorizontal: 16,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontFamily: 'Figtree_700Bold',
    color: '#0B0D10',
    fontSize: 14,
  },
  secondary: {
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontFamily: 'Figtree_700Bold',
    color: colors.textPrimary,
    fontSize: 14,
  },
  section: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: 4,
  },
  sectionHelp: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: -8,
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
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(200,255,46,0.35)',
  },
  cardTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 17,
    color: colors.textPrimary,
  },
  cardMeta: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: -4,
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
  regCopy: { flex: 1, gap: 2 },
  regName: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  regMeta: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
  playBtn: {
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.accentGreen,
    backgroundColor: colors.accentGreenDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 15,
    color: colors.accentGreen,
  },
  youIn: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 13,
    color: colors.accentGreen,
  },
  confirmBtn: {
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDisabled: { opacity: 0.45 },
  confirmText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 15,
    color: '#0B0D10',
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 2,
  },
  link: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 13,
    color: colors.accentGreen,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  linkDanger: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 13,
    color: colors.error,
  },
  membersHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
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
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 16,
    color: '#0B0D10',
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
  note: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
  },
  chevron: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 22,
    color: colors.textMuted,
  },
});
