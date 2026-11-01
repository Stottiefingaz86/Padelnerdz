import type { GroupRole, GroupVisibility } from '@padel-nerdz/domain';

import {
  blockDemoMember,
  createDemoGroup,
  getDemoGroup,
  getDemoMember,
  getGuestSkillLevel,
  inviteDemoFriendsToGroup,
  isDemoBlocked,
  isDemoMember,
  joinDemoByInviteCode,
  joinDemoGroup,
  listDemoDiscoverable,
  listDemoMembers,
  listDemoMemberships,
  deleteDemoGroup,
  removeDemoMember,
  updateDemoGroup,
  updateDemoMemberProfile,
  type DemoGroup,
  type OrganiserLevel,
} from './demo-store';
import { AnalyticsEvents, track } from './analytics';
import { sendGroupMessage } from './chat';
import { hubFromLabel } from './locations';
import { getSupabase, getSupabaseLoose, isSupabaseConfigured } from './supabase';

export type { OrganiserLevel };

export type GroupMember = {
  user_id: string;
  display_name: string;
  role: GroupRole;
  is_you?: boolean;
  organiser_level: OrganiserLevel;
  notes: string;
  sessions_played: number;
  no_shows: number;
  reliability: number | null;
  /** 1-based rank in this group by points / reliability. */
  group_rank: number;
  best_finish: number | null;
  points: number;
};

export type GroupSummary = {
  id: string;
  name: string;
  description: string | null;
  visibility: GroupVisibility;
  location_label: string | null;
  skill_level: OrganiserLevel | null;
  skill_level_max: OrganiserLevel | null;
  distance_miles: number | null;
  cover_url: string | null;
  avatar_url: string | null;
  members_can_post: boolean;
  created_by: string;
  created_at: string;
  invite_code: string | null;
  role: GroupRole | null;
  member_count: number;
  is_member: boolean;
};

const GROUP_FIELDS =
  'id, name, description, visibility, location_label, skill_level, skill_level_max, cover_url, avatar_url, members_can_post, created_by, created_at, invite_code';

const LEVEL_RANK: Record<OrganiserLevel, number> = {
  unknown: 0,
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  pro: 4,
};

export function levelRank(level: OrganiserLevel | null | undefined) {
  if (!level) return 0;
  return LEVEL_RANK[level] ?? 0;
}

/** True if player sits inside the group's level band. */
export function playerMeetsGroupLevel(
  groupLevelMin: OrganiserLevel | null | undefined,
  playerLevel: OrganiserLevel | null | undefined,
  groupLevelMax?: OrganiserLevel | null | undefined,
) {
  if (!groupLevelMin || groupLevelMin === 'unknown') return true;
  const max = groupLevelMax && groupLevelMax !== 'unknown' ? groupLevelMax : groupLevelMin;
  const p = levelRank(playerLevel);
  return p >= levelRank(groupLevelMin) && p <= levelRank(max);
}

export function formatGroupLevelBand(
  min: OrganiserLevel | null | undefined,
  max?: OrganiserLevel | null | undefined,
) {
  if (!min || min === 'unknown') return 'All levels';
  const top = max && max !== 'unknown' ? max : min;
  if (min === top) return levelLabel(min);
  // Full band beginner→pro is the same as welcoming everyone
  if (min === 'beginner' && top === 'pro') return 'All levels';
  return `${levelLabel(min)} – ${levelLabel(top)}`;
}

function reliabilityFrom(played: number, noShows: number): number | null {
  const total = played + noShows;
  if (total === 0) return null;
  return Math.round((played / total) * 100);
}

function demoViewerRole(groupId: string, userId?: string): GroupRole | null {
  const members = listDemoMembers(groupId);
  const me = members.find(
    (m) => m.user_id === userId || (userId && m.user_id === 'guest' && userId.startsWith('local_')),
  );
  if (me) return me.role;
  const g = getDemoGroup(groupId);
  return g?.role ?? null;
}

