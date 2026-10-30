import { colors, spacing } from '@padel-nerdz/config';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/lib/auth';
import { select, success, tap, warn } from '@/lib/feedback';
import { openDmWithMember } from '@/lib/dm';
import { addFriendFromMember, isFriend } from '@/lib/friends';
import { useGlassHeaderOffset } from '@/lib/layout';
import {
  blockGroupMember,
  canOrganiseGroup,
  getGroup,
  getGroupMember,
  levelLabel,
  removeGroupMember,
  updateMemberProfile,
  type GroupMember,
  type GroupSummary,
  type OrganiserLevel,
} from '@/lib/groups';

const LEVELS: OrganiserLevel[] = [
  'beginner',
  'intermediate',
  'advanced',
  'pro',
  'unknown',
];

export default function MemberAdminScreen() {
  const { id, userId: memberId } = useLocalSearchParams<{ id: string; userId: string }>();
  const insets = useSafeAreaInsets();
  const headerOffset = useGlassHeaderOffset();
  const { profile, user, offline } = useAuth();
  const isGuest = offline;
  const viewerId = user?.id ?? profile?.id ?? '';

  const [group, setGroup] = useState<GroupSummary | null>(null);
  const [member, setMember] = useState<GroupMember | null>(null);
  const [level, setLevel] = useState<OrganiserLevel>('unknown');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [alreadyFriend, setAlreadyFriend] = useState(false);

  const load = useCallback(async () => {
    if (!id || !memberId) return;
    setLoading(true);
    try {
      const [g, m] = await Promise.all([
        getGroup(id, viewerId, isGuest),
        getGroupMember(id, memberId, viewerId, isGuest),
      ]);
      setGroup(g);
      setMember(m);
      if (m) {
        setLevel(m.organiser_level);
        setNotes(m.notes);
        setAlreadyFriend(await isFriend(m.user_id));
      }
    } finally {
      setLoading(false);
    }
  }, [id, memberId, viewerId, isGuest]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const organiser = canOrganiseGroup(group, viewerId);

  async function onSave() {
    if (!id || !memberId || !organiser) return;
    setSaving(true);
    try {
      const updated = await updateMemberProfile({
        groupId: id,
        memberId,
        actorId: viewerId,
        isGuest,
        organiser_level: level,
        notes,
      });
      setMember(updated);
      void success();
    } catch {
      void warn();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accentGreen} />
      </View>
    );
  }

  if (!member) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Member not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: member.display_name,
          headerBackTitle: organiser ? 'Admin' : 'Group',
        }}
      />
      <ScrollView
        style={styles.root}
        contentContainerStyle={{
          paddingTop: headerOffset,
          paddingBottom: insets.bottom + 32,
          gap: spacing.md,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Avatar name={member.display_name} size={84} />
          <Text style={styles.name}>{member.display_name}</Text>
          <Text style={styles.role}>
            Group rank #{member.group_rank}
            {member.role && member.role !== 'member' ? ` · ${member.role}` : ''}
          </Text>
          {!member.is_you ? (
            <View style={styles.friendBtn}>
              <AppButton
                label="Message"
                onPress={() => {
                  void tap();
                  if (!id || messaging) return;
                  void (async () => {
                    setMessaging(true);
                    try {
                      const threadId = await openDmWithMember({
                        peerId: member.user_id,
                        peerName: member.display_name,
                        groupId: id,
                        actorId: viewerId,
                        isGuest,
                      });
                      void success();
                      router.push(`/dm/${threadId}`);
                    } catch (e) {
                      void warn();
                      Alert.alert(
                        'Couldn’t open chat',
                        e instanceof Error ? e.message : 'Try again',
                      );
                    } finally {
                      setMessaging(false);
                    }
                  })();
                }}
                loading={messaging}
              />
              <AppButton
                label={alreadyFriend ? 'Friends ✓' : 'Add friend'}
                variant="secondary"
                onPress={() => {
                  void tap();
                  if (alreadyFriend) return;
                  void (async () => {
                    try {
                      await addFriendFromMember({
                        userId: member.user_id,
                        displayName: member.display_name,
                      });
                      setAlreadyFriend(true);
                      void success();
                    } catch {
                      void warn();
                    }
                  })();
                }}
                disabled={alreadyFriend}
              />
            </View>
          ) : null}
        </View>

        {!member.is_you ? (
          <View style={styles.dmHint}>
            <Text style={styles.dmHintText}>
              {organiser
                ? 'Private inbox message — suggest a short trial hit to gauge level before a mix-in.'
                : 'Opens in their Inbox. Both of you can keep chatting there.'}
            </Text>
          </View>
        ) : null}

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>#{member.group_rank}</Text>
            <Text style={styles.statLabel}>Rank</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{member.points}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {member.best_finish != null ? `#${member.best_finish}` : '—'}
            </Text>
            <Text style={styles.statLabel}>Best finish</Text>
          </View>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{member.sessions_played}</Text>
            <Text style={styles.statLabel}>Mix-ins</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {member.reliability == null ? '—' : `${member.reliability}%`}
            </Text>
            <Text style={styles.statLabel}>Reliability</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{member.no_shows}</Text>
            <Text style={styles.statLabel}>No-shows</Text>
          </View>
        </View>

        {!organiser ? (
          <View style={styles.readonlyNote}>
            <Text style={styles.readonlyText}>
              You’re a member of this group. Only organisers can edit levels, notes, or remove
              players.
            </Text>
            <Text style={styles.levelReadonly}>Plays as {levelLabel(member.organiser_level)}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.label}>Your level rating</Text>
            <View style={styles.levels}>
              {LEVELS.map((item) => {
                const on = level === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => {
                      void select();
                      setLevel(item);
                    }}
                    style={[styles.levelChip, on && styles.levelChipOn]}
                  >
                    <Text style={[styles.levelText, on && styles.levelTextOn]}>
                      {levelLabel(item)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Private organiser notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Strengths, preferences, warnings…"
              placeholderTextColor={colors.textMuted}
              cursorColor={colors.accentGreen}
              selectionColor="rgba(200,255,46,0.28)"
              keyboardAppearance="dark"
              multiline
              style={styles.notes}
            />

            <Pressable
              style={[styles.save, saving && { opacity: 0.5 }]}
              onPress={() => {
                void tap();
                void onSave();
              }}
              disabled={saving}
            >
              <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save member'}</Text>
            </Pressable>

            {!member.is_you ? (
              <View style={styles.dangerZone}>
                <Pressable
                  style={styles.dangerBtn}
                  onPress={() => {
                    void tap();
                    Alert.alert(
                      'Remove from group',
                      `Remove ${member.display_name} from this group?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: () => {
                            void (async () => {
                              try {
                                await removeGroupMember({
                                  groupId: id!,
                                  memberId: memberId!,
                                  actorId: viewerId,
                                  isGuest,
                                });
                                void success();
                                router.back();
                              } catch {
                                void warn();
                              }
                            })();
                          },
                        },
                      ],
                    );
                  }}
                >
                  <Text style={styles.dangerText}>Remove from group</Text>
                </Pressable>
                <Pressable
                  style={styles.dangerBtn}
                  onPress={() => {
                    void tap();
                    Alert.alert(
                      'Block from group',
                      `Block ${member.display_name}? They can’t rejoin.`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Block',
                          style: 'destructive',
                          onPress: () => {
                            void (async () => {
                              try {
                                await blockGroupMember({
                                  groupId: id!,
                                  memberId: memberId!,
                                  blockedBy: viewerId,
                                  isGuest,
                                });
                                void success();
                                router.back();
                              } catch {
                                void warn();
                              }
                            })();
                          },
                        },
                      ],
                    );
                  }}
                >
                  <Text style={styles.dangerText}>Block from group</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { color: colors.textMuted },
  hero: { alignItems: 'center', gap: 6, paddingVertical: spacing.md },
  name: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 22,
    color: colors.textPrimary,
  },
  role: {
    fontFamily: 'Figtree_400Regular',
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  friendBtn: { alignSelf: 'stretch', marginTop: 10, gap: 8 },
  dmHint: {
    backgroundColor: colors.elevated,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dmHintText: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 22,
    color: colors.accentGreen,
  },
  statLabel: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 11,
    color: colors.textMuted,
  },
  readonlyNote: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  readonlyText: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  levelReadonly: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 14,
    color: colors.textPrimary,
  },
  label: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
  levels: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  levelChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  levelChipOn: {
    borderColor: colors.accentGreen,
    backgroundColor: colors.accentGreenDim,
  },
  levelText: {
    fontFamily: 'Figtree_600SemiBold',
    color: colors.textSecondary,
    fontSize: 13,
  },
  levelTextOn: { color: colors.accentGreen },
  notes: {
    minHeight: 110,
    borderRadius: 12,
    padding: 14,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontFamily: 'Figtree_400Regular',
    fontSize: 15,
    textAlignVertical: 'top',
  },
  save: {
    marginTop: spacing.sm,
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontFamily: 'Figtree_700Bold',
    color: '#0B0D10',
    fontSize: 16,
  },
  dangerZone: { gap: 10, marginTop: spacing.md },
  dangerBtn: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerText: {
    fontFamily: 'Figtree_600SemiBold',
    color: colors.error,
    fontSize: 15,
  },
});
