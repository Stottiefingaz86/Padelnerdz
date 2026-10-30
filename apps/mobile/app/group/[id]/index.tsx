import { colors, spacing } from '@padel-nerdz/config';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlatSettingsIcon } from '@/components/FlatSettingsIcon';
import { MemberRow } from '@/components/chat/MemberRow';
import { useAuth } from '@/lib/auth';
import { select, tap } from '@/lib/feedback';
import { useGlassHeaderOffset } from '@/lib/layout';
import {
  canOrganiseGroup,
  getGroup,
  joinGroup,
  listGroupMembers,
  type GroupMember,
  type GroupSummary,
} from '@/lib/groups';
import { listGroupSessions, type SessionSummary } from '@/lib/sessions';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const headerOffset = useGlassHeaderOffset();
  const { profile, user , offline } = useAuth();
  const isGuest = offline;
  const userId = user?.id ?? profile?.id ?? '';

  const [group, setGroup] = useState<GroupSummary | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !userId) return;
    setLoading(true);
    setError(null);
    try {
      const [next, people, upcoming] = await Promise.all([
        getGroup(id, userId, isGuest),
        listGroupMembers(id, userId, isGuest),
        listGroupSessions(id, isGuest),
      ]);
      setGroup(next);
      setMembers(people);
      setSessions(upcoming);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load group');
    } finally {
      setLoading(false);
    }
  }, [id, userId, isGuest]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onJoin() {
    if (!id || !userId) return;
    setJoining(true);
    setError(null);
    try {
      setGroup(
        await joinGroup(id, userId, isGuest, profile?.display_name?.trim() || 'Player'),
      );
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not join';
      if (msg === 'REQUEST_PENDING') {
        setError('Request sent — an organiser will approve you in Admin.');
      } else {
        setError(msg);
      }
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accentGreen} />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={[styles.center, { padding: spacing.lg }]}>
        <Text style={styles.error}>{error ?? 'Group not found'}</Text>
      </View>
    );
  }

  const organiser = canOrganiseGroup(group, userId);
  const canJoin = !group.is_member && group.visibility === 'public';
  const needsApproval = !group.is_member && group.visibility === 'approval';
  const participantCount = Math.max(members.length, group.member_count);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Group',
          headerBackTitle: 'Chat',
          headerRight: organiser
            ? () => (
                <Pressable
                  onPress={() => {
                    void tap();
                    router.push(`/group/${group.id}/admin`);
                  }}
                  hitSlop={10}
                  style={styles.gearBtn}
                >
                  <FlatSettingsIcon />
                </Pressable>
              )
            : undefined,
        }}
      />
      <FlatList
        style={styles.root}
        data={group.is_member ? members : []}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={{
          paddingTop: headerOffset,
          paddingBottom: insets.bottom + 32,
        }}
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              {group.cover_url ? (
                <Image source={{ uri: group.cover_url }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{group.name.slice(0, 1).toUpperCase()}</Text>
                </View>
              )}
              <Text style={styles.title}>{group.name}</Text>
              <Text style={styles.meta}>
                Group · {participantCount} participant{participantCount === 1 ? '' : 's'}
              </Text>
              {group.description ? <Text style={styles.desc}>{group.description}</Text> : null}
              {group.location_label ? (
                <Text style={styles.location}>{group.location_label}</Text>
              ) : null}
            </View>

            {group.is_member ? (
              <View style={styles.tiles}>
                <Pressable
                  style={[styles.tile, styles.tilePrimary]}
                  onPress={() => {
                    void tap();
                    router.push(`/group/${group.id}/chat`);
                  }}
                >
                  <Text style={styles.tilePrimaryText}>Open chat</Text>
                </Pressable>
                <Pressable
                  style={styles.tile}
                  onPress={() => {
                    void tap();
                    router.push(`/group/${group.id}/invite`);
                  }}
                >
                  <Text style={styles.tileText}>Invite</Text>
                </Pressable>
              </View>
            ) : null}

            {canJoin || needsApproval ? (
              <Pressable
                style={[styles.joinBtn, joining && { opacity: 0.5 }]}
                onPress={() => void onJoin()}
                disabled={joining}
              >
                <Text style={styles.joinText}>
                  {joining
                    ? 'Sending…'
                    : needsApproval
                      ? 'Request to join'
                      : 'Join group'}
                </Text>
              </Pressable>
            ) : null}
            {needsApproval ? (
              <Text style={styles.hint}>
                Approval group — organisers review requests in Admin. Invite codes still work.
              </Text>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {group.is_member && sessions.length > 0 ? (
              <View style={styles.block}>
                <Text style={styles.blockTitle}>Upcoming mix-ins</Text>
                {sessions.map((session) => (
                  <Pressable
                    key={session.id}
                    style={styles.mixinRow}
                    onPress={() => {
                      void select();
                      router.push(`/group/${group.id}/chat`);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.mixinTitle}>{session.title}</Text>
                      <Text style={styles.mixinMeta}>
                        {new Date(session.starts_at).toLocaleString([], {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {` · ${session.registered_count} interested`}
                      </Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {group.is_member ? (
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>
                  {participantCount} participant{participantCount === 1 ? '' : 's'}
                </Text>
                <Pressable
                  onPress={() => {
                    void tap();
                    router.push(`/group/${group.id}/invite`);
                  }}
                >
                  <Text style={styles.addLink}>Add</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <MemberRow
            member={item}
            onPress={() => {
              void tap();
              router.push(`/group/${id}/member/${item.user_id}`);
            }}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          group.is_member ? (
            <Text style={styles.hint}>No members yet — invite from contacts.</Text>
          ) : (
            <View />
          )
        }
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
  gearBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  hero: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    gap: 6,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
    marginBottom: 8,
    backgroundColor: colors.elevated,
  },
  avatarText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 38,
    color: '#0B0D10',
  },
  title: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 22,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  meta: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
  },
  desc: {
    marginTop: 6,
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  location: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textMuted,
  },
  tiles: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  tile: {
    minWidth: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.elevated,
    alignItems: 'center',
  },
  tilePrimary: { backgroundColor: colors.accentGreen },
  tileText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 14,
    color: colors.accentGreen,
  },
  tilePrimaryText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 14,
    color: '#0B0D10',
  },
  joinBtn: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinText: {
    fontFamily: 'Figtree_700Bold',
    color: '#0B0D10',
    fontSize: 16,
  },
  block: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    paddingTop: spacing.sm,
  },
  blockTitle: {
    paddingHorizontal: spacing.md,
    paddingBottom: 8,
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 14,
    color: colors.textSecondary,
  },
  mixinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    gap: 8,
  },
  mixinTitle: {
    fontFamily: 'Figtree_600SemiBold',
    color: colors.textPrimary,
    fontSize: 15,
  },
  mixinMeta: {
    fontFamily: 'Figtree_400Regular',
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  chevron: { color: colors.textMuted, fontSize: 22 },
  sectionHead: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 14,
    color: colors.textSecondary,
  },
  addLink: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 14,
    color: colors.accentGreen,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle,
    marginLeft: 78,
  },
  hint: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    fontFamily: 'Figtree_400Regular',
  },
  error: {
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontFamily: 'Figtree_400Regular',
  },
});