function fromDemo(
  g: DemoGroup,
  isMember: boolean,
  userId?: string,
  viewerHubId?: string | null,
): GroupSummary {
  const role = isMember ? (demoViewerRole(g.id, userId) ?? g.role) : null;
  const groupHub = hubFromLabel(g.location_label);
  const distance_miles =
    viewerHubId && groupHub && viewerHubId !== groupHub ? null : g.distance_miles;
  return {
    id: g.id,
    name: g.name,
    description: g.description,
    visibility: g.visibility,
    location_label: g.location_label,
    skill_level: g.skill_level,
    skill_level_max: g.skill_level_max ?? g.skill_level,
    distance_miles,
    cover_url: g.cover_url,
    avatar_url: g.avatar_url ?? null,
    members_can_post: g.members_can_post,
    created_by: g.created_by,
    created_at: g.created_at,
    invite_code: g.invite_code,
    role,
    member_count: g.member_count,
    is_member: isMember,
  };
}

function mapGroup(
  group: {
    id: string;
    name: string;
    description: string | null;
    visibility: GroupVisibility | string;
    location_label: string | null;
    skill_level?: string | null;
    skill_level_max?: string | null;
    cover_url?: string | null;
    avatar_url?: string | null;
    members_can_post?: boolean | null;
    created_by: string;
    created_at: string;
    invite_code?: string | null;
  },
  extras: { role: GroupRole | null; member_count: number; is_member: boolean; distance_miles?: number | null },
): GroupSummary {
  const min = (group.skill_level as OrganiserLevel | null | undefined) ?? null;
  const max =
    (group.skill_level_max as OrganiserLevel | null | undefined) ?? min;
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    visibility: group.visibility as GroupVisibility,
    location_label: group.location_label,
    skill_level: min,
    skill_level_max: max,
    distance_miles: extras.distance_miles ?? null,
    cover_url: group.cover_url ?? null,
    avatar_url: group.avatar_url ?? null,
    members_can_post: group.members_can_post ?? true,
    created_by: group.created_by,
    created_at: group.created_at,
    invite_code: group.invite_code ?? null,
    role: extras.role,
    member_count: extras.member_count,
    is_member: extras.is_member,
  };
}

export function isOrganiser(role: GroupRole | null | undefined): boolean {
  return role === 'owner' || role === 'admin' || role === 'organiser';
}

/** Owner of record counts even if membership role hasn't hydrated yet. */
export function canOrganiseGroup(
  group: Pick<GroupSummary, 'role' | 'created_by'> | null | undefined,
  userId: string,
): boolean {
  if (!group || !userId) return false;
  if (isOrganiser(group.role)) return true;
  return group.created_by === userId;
}

const ROLE_RANK: Record<GroupRole, number> = {
  owner: 0,
  admin: 1,
  organiser: 2,
  member: 3,
};

export function roleLabel(role: GroupRole) {
  if (role === 'owner') return 'Group owner';
  if (role === 'admin') return 'Admin';
  if (role === 'organiser') return 'Organiser';
  return '';
}

