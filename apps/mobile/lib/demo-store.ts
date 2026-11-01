import {
  DEFAULT_TOURNAMENT_BY_WINS_CONFIG,
  generateKingsAndQueensRound1,
  seedTournamentByWins,
  type GroupRole,
  type GroupVisibility,
  type SessionFormat,
} from '@padel-nerdz/domain';

export type MessageKind =
  | 'text'
  | 'system'
  | 'mixin_card'
  | 'image'
  | 'video'
  | 'wrap_card'
  | 'accept_notice'
  | 'players_card'
  | 'fixtures_card'
  | 'arrival_card';

/** Demo fixture payload — Kings & Queens or Tournament by wins (json-shaped). */
export type DemoFixtureRound = {
  round: number;
  matches: Array<{
    court: number;
    label: string;
    team_a: {
      player_a: { user_id: string; display_name: string };
      player_b: { user_id: string; display_name: string };
    };
    team_b: {
      player_a: { user_id: string; display_name: string };
      player_b: { user_id: string; display_name: string };
    };
    score_a?: number | null;
    score_b?: number | null;
    winner?: 'a' | 'b' | null;
  }>;
  unassigned: Array<{ user_id: string; display_name: string }>;
  format?: string;
  [key: string]: unknown;
};

export type OrganiserLevel =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'pro'
  | 'unknown';

export type DemoGroup = {
  id: string;
  name: string;
  description: string | null;
  visibility: GroupVisibility;
  location_label: string | null;
  /** Minimum level for discoverable groups. */
  skill_level: OrganiserLevel | null;
  /** Maximum level (band). Defaults to skill_level when null. */
  skill_level_max: OrganiserLevel | null;
  /** Demo distance from the user for Discover filters. */
  distance_miles: number | null;
  cover_url: string | null;
  avatar_url: string | null;
  members_can_post: boolean;
  created_by: string;
  created_at: string;
  role: GroupRole;
  member_count: number;
  invite_code: string;
};

export type DemoMessage = {
  id: string;
  group_id: string;
  sender_id: string | null;
  sender_name: string;
  body: string;
  kind: MessageKind;
  payload: Record<string, unknown>;
  created_at: string;
};

export type DemoRegistration = {
  id: string;
  session_id: string;
  user_id: string;
  display_name: string;
  status:
    | 'registered'
    | 'waitlist'
    | 'selected'
    | 'payment_claimed'
    | 'paid'
    | 'cancelled'
    | 'no_show';
  reliability: number;
  payment_claimed_at?: string | null;
  checked_in_at?: string | null;
};

export type DemoSession = {
  id: string;
  group_id: string;
  title: string;
  starts_at: string;
  venue_label: string | null;
  format: SessionFormat;
  courts: number;
  max_players: number;
  price_cents: number | null;
  commission_cents: number;
  banner_url: string | null;
  registered_count: number;
  session_room_id: string | null;
  status: 'open' | 'selected' | 'live' | 'done' | 'closed';
  wrap_media_url: string | null;
  closed_at: string | null;
};

type Listener = () => void;

function code() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

let groups: DemoGroup[] = [
  {
    id: 'demo-public-1',
    name: 'Sotogrande Smash',
    description: 'Evening mix-ins around the Sotogrande courts.',
    visibility: 'public',
    location_label: 'Sotogrande',
    skill_level: 'beginner',
    skill_level_max: 'intermediate',
    distance_miles: 1.2,
    cover_url: null,
    avatar_url: null,
    members_can_post: true,
    created_by: 'system',
    created_at: new Date().toISOString(),
    role: 'member',
    member_count: 12,
    invite_code: 'SOTOGE',
  },
  {
    id: 'demo-public-2',
    name: 'La Reserva Beginners',
    description: 'Friendly learning games — no pressure.',
    visibility: 'public',
    location_label: 'La Reserva, Sotogrande',
    skill_level: 'beginner',
    skill_level_max: 'beginner',
    distance_miles: 3.4,
    cover_url: null,
    avatar_url: null,
    members_can_post: true,
    created_by: 'system',
    created_at: new Date().toISOString(),
    role: 'member',
    member_count: 9,
    invite_code: 'RESERVA1',
  },
  {
    id: 'demo-public-3',
    name: 'Puerto Advanced',
    description: 'High-pace sets near Puerto Deportivo.',
    visibility: 'approval',
    location_label: 'Puerto Sotogrande',
    skill_level: 'advanced',
    skill_level_max: 'pro',
    distance_miles: 2.1,
    cover_url: null,
    avatar_url: null,
    members_can_post: false,
    created_by: 'system',
    created_at: new Date().toISOString(),
    role: 'member',
    member_count: 11,
    invite_code: 'PUERTOA',
  },
  {
    id: 'demo-public-4',
    name: 'Marbella Night Courts',
    description: 'Sunset sets on the coast.',
    visibility: 'public',
    location_label: 'Marbella',
    skill_level: 'intermediate',
    skill_level_max: 'advanced',
    distance_miles: 4.0,
    cover_url: null,
    avatar_url: null,
    members_can_post: true,
    created_by: 'system',
    created_at: new Date().toISOString(),
    role: 'member',
    member_count: 14,
    invite_code: 'MARBNITE',
  },
  {
    id: 'demo-public-5',
    name: 'Madrid Centro Padel',
    description: 'Weeknight mix-ins near the city centre.',
    visibility: 'public',
    location_label: 'Madrid',
    skill_level: 'beginner',
    skill_level_max: 'advanced',
    distance_miles: 2.8,
    cover_url: null,
    avatar_url: null,
    members_can_post: true,
    created_by: 'system',
    created_at: new Date().toISOString(),
    role: 'member',
    member_count: 22,
    invite_code: 'MADCENT',
  },
  {
    id: 'demo-public-6',
    name: 'London Bridge Smash',
    description: 'Indoor courts — after-work doubles.',
    visibility: 'public',
    location_label: 'London',
    skill_level: 'intermediate',
    skill_level_max: 'pro',
    distance_miles: 3.1,
    cover_url: null,
    avatar_url: null,
    members_can_post: true,
    created_by: 'system',
    created_at: new Date().toISOString(),
    role: 'member',
    member_count: 18,
    invite_code: 'LDNBRG',
  },
  {
    id: 'demo-public-7',
    name: 'Buenos Aires Norte',
    description: 'Palermo + Belgrano evening open plays.',
    visibility: 'public',
    location_label: 'Buenos Aires',
    skill_level: 'beginner',
    skill_level_max: 'intermediate',
    distance_miles: 2.4,
    cover_url: null,
    avatar_url: null,
    members_can_post: true,
    created_by: 'system',
    created_at: new Date().toISOString(),
    role: 'member',
    member_count: 31,
    invite_code: 'BSASNTE',
  },
  {
    id: 'demo-public-8',
    name: 'CABA Competitive',
    description: 'Higher-level doubles across the city.',
    visibility: 'public',
    location_label: 'Buenos Aires',
    skill_level: 'advanced',
    skill_level_max: 'pro',
    distance_miles: 5.6,
    cover_url: null,
    avatar_url: null,
    members_can_post: true,
    created_by: 'system',
    created_at: new Date().toISOString(),
    role: 'member',
    member_count: 19,
    invite_code: 'CABACMP',
  },
];