export async function listGroupMembers(
  groupId: string,
  userId: string,
  isGuest: boolean,
): Promise<GroupMember[]> {
  if (isGuest || !isSupabaseConfigured || groupId.startsWith('demo-')) {
    const viewerIsOrganiser = isOrganiser(demoViewerRole(groupId, userId));
    const raw = listDemoMembers(groupId).map((m) => ({
      user_id: m.user_id,
      display_name: m.display_name,
      role: m.role,
      organiser_level: m.organiser_level,
      // Private organiser notes — never leak to regular members
      notes: viewerIsOrganiser ? m.notes : '',
      sessions_played: m.sessions_played,
      no_shows: m.no_shows,
      reliability: reliabilityFrom(m.sessions_played, m.no_shows),
      best_finish: m.best_finish,
      points: m.points,
      is_you:
        m.user_id === userId ||
        m.user_id === 'guest' ||
        (userId.startsWith('local_') && m.user_id === 'guest'),
      group_rank: 0,
    }));
    return withGroupRanks(raw);
  }

  const { data, error } = await getSupabase()
    .from('group_memberships')
    .select('user_id, role, profiles(display_name)')
    .eq('group_id', groupId);

  if (error) throw error;

  const { data: profiles } = await getSupabaseLoose()
    .from('group_member_profiles')
    .select('user_id, organiser_level, notes, sessions_played, no_shows')
    .eq('group_id', groupId);

  const byUser = new Map(
    (profiles ?? []).map((p: any) => [p.user_id as string, p]),
  );

  const myRole = (data ?? []).find((row) => row.user_id === userId)?.role as
    | GroupRole
    | undefined;
  const viewerIsOrganiser = isOrganiser(myRole);

  let pointsByUser = new Map<string, number>();
  try {
    const { fetchGroupAllTimePoints } = await import('./points');
    pointsByUser = await fetchGroupAllTimePoints(groupId, userId, false);
  } catch {
    pointsByUser = new Map();
  }

  const out: GroupMember[] = (data ?? []).map((row) => {
    const profile = row.profiles as unknown as { display_name: string | null } | null;
    const extra = byUser.get(row.user_id);
    const played = (extra?.sessions_played as number | undefined) ?? 0;
    const noShows = (extra?.no_shows as number | undefined) ?? 0;
    const ledgerPts = pointsByUser.get(row.user_id);
    return {
      user_id: row.user_id,
      display_name: profile?.display_name?.trim() || 'Player',
      role: row.role as GroupRole,
      organiser_level: (extra?.organiser_level as OrganiserLevel | undefined) ?? 'unknown',
      notes: viewerIsOrganiser ? ((extra?.notes as string | undefined) ?? '') : '',
      sessions_played: played,
      no_shows: noShows,
      reliability: reliabilityFrom(played, noShows),
      best_finish: null,
      points: ledgerPts ?? 0,
      is_you: row.user_id === userId,
      group_rank: 0,
    };
  });

  return withGroupRanks(out).sort((a, b) => {
    const rank = ROLE_RANK[a.role] - ROLE_RANK[b.role];
    if (rank !== 0) return rank;
    return a.group_rank - b.group_rank;
  });
}

function withGroupRanks(members: GroupMember[]): GroupMember[] {
  const byPoints = [...members].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return (b.reliability ?? -1) - (a.reliability ?? -1);
  });
  const rankByUser = new Map<string, number>();
  byPoints.forEach((m, i) => rankByUser.set(m.user_id, i + 1));
  return members.map((m) => ({ ...m, group_rank: rankByUser.get(m.user_id) ?? members.length }));
}

export async function getGroupMember(
  groupId: string,
  memberId: string,
  viewerId: string,
  isGuest: boolean,
): Promise<GroupMember | null> {
  const all = await listGroupMembers(groupId, viewerId, isGuest);
  return all.find((m) => m.user_id === memberId) ?? null;
}

export async function updateMemberProfile(input: {
  groupId: string;
  memberId: string;
  actorId: string;
  isGuest: boolean;
  organiser_level?: OrganiserLevel;
  notes?: string;
}): Promise<GroupMember | null> {
  const group = await getGroup(input.groupId, input.actorId, input.isGuest);
  if (!canOrganiseGroup(group, input.actorId)) {
    throw new Error('Only organisers can edit member profiles');
  }

  if (input.isGuest || !isSupabaseConfigured || input.groupId.startsWith('demo-')) {
    updateDemoMemberProfile(input.groupId, input.memberId, {
      organiser_level: input.organiser_level,
      notes: input.notes,
    });
    const m = getDemoMember(input.groupId, input.memberId);
    if (!m) return null;
    return getGroupMember(input.groupId, input.memberId, input.actorId, true);
  }

  const { error } = await getSupabaseLoose().from('group_member_profiles').upsert(
    {
      group_id: input.groupId,
      user_id: input.memberId,
      organiser_level: input.organiser_level ?? null,
      notes: input.notes ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'group_id,user_id' },
  );
  if (error) throw error;
  return getGroupMember(input.groupId, input.memberId, input.memberId, false);
}

export async function removeGroupMember(input: {
  groupId: string;
  memberId: string;
  actorId: string;
  isGuest: boolean;
}): Promise<void> {
  const group = await getGroup(input.groupId, input.actorId, input.isGuest);
  if (!canOrganiseGroup(group, input.actorId)) {
    throw new Error('Only organisers can remove members');
  }

  if (input.isGuest || !isSupabaseConfigured || input.groupId.startsWith('demo-')) {
    removeDemoMember(input.groupId, input.memberId);
    return;
  }

  const { error } = await getSupabase()
    .from('group_memberships')
    .delete()
    .eq('group_id', input.groupId)
    .eq('user_id', input.memberId);
  if (error) throw error;
}

export async function blockGroupMember(input: {
  groupId: string;
  memberId: string;
  blockedBy: string;
  isGuest: boolean;
}): Promise<void> {
  const group = await getGroup(input.groupId, input.blockedBy, input.isGuest);
  if (!canOrganiseGroup(group, input.blockedBy)) {
    throw new Error('Only organisers can block members');
  }

  if (input.isGuest || !isSupabaseConfigured || input.groupId.startsWith('demo-')) {
    blockDemoMember(input.groupId, input.memberId);
    return;
  }

  await removeGroupMember({
    groupId: input.groupId,
    memberId: input.memberId,
    actorId: input.blockedBy,
    isGuest: false,
  });

  const { error } = await getSupabaseLoose().from('group_blocks').upsert(
    {
      group_id: input.groupId,
      user_id: input.memberId,
      blocked_by: input.blockedBy,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'group_id,user_id' },
  );
  if (error) throw error;
}

export async function isUserBlockedFromGroup(
  groupId: string,
  userId: string,
  isGuest: boolean,
): Promise<boolean> {
  if (isGuest || !isSupabaseConfigured || groupId.startsWith('demo-')) {
    return isDemoBlocked(groupId, userId);
  }
  const { data } = await getSupabaseLoose()
    .from('group_blocks')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();
  return Boolean(data);
}

export async function listMyGroups(userId: string, isGuest: boolean): Promise<GroupSummary[]> {
  if (isGuest || !isSupabaseConfigured) {
    return listDemoMemberships().map((g) => fromDemo(g, true, userId));
  }

  const { data, error } = await getSupabase()
    .from('group_memberships')
    .select(`role, groups (${GROUP_FIELDS})`)
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });

  if (error) throw error;

  const summaries: GroupSummary[] = [];
  for (const row of data ?? []) {
    const group = row.groups as unknown as Parameters<typeof mapGroup>[0] | null;
    if (!group) continue;
    const { count } = await getSupabase()
      .from('group_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group.id);

    summaries.push(
      mapGroup(group, {
        role: row.role as GroupRole,
        member_count: count ?? 1,
        is_member: true,
      }),
    );
  }
  return summaries;
}