/** Demo player's own skill — used to gate Discover joins. */
let guestSkillLevel: OrganiserLevel = 'intermediate';
let guestAvatarUrl: string | null = null;

export function getGuestSkillLevel() {
  return guestSkillLevel;
}

export function setGuestSkillLevel(level: OrganiserLevel) {
  guestSkillLevel = level;
  emit();
}

export function getGuestAvatarUrl() {
  return guestAvatarUrl;
}

export function setGuestAvatarUrl(url: string | null) {
  guestAvatarUrl = url;
  emit();
}

export type DemoMember = {
  user_id: string;
  display_name: string;
  role: GroupRole;
  organiser_level: OrganiserLevel;
  notes: string;
  sessions_played: number;
  no_shows: number;
  /** Best finishing place in a mix-in (1 = champion court). */
  best_finish: number | null;
  points: number;
};

export type DemoMessageReaction = {
  id: string;
  channel_type: 'group' | 'session_room';
  channel_id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

let memberships = new Set<string>();
let messages: DemoMessage[] = [];
let sessions: DemoSession[] = [];
let registrations: DemoRegistration[] = [];
let reliability = new Map<string, number>(); // `${groupId}:${userId}` -> 0-100
let sessionRoomMessages: DemoMessage[] = [];
let messageReactions: DemoMessageReaction[] = [];
const groupMembers = new Map<string, DemoMember[]>();
const fixturesBySession = new Map<string, DemoFixtureRound>();
/** groupId → blocked user ids */
const blockedByGroup = new Map<string, Set<string>>();
const listeners = new Set<Listener>();

const ROLE_RANK: Record<GroupRole, number> = {
  owner: 0,
  admin: 1,
  organiser: 2,
  member: 3,
};

function sortMembers(list: DemoMember[]) {
  return [...list].sort((a, b) => {
    const rank = ROLE_RANK[a.role] - ROLE_RANK[b.role];
    if (rank !== 0) return rank;
    return a.display_name.localeCompare(b.display_name);
  });
}

function seedPublicGroupMembers(groupId: string) {
  if (groupMembers.has(groupId)) return;
  groupMembers.set(
    groupId,
    sortMembers([
      {
        user_id: 'demo-owner',
        display_name: 'Maya Ortiz',
        role: 'owner',
        organiser_level: 'advanced',
        notes: 'Founder — runs Thursday nights',
        sessions_played: 42,
        no_shows: 1,
        best_finish: 1,
        points: 420,
      },
      {
        user_id: 'demo-org',
        display_name: 'Leo Park',
        role: 'organiser',
        organiser_level: 'intermediate',
        notes: '',
        sessions_played: 28,
        no_shows: 2,
        best_finish: 2,
        points: 310,
      },
      {
        user_id: 'demo-p1',
        display_name: 'Alex Rivera',
        role: 'member',
        organiser_level: 'advanced',
        notes: 'Strong left side',
        sessions_played: 18,
        no_shows: 0,
        best_finish: 1,
        points: 280,
      },
      {
        user_id: 'demo-p2',
        display_name: 'Sam Cole',
        role: 'member',
        organiser_level: 'intermediate',
        notes: '',
        sessions_played: 11,
        no_shows: 3,
        best_finish: 3,
        points: 140,
      },
      {
        user_id: 'demo-p3',
        display_name: 'Jordan Lee',
        role: 'member',
        organiser_level: 'advanced',
        notes: 'Reliable',
        sessions_played: 22,
        no_shows: 1,
        best_finish: 1,
        points: 260,
      },
      {
        user_id: 'demo-p4',
        display_name: 'Casey Ng',
        role: 'member',
        organiser_level: 'beginner',
        notes: 'New to padel',
        sessions_played: 4,
        no_shows: 1,
        best_finish: 4,
        points: 40,
      },
      {
        user_id: 'demo-p5',
        display_name: 'Riley Chen',
        role: 'member',
        organiser_level: 'intermediate',
        notes: '',
        sessions_played: 9,
        no_shows: 0,
        best_finish: 2,
        points: 110,
      },
      {
        user_id: 'demo-p6',
        display_name: 'Taylor Brooks',
        role: 'member',
        organiser_level: 'pro',
        notes: 'Ex-club coach',
        sessions_played: 31,
        no_shows: 0,
        best_finish: 1,
        points: 390,
      },
    ]),
  );
}

seedPublicGroupMembers('demo-public-1');
seedPublicGroupMembers('demo-public-4');
seedPublicGroupMembers('demo-public-5');
seedPublicGroupMembers('demo-public-6');

export function listDemoMembers(groupId: string): DemoMember[] {
  const group = getDemoGroup(groupId);
  if (!group) return [];
  if (!groupMembers.has(groupId)) {
    if (group.created_by === 'guest' || group.created_by === 'system') {
      seedPublicGroupMembers(groupId);
    } else {
      groupMembers.set(groupId, [
        {
          user_id: 'guest',
          display_name: 'You',
          role: group.role || 'owner',
          organiser_level: 'unknown',
          notes: '',
          sessions_played: 0,
          no_shows: 0,
          best_finish: null,
          points: 0,
        },
      ]);
    }
  }
  const list = groupMembers.get(groupId) ?? [];
  // Keep member_count in sync for UI
  if (group.member_count !== list.length) {
    groups = groups.map((g) => (g.id === groupId ? { ...g, member_count: list.length } : g));
  }
  return sortMembers(list);
}

function upsertDemoMember(groupId: string, member: DemoMember) {
  const current = listDemoMembers(groupId);
  const without = current.filter((m) => m.user_id !== member.user_id);
  groupMembers.set(groupId, sortMembers([...without, member]));
  groups = groups.map((g) =>
    g.id === groupId ? { ...g, member_count: (groupMembers.get(groupId) ?? []).length } : g,
  );
}

function emit() {
  listeners.forEach((l) => l());
}

function relKey(groupId: string, userId: string) {
  return `${groupId}:${userId}`;
}

export function subscribeDemoStore(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function listDemoMemberships(): DemoGroup[] {
  return groups.filter((g) => memberships.has(g.id) || g.created_by === 'guest');
}

export function listDemoDiscoverable(excludeJoined = true): DemoGroup[] {
  return groups.filter((g) => {
    if (g.visibility === 'private') return false;
    if (excludeJoined && memberships.has(g.id)) return false;
    if (g.created_by === 'guest') return false;
    return true;
  });
}

export function getDemoGroup(id: string): DemoGroup | undefined {
  return groups.find((g) => g.id === id);
}

export function createDemoGroup(input: {
  name: string;
  description?: string;
  visibility: GroupVisibility;
  location_label?: string;
  skill_level?: OrganiserLevel | null;
  skill_level_max?: OrganiserLevel | null;
  cover_url?: string | null;
  avatar_url?: string | null;
  ownerId?: string;
  ownerName?: string;
  inviteFriendIds?: string[];
}): DemoGroup {
  const ownerId = input.ownerId ?? 'guest';
  const ownerName = input.ownerName?.trim() || 'You';
  const group: DemoGroup = {
    id: `demo-${Date.now()}`,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    visibility: input.visibility,
    location_label: input.location_label?.trim() || null,
    skill_level: input.skill_level ?? null,
    skill_level_max: input.skill_level_max ?? input.skill_level ?? null,
    distance_miles: 0.5,
    cover_url: input.cover_url ?? null,
    avatar_url: input.avatar_url ?? null,
    members_can_post: true,
    created_by: ownerId,
    created_at: new Date().toISOString(),
    role: 'owner',
    member_count: 1,
    invite_code: code(),
  };
  groups = [group, ...groups];
  memberships.add(group.id);

  const members: DemoMember[] = [
    {
      user_id: ownerId,
      display_name: ownerName,
      role: 'owner',
      organiser_level: guestSkillLevel === 'unknown' ? 'intermediate' : guestSkillLevel,
      notes: '',
      sessions_played: 0,
      no_shows: 0,
      best_finish: null,
      points: 0,
    },
  ];

  for (const friendId of input.inviteFriendIds ?? []) {
    if (friendId === ownerId) continue;
    const existing = members.find((m) => m.user_id === friendId);
    if (existing) continue;
    // Resolve display name from seeded public rosters if possible
    let displayName = friendId;
    for (const list of groupMembers.values()) {
      const hit = list.find((m) => m.user_id === friendId);
      if (hit) {
        displayName = hit.display_name;
        break;
      }
    }
    members.push({
      user_id: friendId,
      display_name: displayName,
      role: 'member',
      organiser_level: 'intermediate',
      notes: '',
      sessions_played: 0,
      no_shows: 0,
      best_finish: null,
      points: 0,
    });
    sendDemoMessage({
      group_id: group.id,
      sender_id: null,
      sender_name: 'Padel Nerdz',
      kind: 'system',
      body: `${displayName} was invited to the group`,
      payload: { event: 'member_invited', user_id: friendId },
    });
  }

  group.member_count = members.length;
  groupMembers.set(group.id, sortMembers(members));
  emit();
  return group;
}

/** Invite friends into an existing group you organise. */
export function inviteDemoFriendsToGroup(input: {
  groupId: string;
  friendIds: string[];
  friendNames?: Record<string, string>;
}): number {
  const group = getDemoGroup(input.groupId);
  if (!group) return 0;
  let added = 0;
  for (const friendId of input.friendIds) {
    const already = listDemoMembers(input.groupId).some((m) => m.user_id === friendId);
    if (already) continue;
    const displayName = input.friendNames?.[friendId] ?? friendId;
    upsertDemoMember(input.groupId, {
      user_id: friendId,
      display_name: displayName,
      role: 'member',
      organiser_level: 'intermediate',
      notes: '',
      sessions_played: 0,
      no_shows: 0,
      best_finish: null,
      points: 0,
    });
    sendDemoMessage({
      group_id: input.groupId,
      sender_id: null,
      sender_name: 'Padel Nerdz',
      kind: 'system',
      body: `${displayName} was invited to the group`,
      payload: { event: 'member_invited', user_id: friendId },
    });
    added += 1;
  }
  emit();
  return added;
}

export function deleteDemoGroup(id: string): boolean {
  const existed = groups.some((g) => g.id === id);
  if (!existed) return false;
  groups = groups.filter((g) => g.id !== id);
  groupMembers.delete(id);
  emit();
  return true;
}

export function updateDemoGroup(
  id: string,
  patch: Partial<
    Pick<
      DemoGroup,
      | 'name'
      | 'description'
      | 'visibility'
      | 'location_label'
      | 'skill_level'
      | 'skill_level_max'
      | 'cover_url'
      | 'avatar_url'
      | 'members_can_post'
    >
  >,
): DemoGroup | undefined {
  groups = groups.map((g) => (g.id === id ? { ...g, ...patch } : g));
  emit();
  return getDemoGroup(id);
}

export function getDemoMember(groupId: string, userId: string): DemoMember | undefined {
  return listDemoMembers(groupId).find((m) => m.user_id === userId);
}

export function updateDemoMemberProfile(
  groupId: string,
  userId: string,
  patch: Partial<Pick<DemoMember, 'organiser_level' | 'notes' | 'sessions_played' | 'no_shows'>>,
): DemoMember | undefined {
  const list = listDemoMembers(groupId);
  const next = list.map((m) => (m.user_id === userId ? { ...m, ...patch } : m));
  groupMembers.set(groupId, sortMembers(next));
  emit();
  return getDemoMember(groupId, userId);
}

/** Venue arrival check-in via QR / organiser scan. */
export function markDemoCheckIn(input: {
  sessionId: string;
  userId: string;
}): DemoRegistration | undefined {
  const reg = registrations.find(
    (r) => r.session_id === input.sessionId && r.user_id === input.userId,
  );
  if (!reg || reg.status !== 'paid') return undefined;
  if (reg.checked_in_at) return reg;
  const at = new Date().toISOString();
  registrations = registrations.map((r) =>
    r.session_id === input.sessionId && r.user_id === input.userId
      ? { ...r, checked_in_at: at }
      : r,
  );
  emit();
  return registrations.find(
    (r) => r.session_id === input.sessionId && r.user_id === input.userId,
  );
}

/** Mark a confirmed session player as no-show — bumps no_shows + hurts reliability. */
export function markDemoNoShow(input: {
  sessionId: string;
  groupId: string;
  userId: string;
}): DemoRegistration | undefined {
  const reg = registrations.find(
    (r) => r.session_id === input.sessionId && r.user_id === input.userId,
  );
  if (!reg) return undefined;
  if (reg.status === 'no_show') return reg;

  registrations = registrations.map((r) =>
    r.session_id === input.sessionId && r.user_id === input.userId
      ? { ...r, status: 'no_show' as const }
      : r,
  );

  const member = getDemoMember(input.groupId, input.userId);
  if (member) {
    const noShows = member.no_shows + 1;
    updateDemoMemberProfile(input.groupId, input.userId, { no_shows: noShows });
    const key = relKey(input.groupId, input.userId);
    const prev = reliability.get(key) ?? 80;
    reliability.set(key, Math.max(0, prev - 12));
  }

  emit();
  return registrations.find(
    (r) => r.session_id === input.sessionId && r.user_id === input.userId,
  );
}

export function removeDemoMember(groupId: string, userId: string) {
  const list = listDemoMembers(groupId).filter((m) => m.user_id !== userId);
  groupMembers.set(groupId, list);
  groups = groups.map((g) =>
    g.id === groupId ? { ...g, member_count: list.length } : g,
  );
  if (userId === 'guest') memberships.delete(groupId);
  emit();
}

export function blockDemoMember(groupId: string, userId: string) {
  removeDemoMember(groupId, userId);
  const set = blockedByGroup.get(groupId) ?? new Set<string>();
  set.add(userId);
  blockedByGroup.set(groupId, set);
  emit();
}

export function isDemoBlocked(groupId: string, userId: string) {
  return blockedByGroup.get(groupId)?.has(userId) ?? false;
}

export function listDemoBlocked(groupId: string): string[] {
  return Array.from(blockedByGroup.get(groupId) ?? []);
}

export function joinDemoGroup(
  id: string,
  userId = 'guest',
  displayName = 'Player',
): DemoGroup | undefined {
  const group = groups.find((g) => g.id === id);
  if (!group || group.visibility === 'private') return undefined;
  if (isDemoBlocked(id, userId) || isDemoBlocked(id, 'guest')) return undefined;

  const already =
    memberships.has(id) &&
    listDemoMembers(id).some((m) => m.user_id === userId || m.user_id === 'guest');

  memberships.add(id);
  upsertDemoMember(id, {
    user_id: userId,
    display_name: displayName.trim() || 'Player',
    role: 'member',
    organiser_level: guestSkillLevel === 'unknown' ? 'intermediate' : guestSkillLevel,
    notes: '',
    sessions_played: 0,
    no_shows: 0,
    best_finish: null,
    points: 0,
  });
  groups = groups.map((g) => (g.id === id ? { ...g, role: 'member' } : g));

  if (!already) {
    sendDemoMessage({
      group_id: id,
      sender_id: null,
      sender_name: 'Padel Nerdz',
      kind: 'system',
      body: `${displayName.trim() || 'Player'} joined the group`,
      payload: { event: 'member_joined', user_id: userId },
    });
  }

  emit();
  return getDemoGroup(id);
}

export function joinDemoByInviteCode(
  inviteCode: string,
  userId = 'guest',
  displayName = 'Player',
): DemoGroup | undefined {
  const group = groups.find((g) => g.invite_code.toUpperCase() === inviteCode.trim().toUpperCase());
  if (!group) return undefined;

  const already =
    memberships.has(group.id) &&
    listDemoMembers(group.id).some((m) => m.user_id === userId || m.user_id === 'guest');

  memberships.add(group.id);
  const keepOwner =
    (group.role === 'owner' && group.created_by === 'guest') ||
    (group.created_by === userId && group.role === 'owner');
  upsertDemoMember(group.id, {
    user_id: userId,
    display_name: displayName.trim() || 'Player',
    role: keepOwner ? 'owner' : 'member',
    organiser_level: guestSkillLevel === 'unknown' ? 'intermediate' : guestSkillLevel,
    notes: '',
    sessions_played: 0,
    no_shows: 0,
    best_finish: null,
    points: 0,
  });
  groups = groups.map((g) =>
    g.id === group.id ? { ...g, role: keepOwner ? 'owner' : 'member' } : g,
  );

  if (!already && !keepOwner) {
    sendDemoMessage({
      group_id: group.id,
      sender_id: null,
      sender_name: 'Padel Nerdz',
      kind: 'system',
      body: `${displayName.trim() || 'Player'} joined the group`,
      payload: { event: 'member_joined', user_id: userId },
    });
  }

  emit();
  return getDemoGroup(group.id);
}

export function isDemoMember(id: string): boolean {
  return memberships.has(id) || groups.some((g) => g.id === id && g.created_by === 'guest');
}

export function listDemoMessages(groupId: string): DemoMessage[] {
  return messages
    .filter((m) => m.group_id === groupId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function lastDemoMessage(groupId: string): DemoMessage | undefined {
  const list = listDemoMessages(groupId);
  return list[list.length - 1];
}

export function sendDemoMessage(input: {
  group_id: string;
  sender_id: string | null;
  sender_name: string;
  body: string;
  kind?: MessageKind;
  payload?: Record<string, unknown>;
}): DemoMessage {
  const msg: DemoMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    group_id: input.group_id,
    sender_id: input.sender_id,
    sender_name: input.sender_name,
    body: input.body.trim(),
    kind: input.kind ?? 'text',
    payload: input.payload ?? {},
    created_at: new Date().toISOString(),
  };
  messages = [...messages, msg];
  emit();
  return msg;
}

export function listDemoSessions(groupId: string): DemoSession[] {
  return sessions
    .filter((s) => s.group_id === groupId)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

export function getDemoSessionByRoomId(roomId: string): DemoSession | undefined {
  return sessions.find((s) => s.session_room_id === roomId);
}

export function getDemoSession(sessionId: string): DemoSession | undefined {
  return sessions.find((s) => s.id === sessionId);
}

export function createDemoSession(input: {
  group_id: string;
  title: string;
  starts_at: string;
  venue_label: string | null;
  format: SessionFormat;
  courts: number;
  max_players: number;
  price_cents: number | null;
  commission_cents?: number;
  banner_url?: string | null;
  created_by: string;
  created_by_name: string;
}): DemoSession {
  const session: DemoSession = {
    id: `demo-session-${Date.now()}`,
    group_id: input.group_id,
    title: input.title.trim(),
    starts_at: input.starts_at,
    venue_label: input.venue_label,
    format: input.format,
    courts: input.courts,
    max_players: input.max_players,
    price_cents: input.price_cents,
    commission_cents: input.commission_cents ?? 100,
    banner_url: input.banner_url ?? null,
    registered_count: 0,
    session_room_id: null,
    status: 'open',
    wrap_media_url: null,
    closed_at: null,
  };
  sessions = [session, ...sessions];

  sendDemoMessage({
    group_id: input.group_id,
    sender_id: null,
    sender_name: 'Padel Nerdz',
    kind: 'mixin_card',
    body: `Mix-in open: ${session.title}`,
    payload: {
      session_id: session.id,
      title: session.title,
      starts_at: session.starts_at,
      venue_label: session.venue_label,
      format: session.format,
      max_players: session.max_players,
      courts: session.courts,
      price_cents: session.price_cents,
      commission_cents: session.commission_cents,
      // Court + €1 fee + IVA on fee — single player-facing total
      player_total_cents:
        (session.price_cents ?? 0) +
        session.commission_cents +
        Math.round(session.commission_cents * 0.21),
      banner_url: session.banner_url,
    },
  });

  emit();
  return session;
}

export function registerDemoSession(input: {
  sessionId: string;
  userId: string;
  displayName: string;
  groupId: string;
}): DemoRegistration {
  const active = registrations.find(
    (r) => r.session_id === input.sessionId && r.user_id === input.userId && r.status !== 'cancelled',
  );
  if (active) return active;

  const cancelled = registrations.find(
    (r) => r.session_id === input.sessionId && r.user_id === input.userId && r.status === 'cancelled',
  );
  if (cancelled) {
    registrations = registrations.map((r) =>
      r.id === cancelled.id
        ? { ...r, status: 'registered' as const, display_name: input.displayName }
        : r,
    );
    sessions = sessions.map((s) =>
      s.id === input.sessionId ? { ...s, registered_count: s.registered_count + 1 } : s,
    );
    emit();
    return registrations.find((r) => r.id === cancelled.id)!;
  }

  const score = reliability.get(relKey(input.groupId, input.userId)) ?? 80;
  const row: DemoRegistration = {
    id: `reg-${Date.now()}`,
    session_id: input.sessionId,
    user_id: input.userId,
    display_name: input.displayName,
    status: 'registered',
    reliability: score,
  };
  registrations = [...registrations, row];
  sessions = sessions.map((s) =>
    s.id === input.sessionId ? { ...s, registered_count: s.registered_count + 1 } : s,
  );
  emit();
  return row;
}

export function listDemoRegistrations(sessionId: string): DemoRegistration[] {
  return registrations.filter((r) => r.session_id === sessionId && r.status !== 'cancelled');
}

export function listDemoRegistrationsAll(sessionId: string): DemoRegistration[] {
  return registrations.filter((r) => r.session_id === sessionId);
}

export function selectDemoPlayers(input: {
  sessionId: string;
  groupId: string;
  selectedUserIds: string[];
  organiserId: string;
}): { session: DemoSession; selectedNames: string[] } {
  const session = getDemoSession(input.sessionId);
  if (!session) throw new Error('Session not found');

  registrations = registrations.map((r) => {
    if (r.session_id !== input.sessionId) return r;
    if (input.selectedUserIds.includes(r.user_id)) return { ...r, status: 'selected' as const };
    if (r.status === 'registered') return { ...r, status: 'waitlist' as const };
    return r;
  });

  const selected = listDemoRegistrations(input.sessionId).filter((r) => r.status === 'selected');
  const selectedNames = selected.map((r) => r.display_name);

  // Lineup confirmed — payment + chatter stay in session flow, not main chat spam
  sessions = sessions.map((s) =>
    s.id === input.sessionId
      ? { ...s, status: 'selected', session_room_id: s.session_room_id }
      : s,
  );

  // Main chat only: short accept notice (no payment dump)
  sendDemoMessage({
    group_id: input.groupId,
    sender_id: null,
    sender_name: 'Padel Nerdz',
    kind: 'accept_notice',
    body: `Lineup set for ${session.title}`,
    payload: {
      session_id: input.sessionId,
      selected: selectedNames,
      selected_ids: selected.map((r) => r.user_id),
      phase: 'lineup_set',
      organiser_id: input.organiserId,
      title: session.title,
    },
  });

  // Fixtures wait until players pay — never generate on accept alone
  fixturesBySession.delete(input.sessionId);

  emit();
  return { session: getDemoSession(input.sessionId)!, selectedNames };
}

/** Build courts only from paid players (after payment, not on accept). */
export function maybeGenerateDemoFixturesAfterPayment(sessionId: string): {
  ready: boolean;
  justCreated: boolean;
} {
  const session = getDemoSession(sessionId);
  if (!session) return { ready: false, justCreated: false };
  if (fixturesBySession.has(sessionId)) return { ready: true, justCreated: false };

  const paid = listDemoRegistrations(sessionId)
    .filter((r) => r.status === 'paid')
    .sort((a, b) => b.reliability - a.reliability);
  if (paid.length < 4) return { ready: false, justCreated: false };

  const players = paid.map((r) => ({ user_id: r.user_id, display_name: r.display_name }));
  const round =
    session.format === 'tournament_by_wins'
      ? seedTournamentByWins(players, DEFAULT_TOURNAMENT_BY_WINS_CONFIG)
      : generateKingsAndQueensRound1(players, session.courts);
  fixturesBySession.set(sessionId, round as DemoFixtureRound);
  return { ready: true, justCreated: true };
}

export function getDemoFixtures(sessionId: string): DemoFixtureRound | undefined {
  return fixturesBySession.get(sessionId);
}

export function saveDemoFixtures(sessionId: string, round: DemoFixtureRound) {
  fixturesBySession.set(sessionId, round);
  emit();
}

/** Player honour-claims payment; session room unlocks only after organiser verify. */
export function claimDemoPayment(input: {
  sessionId: string;
  groupId: string;
  userId: string;
  displayName: string;
}): void {
  const session = getDemoSession(input.sessionId);
  if (!session) throw new Error('Session not found');

  const reg = registrations.find(
    (r) => r.session_id === input.sessionId && r.user_id === input.userId,
  );
  if (!reg || (reg.status !== 'selected' && reg.status !== 'payment_claimed')) {
    throw new Error('You need to be selected by the organiser first');
  }

  const claimedAt = new Date().toISOString();
  registrations = registrations.map((r) =>
    r.session_id === input.sessionId && r.user_id === input.userId
      ? { ...r, status: 'payment_claimed' as const, payment_claimed_at: claimedAt }
      : r,
  );

  sendDemoMessage({
    group_id: input.groupId,
    sender_id: null,
    sender_name: 'Padel Nerdz',
    kind: 'system',
    body: `${input.displayName} says they paid for ${session.title} — check Bizum/Revolut, then confirm in Verify payments.`,
    payload: {
      event: 'payment_claimed',
      session_id: input.sessionId,
      user_id: input.userId,
    },
  });
  emit();
}

export function rejectDemoPaymentClaim(input: {
  sessionId: string;
  userId: string;
}): void {
  const reg = registrations.find(
    (r) => r.session_id === input.sessionId && r.user_id === input.userId,
  );
  if (!reg || reg.status !== 'payment_claimed') {
    throw new Error('No payment claim to reject');
  }
  registrations = registrations.map((r) =>
    r.session_id === input.sessionId && r.user_id === input.userId
      ? { ...r, status: 'selected' as const, payment_claimed_at: null }
      : r,
  );
  emit();
}

export function verifyDemoPayment(input: {
  sessionId: string;
  groupId: string;
  userId: string;
  displayName: string;
  organiserId: string;
}): { sessionRoomId: string } {
  const session = getDemoSession(input.sessionId);
  if (!session) throw new Error('Session not found');

  const reg = registrations.find(
    (r) => r.session_id === input.sessionId && r.user_id === input.userId,
  );
  if (!reg || (reg.status !== 'payment_claimed' && reg.status !== 'paid')) {
    throw new Error('Player hasn’t claimed payment yet');
  }

  registrations = registrations.map((r) =>
    r.session_id === input.sessionId && r.user_id === input.userId
      ? { ...r, status: 'paid' as const }
      : r,
  );

  let roomId = session.session_room_id;
  if (!roomId) {
    roomId = `demo-room-${Date.now()}`;
    sessions = sessions.map((s) =>
      s.id === input.sessionId ? { ...s, session_room_id: roomId, status: 'live' } : s,
    );
    sendDemoSessionRoomMessage({
      session_room_id: roomId,
      sender_id: null,
      sender_name: 'Padel Nerdz',
      kind: 'system',
      body: `Welcome to ${session.title}. Share scores, photos, and plans here.`,
    });
    sendDemoSessionRoomMessage({
      session_room_id: roomId,
      sender_id: null,
      sender_name: 'Padel Nerdz',
      kind: 'arrival_card',
      body: 'When you arrive',
      payload: {
        session_id: input.sessionId,
        venue_label: session.venue_label,
        title: session.title,
      },
    });
  }

  sendDemoSessionRoomMessage({
    session_room_id: roomId,
    sender_id: null,
    sender_name: 'Padel Nerdz',
    kind: 'system',
    body: `${input.displayName} — payment verified by organiser.`,
  });

  const fixtures = maybeGenerateDemoFixturesAfterPayment(input.sessionId);
  if (fixtures.justCreated) {
    const paid = listDemoRegistrations(input.sessionId)
      .filter((r) => r.status === 'paid')
      .sort((a, b) => b.reliability - a.reliability);
    const round = getDemoFixtures(input.sessionId);

    sendDemoSessionRoomMessage({
      session_room_id: roomId,
      sender_id: null,
      sender_name: 'Padel Nerdz',
      kind: 'players_card',
      body: 'Confirmed players',
      payload: {
        session_id: input.sessionId,
        title: session.title,
        players: paid.map((p) => ({
          user_id: p.user_id,
          display_name: p.display_name,
          reliability: p.reliability,
        })),
      },
    });

    if (round) {
      sendDemoSessionRoomMessage({
        session_room_id: roomId,
        sender_id: null,
        sender_name: 'Padel Nerdz',
        kind: 'fixtures_card',
        body: `Round ${round.round} courts`,
        payload: {
          session_id: input.sessionId,
          round: round.round,
          matches: round.matches.map((m) => ({
            court: m.court,
            label: m.label,
            team_a: `${m.team_a.player_a.display_name} & ${m.team_a.player_b.display_name}`,
            team_b: `${m.team_b.player_a.display_name} & ${m.team_b.player_b.display_name}`,
          })),
        },
      });
    }
  }

  emit();
  return { sessionRoomId: roomId };
}

export function closeDemoSession(input: {
  sessionId: string;
  groupId: string;
  organiserId: string;
  wrapMediaUrl?: string | null;
  /** Rich slideshow payload (players, fixtures, chat moments). */
  wrapPayload?: Record<string, unknown> | null;
  /** When true, caller posts the wrap card itself. */
  skipWrapMessage?: boolean;
}): DemoSession {
  const session = getDemoSession(input.sessionId);
  if (!session) throw new Error('Session not found');

  const paid = listDemoRegistrations(input.sessionId).filter(
    (r) =>
      r.status === 'paid' || r.status === 'selected' || r.status === 'payment_claimed',
  );
  const wrapUri = input.wrapMediaUrl ?? null;

  sessions = sessions.map((s) =>
    s.id === input.sessionId
      ? {
          ...s,
          status: 'closed' as const,
          closed_at: new Date().toISOString(),
          wrap_media_url: wrapUri,
        }
      : s,
  );

  if (!input.skipWrapMessage) {
    sendDemoMessage({
      group_id: input.groupId,
      sender_id: null,
      sender_name: 'Padel Nerdz',
      kind: 'wrap_card',
      body: `Wrap-up: ${session.title}`,
      payload: {
        session_id: input.sessionId,
        title: session.title,
        media_url: wrapUri,
        player_count: paid.length,
        closed_at: new Date().toISOString(),
        ...(input.wrapPayload ?? {}),
      },
    });
  }

  if (session.session_room_id) {
    sendDemoSessionRoomMessage({
      session_room_id: session.session_room_id,
      sender_id: null,
      sender_name: 'Padel Nerdz',
      kind: 'wrap_card',
      body: `Wrap-up: ${session.title}`,
      payload: {
        session_id: input.sessionId,
        title: session.title,
        media_url: wrapUri,
        player_count: paid.length,
        closed_at: new Date().toISOString(),
        ...(input.wrapPayload ?? {}),
      },
    });
    sendDemoSessionRoomMessage({
      session_room_id: session.session_room_id,
      sender_id: null,
      sender_name: 'Padel Nerdz',
      kind: 'system',
      body: 'Session closed — this chat is now read-only.',
    });
  }

  emit();
  return getDemoSession(input.sessionId)!;
}

export function listDemoPaidPlayers(sessionId: string): DemoRegistration[] {
  return listDemoRegistrations(sessionId).filter(
    (r) =>
      r.status === 'paid' || r.status === 'selected' || r.status === 'payment_claimed',
  );
}

/**
 * Player can’t make it (voluntary). No in-app refund — organiser can refill from waitlist.
 * Paid players keep financial settlement outside the app.
 */
export function withdrawDemoRegistration(input: {
  sessionId: string;
  groupId: string;
  userId: string;
  displayName: string;
  reason?: string;
}): { wasPaid: boolean; wasSelected: boolean } {
  const reg = registrations.find(
    (r) =>
      r.session_id === input.sessionId &&
      r.user_id === input.userId &&
      r.status !== 'cancelled' &&
      r.status !== 'no_show',
  );
  if (!reg) throw new Error('You’re not registered for this mix-in');

  const wasPaid = reg.status === 'paid';
  const wasSelected =
    reg.status === 'selected' ||
    reg.status === 'payment_claimed' ||
    wasPaid;
  const session = getDemoSession(input.sessionId);

  registrations = registrations.map((r) =>
    r.session_id === input.sessionId && r.user_id === input.userId
      ? { ...r, status: 'cancelled' as const }
      : r,
  );

  const active = listDemoRegistrations(input.sessionId).length;
  sessions = sessions.map((s) =>
    s.id === input.sessionId ? { ...s, registered_count: active } : s,
  );

  // Invalidate fixtures so courts can rebuild with the new paid set
  if (wasPaid) {
    fixturesBySession.delete(input.sessionId);
  }

  const reasonBit = input.reason?.trim() ? ` (${input.reason.trim()})` : '';
  const moneyBit = wasPaid
    ? ' Payment stays as settled outside the app unless you arrange otherwise.'
    : '';

  sendDemoMessage({
    group_id: input.groupId,
    sender_id: null,
    sender_name: 'Padel Nerdz',
    kind: 'system',
    body: `${input.displayName} can’t make it${reasonBit} — spot open.${moneyBit}`,
    payload: {
      event: 'player_withdrew',
      session_id: input.sessionId,
      user_id: input.userId,
      was_paid: wasPaid,
      was_selected: wasSelected,
    },
  });

  if (session?.session_room_id && wasSelected) {
    sendDemoSessionRoomMessage({
      session_room_id: session.session_room_id,
      sender_id: null,
      sender_name: 'Padel Nerdz',
      kind: 'system',
      body: `${input.displayName} withdrew. Organiser can fill the spot from the waitlist.`,
    });
  }

  emit();
  return { wasPaid, wasSelected };
}

/** Organiser offers an open spot to a waitlisted / interested player. */
export function offerDemoSpot(input: {
  sessionId: string;
  groupId: string;
  replacementUserId: string;
  organiserId: string;
}): { name: string } {
  const target = registrations.find(
    (r) =>
      r.session_id === input.sessionId &&
      r.user_id === input.replacementUserId &&
      (r.status === 'waitlist' || r.status === 'registered' || r.status === 'cancelled'),
  );
  if (!target) throw new Error('Pick someone from the interest / waitlist');

  const session = getDemoSession(input.sessionId);
  const paidOrSelected = listDemoRegistrations(input.sessionId).filter(
    (r) =>
      r.status === 'paid' || r.status === 'selected' || r.status === 'payment_claimed',
  ).length;
  if (session && paidOrSelected >= session.max_players) {
    throw new Error('Lineup is full — withdraw someone first');
  }

  registrations = registrations.map((r) => {
    if (r.session_id !== input.sessionId) return r;
    if (r.user_id === input.replacementUserId) {
      return { ...r, status: 'selected' as const };
    }
    return r;
  });

  // If they were cancelled, ensure registration row exists as selected
  if (target.status === 'cancelled') {
    registrations = registrations.map((r) =>
      r.session_id === input.sessionId && r.user_id === input.replacementUserId
        ? { ...r, status: 'selected' as const }
        : r,
    );
  }

  sendDemoMessage({
    group_id: input.groupId,
    sender_id: null,
    sender_name: 'Padel Nerdz',
    kind: 'accept_notice',
    body: `Spot offered to ${target.display_name}`,
    payload: {
      session_id: input.sessionId,
      selected: [target.display_name],
      selected_ids: [target.user_id],
      phase: 'spot_offered',
      title: session?.title ?? 'Mix-in',
    },
  });

  emit();
  return { name: target.display_name };
}

export function postDemoNeedPlayer(input: {
  sessionId: string;
  groupId: string;
  organiserName: string;
  spots?: number;
}): void {
  const session = getDemoSession(input.sessionId);
  const spots = input.spots ?? 1;
  sendDemoMessage({
    group_id: input.groupId,
    sender_id: null,
    sender_name: 'Padel Nerdz',
    kind: 'system',
    body: `Need ${spots} more player${spots === 1 ? '' : 's'} for ${session?.title ?? 'the mix-in'} — register interest or message the organiser.`,
    payload: {
      event: 'need_player',
      session_id: input.sessionId,
      spots,
      posted_by: input.organiserName,
    },
  });
  emit();
}

export function listDemoSessionRoomMessages(roomId: string): DemoMessage[] {
  return sessionRoomMessages
    .filter((m) => (m.payload.session_room_id as string) === roomId || m.group_id === roomId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function sendDemoSessionRoomMessage(input: {
  session_room_id: string;
  sender_id: string | null;
  sender_name: string;
  body: string;
  kind?: MessageKind;
  payload?: Record<string, unknown>;
}): DemoMessage {
  const msg: DemoMessage = {
    id: `srmsg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    group_id: input.session_room_id,
    sender_id: input.sender_id,
    sender_name: input.sender_name,
    body: input.body.trim() || (input.kind === 'image' ? 'Photo' : input.kind === 'video' ? 'Video' : ''),
    kind: input.kind ?? 'text',
    payload: { session_room_id: input.session_room_id, ...(input.payload ?? {}) },
    created_at: new Date().toISOString(),
  };
  sessionRoomMessages = [...sessionRoomMessages, msg];
  emit();
  return msg;
}

export function getDemoReliability(groupId: string, userId: string): number {
  return reliability.get(relKey(groupId, userId)) ?? 80;
}

export type DemoPaymentSettings = {
  group_id: string;
  preferred_method: 'revolut' | 'bizum' | 'stripe' | 'cash';
  revolut_me_code: string | null;
  revolut_me_url: string | null;
  bizum_phone: string | null;
  bizum_name: string | null;
  stripe_enabled: boolean;
  stripe_account_id?: string | null;
  stripe_charges_enabled?: boolean;
  stripe_details_submitted?: boolean;
  payment_note: string | null;
};

const paymentSettings = new Map<string, DemoPaymentSettings>();

export function getDemoPaymentSettings(groupId: string): DemoPaymentSettings {
  const existing = paymentSettings.get(groupId);
  if (existing) return existing;
  const blank: DemoPaymentSettings = {
    group_id: groupId,
    preferred_method: 'stripe',
    revolut_me_code: null,
    revolut_me_url: null,
    bizum_phone: null,
    bizum_name: null,
    stripe_enabled: false,
    stripe_account_id: null,
    stripe_charges_enabled: false,
    stripe_details_submitted: false,
    payment_note: null,
  };
  paymentSettings.set(groupId, blank);
  return blank;
}

export function saveDemoPaymentSettings(
  input: DemoPaymentSettings,
): DemoPaymentSettings {
  paymentSettings.set(input.group_id, { ...input });
  emit();
  return getDemoPaymentSettings(input.group_id);
}

export function seedDemoRegistrants(sessionId: string, groupId: string) {
  // Help organisers see a selection list in demo
  const fake = [
    { id: 'demo-p1', name: 'Alex Rivera', score: 92 },
    { id: 'demo-p2', name: 'Sam Cole', score: 71 },
    { id: 'demo-p3', name: 'Jordan Lee', score: 88 },
    { id: 'demo-p4', name: 'Casey Ng', score: 64 },
  ];
  for (const p of fake) {
    reliability.set(relKey(groupId, p.id), p.score);
    if (!registrations.some((r) => r.session_id === sessionId && r.user_id === p.id)) {
      registrations.push({
        id: `reg-${p.id}`,
        session_id: sessionId,
        user_id: p.id,
        display_name: p.name,
        status: 'registered',
        reliability: p.score,
      });
    }
  }
  const count = listDemoRegistrations(sessionId).length;
  sessions = sessions.map((s) => (s.id === sessionId ? { ...s, registered_count: count } : s));
  emit();
}

type DemoPointKind =
  | 'paid_place'
  | 'best_finish_1'
  | 'best_finish_2'
  | 'best_finish_3'
  | 'session_closed_played'
  | 'no_show';

type DemoPointEvent = {
  id: string;
  group_id: string;
  user_id: string;
  session_id: string | null;
  kind: DemoPointKind;
  points: number;
  created_at: string;
};

const POINT_VALUES: Record<DemoPointKind, number> = {
  paid_place: 10,
  best_finish_1: 25,
  best_finish_2: 10,
  best_finish_3: 10,
  session_closed_played: 5,
  no_show: -20,
};

let demoPointEvents: DemoPointEvent[] = [];

function seedDemoPointsIfEmpty() {
  if (demoPointEvents.length > 0) return;
  const g = groups[0];
  if (!g) return;
  const now = Date.now();
  const members = listDemoMembers(g.id);
  for (const [i, m] of members.entries()) {
    const n = Math.max(1, Math.floor(m.points / 10));
    for (let k = 0; k < n; k++) {
      demoPointEvents.push({
        id: `dpe-${m.user_id}-${k}`,
        group_id: g.id,
        user_id: m.user_id,
        session_id: null,
        kind: 'paid_place',
        points: 10,
        created_at: new Date(now - (i * 3 + k) * 86400000).toISOString(),
      });
    }
  }
}

export function awardDemoPointEvent(input: {
  groupId: string;
  userId: string;
  kind: DemoPointKind;
  sessionId: string | null;
}) {
  seedDemoPointsIfEmpty();
  const pts = POINT_VALUES[input.kind];
  if (
    input.sessionId &&
    demoPointEvents.some(
      (e) =>
        e.group_id === input.groupId &&
        e.user_id === input.userId &&
        e.session_id === input.sessionId &&
        e.kind === input.kind,
    )
  ) {
    return;
  }
  demoPointEvents.push({
    id: `dpe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    group_id: input.groupId,
    user_id: input.userId,
    session_id: input.sessionId,
    kind: input.kind,
    points: pts,
    created_at: new Date().toISOString(),
  });

  const list = listDemoMembers(input.groupId).map((m) => {
    if (m.user_id !== input.userId && !(input.userId.startsWith('local_') && m.user_id === 'guest')) {
      return m;
    }
    return {
      ...m,
      points: m.points + pts,
      sessions_played:
        input.kind === 'paid_place' ? m.sessions_played + 1 : m.sessions_played,
      no_shows: input.kind === 'no_show' ? m.no_shows + 1 : m.no_shows,
      best_finish:
        input.kind === 'best_finish_1'
          ? 1
          : input.kind === 'best_finish_2'
            ? m.best_finish == null
              ? 2
              : Math.min(m.best_finish, 2)
            : input.kind === 'best_finish_3'
              ? m.best_finish == null
                ? 3
                : Math.min(m.best_finish, 3)
              : m.best_finish,
    };
  });
  groupMembers.set(input.groupId, sortMembers(list));
  emit();
}

export function listDemoLeaderboard(
  groupId: string,
  period: 'all_time' | 'this_month' | 'last_year',
  viewerId: string,
) {
  seedDemoPointsIfEmpty();
  const now = Date.now();
  let from = 0;
  if (period === 'this_month') {
    const d = new Date();
    from = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  } else if (period === 'last_year') {
    from = now - 365 * 86400000;
  }

  const totals = new Map<string, number>();
  for (const m of listDemoMembers(groupId)) {
    totals.set(m.user_id, 0);
  }
  for (const e of demoPointEvents) {
    if (e.group_id !== groupId) continue;
    if (from && new Date(e.created_at).getTime() < from) continue;
    totals.set(e.user_id, (totals.get(e.user_id) ?? 0) + e.points);
  }

  const members = listDemoMembers(groupId);
  const rows = [...totals.entries()]
    .map(([user_id, points]) => {
      const m = members.find((x) => x.user_id === user_id);
      return {
        user_id,
        display_name: m?.display_name ?? 'Player',
        avatar_url: null as string | null,
        points,
        rank: 0,
        is_you:
          user_id === viewerId ||
          user_id === 'guest' ||
          (viewerId.startsWith('local_') && user_id === 'guest'),
      };
    })
    .sort((a, b) => b.points - a.points || a.display_name.localeCompare(b.display_name));

  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

export function listDemoMessageReactions(
  channelType: 'group' | 'session_room',
  channelId: string,
): DemoMessageReaction[] {
  return messageReactions.filter(
    (r) => r.channel_type === channelType && r.channel_id === channelId,
  );
}

export function toggleDemoMessageReaction(input: {
  channelType: 'group' | 'session_room';
  channelId: string;
  messageId: string;
  userId: string;
  emoji: string;
}): DemoMessageReaction[] {
  const existing = messageReactions.find(
    (r) =>
      r.channel_type === input.channelType &&
      r.message_id === input.messageId &&
      r.user_id === input.userId &&
      r.emoji === input.emoji,
  );
  if (existing) {
    messageReactions = messageReactions.filter((r) => r.id !== existing.id);
  } else {
    messageReactions = [
      ...messageReactions,
      {
        id: `demo-react-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        channel_type: input.channelType,
        channel_id: input.channelId,
        message_id: input.messageId,
        user_id: input.userId,
        emoji: input.emoji,
        created_at: new Date().toISOString(),
      },
    ];
  }
  emit();
  return listDemoMessageReactions(input.channelType, input.channelId);
}