export async function listDiscoverableGroups(
  userId: string,
  isGuest: boolean,
  viewerHubId?: string | null,
): Promise<GroupSummary[]> {
  if (isGuest || !isSupabaseConfigured) {
    return listDemoDiscoverable().map((g) =>
      fromDemo(g, isDemoMember(g.id), userId, viewerHubId),
    );
  }

  const { data: mine } = await getSupabase()
    .from('group_memberships')
    .select('group_id')
    .eq('user_id', userId);

  const myIds = new Set((mine ?? []).map((m) => m.group_id));

  const { data, error } = await getSupabase()
    .from('groups')
    .select(GROUP_FIELDS)
    .in('visibility', ['public', 'approval'])
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  const out: GroupSummary[] = [];
  for (const group of data ?? []) {
    if (myIds.has(group.id)) continue;
    const { count } = await getSupabase()
      .from('group_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group.id);

    out.push(
      mapGroup(group, {
        role: null,
        member_count: count ?? 0,
        is_member: false,
      }),
    );
  }
  return out;
}

export async function getGroup(
  groupId: string,
  userId: string,
  isGuest: boolean,
): Promise<GroupSummary | null> {
  if (isGuest || !isSupabaseConfigured || groupId.startsWith('demo-')) {
    const g = getDemoGroup(groupId);
    if (!g) return null;
    return fromDemo(g, isDemoMember(groupId), userId);
  }

  const { data: group, error } = await getSupabase()
    .from('groups')
    .select(GROUP_FIELDS)
    .eq('id', groupId)
    .maybeSingle();

  if (error) throw error;
  if (!group) return null;

  const [{ data: membership }, { count }] = await Promise.all([
    getSupabase()
      .from('group_memberships')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle(),
    getSupabase()
      .from('group_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId),
  ]);

  return mapGroup(group, {
    role: (membership?.role as GroupRole | undefined) ?? null,
    member_count: count ?? 0,
    is_member: Boolean(membership),
  });
}

export async function createGroup(
  userId: string,
  isGuest: boolean,
  input: {
    name: string;
    description?: string;
    visibility: GroupVisibility;
    location_label?: string;
    skill_level?: OrganiserLevel | null;
    skill_level_max?: OrganiserLevel | null;
    cover_url?: string | null;
    ownerName?: string;
    inviteFriendIds?: string[];
  },
): Promise<GroupSummary> {
  // skill_level null = All levels (allowed for public / approval)

  if (isGuest || !isSupabaseConfigured) {
    return fromDemo(
      createDemoGroup({
        ...input,
        ownerId: userId,
        ownerName: input.ownerName,
        cover_url: input.cover_url,
        inviteFriendIds: input.inviteFriendIds,
      }),
      true,
      userId,
    );
  }

  const min =
    input.skill_level && input.skill_level !== 'unknown' ? input.skill_level : null;
  const max =
    input.skill_level_max && input.skill_level_max !== 'unknown'
      ? input.skill_level_max
      : min;

  const coverUrl =
    input.cover_url && /^https?:\/\//i.test(input.cover_url) ? input.cover_url : null;

  const { data, error } = await getSupabaseLoose()
    .from('groups')
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      visibility: input.visibility,
      location_label: input.location_label?.trim() || null,
      skill_level: min,
      skill_level_max: max,
      cover_url: coverUrl,
      created_by: userId,
    })
    .select(GROUP_FIELDS)
    .single();

  if (error) {
    const parts = [error.message, error.details, error.hint].filter(Boolean);
    const msg = parts.join(' — ') || 'Could not create group';
    if (/foreign key|profiles/i.test(msg)) {
      throw new Error(
        'Your profile isn’t ready yet — open Profile, wait a moment, then try again.',
      );
    }
    if (/row-level security|permission|42501/i.test(msg)) {
      throw new Error('You’re not allowed to create a group with this account. Sign out and back in.');
    }
    if (/PGRST116|0 rows/i.test(msg)) {
      throw new Error('Group was created but couldn’t be loaded. Pull to refresh Chats.');
    }
    throw new Error(msg);
  }

  if (!data) throw new Error('Group created but no data returned — check Chats.');

  const summary = mapGroup(data, { role: 'owner', member_count: 1, is_member: true });

  const inviteIds = (input.inviteFriendIds ?? []).filter((id) => id && id !== userId);
  if (inviteIds.length > 0) {
    try {
      await inviteFriendsToGroup({
        groupId: summary.id,
        friendIds: inviteIds,
        isGuest: false,
      });
      summary.member_count = 1 + inviteIds.length;
    } catch {
      // Group exists; invites can be retried from Admin.
    }
  }

  return summary;
}

export async function inviteFriendsToGroup(input: {
  groupId: string;
  friendIds: string[];
  friendNames?: Record<string, string>;
  isGuest: boolean;
}): Promise<number> {
  if (input.isGuest || !isSupabaseConfigured || input.groupId.startsWith('demo-')) {
    return inviteDemoFriendsToGroup(input);
  }
  let added = 0;
  for (const friendId of input.friendIds) {
    const { error } = await getSupabase().from('group_memberships').insert({
      group_id: input.groupId,
      user_id: friendId,
      role: 'member',
    });
    if (!error) {
      added += 1;
      const name = input.friendNames?.[friendId] ?? 'Friend';
      await sendGroupMessage({
        groupId: input.groupId,
        userId: friendId,
        displayName: 'Padel Nerdz',
        isGuest: false,
        kind: 'system',
        body: `${name} was invited to the group`,
        payload: { event: 'member_invited', user_id: friendId },
      });
    }
  }
  return added;
}

export async function updateGroup(
  groupId: string,
  userId: string,
  isGuest: boolean,
  patch: {
    name?: string;
    description?: string;
    visibility?: GroupVisibility;
    location_label?: string;
    skill_level?: OrganiserLevel | null;
    skill_level_max?: OrganiserLevel | null;
    cover_url?: string | null;
    avatar_url?: string | null;
    members_can_post?: boolean;
  },
): Promise<GroupSummary> {
  // skill_level null = All levels (allowed for public / approval)

  if (isGuest || !isSupabaseConfigured || groupId.startsWith('demo-')) {
    const updated = updateDemoGroup(groupId, patch);
    if (!updated) throw new Error('Group not found');
    return fromDemo(updated, true, userId);
  }

  const min =
    patch.skill_level && patch.skill_level !== 'unknown' ? patch.skill_level : null;
  const max =
    patch.skill_level_max && patch.skill_level_max !== 'unknown'
      ? patch.skill_level_max
      : min;

  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.description !== undefined) payload.description = patch.description.trim() || null;
  if (patch.visibility !== undefined) payload.visibility = patch.visibility;
  if (patch.location_label !== undefined) {
    payload.location_label = patch.location_label.trim() || null;
  }
  if (patch.skill_level !== undefined) payload.skill_level = min;
  if (patch.skill_level_max !== undefined) payload.skill_level_max = max;
  if (patch.cover_url !== undefined) payload.cover_url = patch.cover_url;
  if (patch.avatar_url !== undefined) payload.avatar_url = patch.avatar_url;
  if (patch.members_can_post !== undefined) payload.members_can_post = patch.members_can_post;

  const { data, error } = await getSupabaseLoose()
    .from('groups')
    .update(payload)
    .eq('id', groupId)
    .select(GROUP_FIELDS)
    .single();

  if (error) throw error;
  const refreshed = await getGroup(groupId, userId, false);
  return refreshed ?? mapGroup(data, { role: 'organiser', member_count: 1, is_member: true });
}

/** Permanently delete a group (organiser only). Cascades memberships/sessions via DB. */
export async function deleteGroup(
  groupId: string,
  userId: string,
  isGuest: boolean,
): Promise<void> {
  const group = await getGroup(groupId, userId, isGuest);
  if (!group || !canOrganiseGroup(group, userId)) {
    throw new Error('Only organisers can delete this group');
  }

  if (isGuest || !isSupabaseConfigured || groupId.startsWith('demo-')) {
    if (!deleteDemoGroup(groupId)) throw new Error('Group not found');
    return;
  }

  const { error } = await getSupabaseLoose().from('groups').delete().eq('id', groupId);
  if (error) throw error;
}

export function levelLabel(level: OrganiserLevel) {
  if (level === 'beginner') return 'Beginner';
  if (level === 'intermediate') return 'Intermediate';
  if (level === 'advanced') return 'Advanced';
  if (level === 'pro') return 'Pro';
  return 'Unset';
}

export async function joinGroup(
  groupId: string,
  userId: string,
  isGuest: boolean,
  displayName = 'Player',
): Promise<GroupSummary> {
  if (await isUserBlockedFromGroup(groupId, userId, isGuest)) {
    throw new Error('You’ve been blocked from this group');
  }

  const name = displayName.trim() || 'Player';

  if (isGuest || !isSupabaseConfigured || groupId.startsWith('demo-')) {
    const g = getDemoGroup(groupId);
    if (
      g &&
      !playerMeetsGroupLevel(g.skill_level, getGuestSkillLevel(), g.skill_level_max)
    ) {
      throw new Error(
        `This group is ${formatGroupLevelBand(g.skill_level, g.skill_level_max)} — your level doesn’t fit`,
      );
    }
    const joined = joinDemoGroup(groupId, userId, name);
    if (!joined) throw new Error('Group not joinable');
    track(AnalyticsEvents.groupJoined, { group_id: groupId, source: 'demo' });
    return fromDemo(joined, true, userId);
  }

  const group = await getGroup(groupId, userId, false);
  if (!group) throw new Error('Group not found');
  if (group.visibility === 'private') throw new Error('This group is invite-only');
  if (group.visibility === 'approval') {
    await requestToJoinGroup(groupId, userId, name);
    throw new Error('REQUEST_PENDING');
  }

  const { error } = await getSupabase().from('group_memberships').insert({
    group_id: groupId,
    user_id: userId,
    role: 'member',
  });

  if (error) throw error;

  await sendGroupMessage({
    groupId,
    userId,
    displayName: 'Padel Nerdz',
    isGuest: false,
    kind: 'system',
    body: `${name} joined the group`,
    payload: { event: 'member_joined', user_id: userId },
  });

  const refreshed = await getGroup(groupId, userId, false);
  if (!refreshed) throw new Error('Joined but failed to reload group');
  track(AnalyticsEvents.groupJoined, { group_id: groupId, source: 'live' });
  return refreshed;
}

export type JoinRequest = {
  id: string;
  group_id: string;
  user_id: string;
  display_name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export async function requestToJoinGroup(
  groupId: string,
  userId: string,
  displayName: string,
): Promise<void> {
  const { error } = await getSupabaseLoose().from('group_join_requests').upsert(
    {
      group_id: groupId,
      user_id: userId,
      status: 'pending',
      message: `${displayName} wants to join`,
      resolved_at: null,
      resolved_by: null,
    },
    { onConflict: 'group_id,user_id' },
  );
  if (error) throw error;

  await sendGroupMessage({
    groupId,
    userId,
    displayName: 'Padel Nerdz',
    isGuest: false,
    kind: 'system',
    body: `${displayName} requested to join — organisers can approve in Admin`,
    payload: { event: 'join_request', user_id: userId },
  });
}

export async function listPendingJoinRequests(
  groupId: string,
): Promise<JoinRequest[]> {
  if (!isSupabaseConfigured || groupId.startsWith('demo-')) return [];
  const { data, error } = await getSupabaseLoose()
    .from('group_join_requests')
    .select('id, group_id, user_id, status, created_at, profiles(display_name)')
    .eq('group_id', groupId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id as string,
    group_id: r.group_id as string,
    user_id: r.user_id as string,
    display_name:
      (r.profiles as { display_name?: string | null } | null)?.display_name?.trim() ||
      'Player',
    status: 'pending' as const,
    created_at: r.created_at as string,
  }));
}

export async function resolveJoinRequest(input: {
  requestId: string;
  groupId: string;
  userId: string;
  displayName: string;
  approve: boolean;
  organiserId: string;
}): Promise<void> {
  const { error } = await getSupabaseLoose()
    .from('group_join_requests')
    .update({
      status: input.approve ? 'approved' : 'rejected',
      resolved_at: new Date().toISOString(),
      resolved_by: input.organiserId,
    })
    .eq('id', input.requestId)
    .eq('status', 'pending');
  if (error) throw error;

  if (!input.approve) return;

  const { error: joinError } = await getSupabase().from('group_memberships').insert({
    group_id: input.groupId,
    user_id: input.userId,
    role: 'member',
  });
  if (joinError && !/duplicate|unique/i.test(joinError.message)) throw joinError;

  await sendGroupMessage({
    groupId: input.groupId,
    userId: input.organiserId,
    displayName: 'Padel Nerdz',
    isGuest: false,
    kind: 'system',
    body: `${input.displayName} was approved and joined the group`,
    payload: { event: 'member_joined', user_id: input.userId },
  });
}

export async function joinByInviteCode(
  inviteCode: string,
  userId: string,
  isGuest: boolean,
  displayName = 'Player',
): Promise<GroupSummary> {
  const code = inviteCode.trim().toUpperCase();
  if (code.length < 4) throw new Error('Enter a valid invite code');
  const name = displayName.trim() || 'Player';

  if (isGuest || !isSupabaseConfigured) {
    const joined = joinDemoByInviteCode(code, userId, name);
    if (!joined) throw new Error('Invite code not found');
    track(AnalyticsEvents.groupJoined, {
      group_id: joined.id,
      source: 'invite_demo',
    });
    return fromDemo(joined, true, userId);
  }

  const { data, error } = await getSupabaseLoose().rpc('join_group_by_invite_code', {
    p_code: code,
  });
  if (error) {
    const msg = error.message || 'Could not join with that code';
    if (/invite code not found/i.test(msg)) throw new Error('Invite code not found');
    throw new Error(msg);
  }
  const payload = data as { group_id?: string; joined?: boolean } | null;
  const groupId = payload?.group_id;
  if (!groupId) throw new Error('Invite code not found');

  if (payload?.joined) {
    await sendGroupMessage({
      groupId,
      userId,
      displayName: 'Padel Nerdz',
      isGuest: false,
      kind: 'system',
      body: `${name} joined the group`,
      payload: { event: 'member_joined', user_id: userId },
    });
    track(AnalyticsEvents.groupJoined, {
      group_id: groupId,
      source: 'invite',
    });
  }

  const refreshed = await getGroup(groupId, userId, false);
  if (!refreshed?.is_member) throw new Error('Joined but failed to reload group');
  return refreshed;
}
