import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSupabaseLoose, isSupabaseConfigured } from './supabase';

export type Friend = {
  id: string;
  display_name: string;
  friend_tag: string;
};

export type FriendRequest = {
  id: string;
  from_id: string;
  from_name: string;
  from_tag: string;
  at: string;
};

export type FollowState = 'none' | 'outgoing' | 'incoming' | 'friends';

const FRIENDS_KEY = 'pn.friends.v1';
const TAG_KEY = 'pn.myFriendTag.v1';
const REQUESTS_KEY = 'pn.friendRequests.v1';
const OUTGOING_KEY = 'pn.friendOutgoing.v1';
/** Legacy flag from when we auto-seeded a fake inbound request ,  cleared on load. */
const REQUESTS_SEEDED_KEY = 'pn.friendRequests.seeded.v1';

type FriendListener = () => void;
const friendListeners = new Set<FriendListener>();

function emitFriends() {
  friendListeners.forEach((l) => l());
}

export function subscribeFriends(listener: FriendListener) {
  friendListeners.add(listener);
  return () => friendListeners.delete(listener);
}

const DEMO_DIRECTORY: Friend[] = [
  { id: 'demo-owner', display_name: 'Maya Ortiz', friend_tag: 'maya' },
  { id: 'demo-org', display_name: 'Leo Park', friend_tag: 'leo' },
  { id: 'demo-p1', display_name: 'Alex Rivera', friend_tag: 'alex' },
  { id: 'demo-p2', display_name: 'Sam Cole', friend_tag: 'sam' },
  { id: 'demo-p3', display_name: 'Jordan Lee', friend_tag: 'jordan' },
  { id: 'demo-p4', display_name: 'Casey Ng', friend_tag: 'casey' },
  { id: 'demo-p5', display_name: 'Riley Chen', friend_tag: 'riley' },
  { id: 'demo-p6', display_name: 'Taylor Brooks', friend_tag: 'taylor' },
];

function normalizeTag(raw: string) {
  return raw.trim().replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '');
}

function useLive(isGuest?: boolean) {
  return Boolean(isSupabaseConfigured && !isGuest);
}

export async function getMyFriendTag(displayName?: string): Promise<string> {
  const existing = await AsyncStorage.getItem(TAG_KEY);
  if (existing) return existing;
  const base = normalizeTag(displayName ?? 'player') || 'player';
  const tag = `${base}${Math.floor(Math.random() * 90 + 10)}`;
  await AsyncStorage.setItem(TAG_KEY, tag);
  if (isSupabaseConfigured) {
    try {
      const { data: auth } = await getSupabaseLoose().auth.getUser();
      const uid = auth.user?.id;
      if (uid) {
        await getSupabaseLoose()
          .from('profiles')
          .update({ friend_tag: tag })
          .eq('id', uid);
      }
    } catch {
      /* local tag still works */
    }
  }
  return tag;
}

export async function setMyFriendTag(tag: string): Promise<string> {
  const next = normalizeTag(tag);
  if (next.length < 3) throw new Error('Tag needs at least 3 characters');
  await AsyncStorage.setItem(TAG_KEY, next);
  if (isSupabaseConfigured) {
    const { data: auth } = await getSupabaseLoose().auth.getUser();
    const uid = auth.user?.id;
    if (uid) {
      const { error } = await getSupabaseLoose()
        .from('profiles')
        .update({ friend_tag: next })
        .eq('id', uid);
      if (error) throw new Error(error.message);
    }
  }
  return next;
}

export function friendDeepLink(tag: string) {
  return `padelnerdz://friend/${normalizeTag(tag)}`;
}

export function friendQrImageUrl(tag: string) {
  const data = encodeURIComponent(friendDeepLink(tag));
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&bgcolor=0B0D10&color=C8FF2E&data=${data}`;
}

async function loadLocalFriends(): Promise<Friend[]> {
  try {
    const raw = await AsyncStorage.getItem(FRIENDS_KEY);
    return raw ? (JSON.parse(raw) as Friend[]) : [];
  } catch {
    return [];
  }
}

async function saveLocalFriends(items: Friend[]) {
  await AsyncStorage.setItem(FRIENDS_KEY, JSON.stringify(items));
  emitFriends();
}

async function loadRequests(): Promise<FriendRequest[]> {
  try {
    const raw = await AsyncStorage.getItem(REQUESTS_KEY);
    return raw ? (JSON.parse(raw) as FriendRequest[]) : [];
  } catch {
    return [];
  }
}

async function saveRequests(items: FriendRequest[]) {
  await AsyncStorage.setItem(REQUESTS_KEY, JSON.stringify(items));
  emitFriends();
}

async function loadOutgoing(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(OUTGOING_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

async function saveOutgoing(ids: string[]) {
  await AsyncStorage.setItem(OUTGOING_KEY, JSON.stringify(ids));
  emitFriends();
}

export async function listFriends(isGuest = false): Promise<Friend[]> {
  if (!useLive(isGuest)) {
    return loadLocalFriends();
  }

  const { data: auth } = await getSupabaseLoose().auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return [];

  const { data, error } = await getSupabaseLoose()
    .from('friendships')
    .select('friend_id')
    .eq('user_id', uid);
  if (error) throw error;

  const ids = (data ?? []).map((row) => row.friend_id as string);
  if (ids.length === 0) return [];

  const { data: profiles } = await getSupabaseLoose()
    .from('profiles')
    .select('id, display_name, friend_tag')
    .in('id', ids);

  const byId = new Map(
    (profiles ?? []).map((p) => [p.id as string, p] as const),
  );

  return ids.map((id) => {
    const profile = byId.get(id);
    const name = profile?.display_name?.trim() || 'Player';
    const tag =
      (profile?.friend_tag as string | null | undefined)?.trim() ||
      normalizeTag(name) ||
      'player';
    return { id, display_name: name, friend_tag: tag };
  });
}

/**
 * Strip leftover demo “Jordan Lee” (and other demo-*) requests that older builds
 * auto-seeded into AsyncStorage. Real requests never use demo-* ids.
 */
export async function listFriendRequests(isGuest = false): Promise<FriendRequest[]> {
  if (!useLive(isGuest)) {
    const current = await loadRequests();
    const cleaned = current.filter((r) => !r.from_id.startsWith('demo-'));
    if (cleaned.length !== current.length) {
      await saveRequests(cleaned);
    }
    await AsyncStorage.removeItem(REQUESTS_SEEDED_KEY);
    return cleaned;
  }

  const { data: auth } = await getSupabaseLoose().auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return [];

  const { data, error } = await getSupabaseLoose()
    .from('friend_requests')
    .select('id, from_user_id, created_at')
    .eq('to_user_id', uid)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const fromIds = Array.from(
    new Set((data ?? []).map((row) => row.from_user_id as string)),
  );
  const { data: profiles } =
    fromIds.length > 0
      ? await getSupabaseLoose()
          .from('profiles')
          .select('id, display_name, friend_tag')
          .in('id', fromIds)
      : { data: [] as Array<{ id: string; display_name: string | null; friend_tag: string | null }> };

  const byId = new Map(
    (profiles ?? []).map((p) => [p.id as string, p] as const),
  );

  return (data ?? []).map((row) => {
    const profile = byId.get(row.from_user_id as string);
    const name = profile?.display_name?.trim() || 'Player';
    const tag =
      (profile?.friend_tag as string | null | undefined)?.trim() ||
      normalizeTag(name) ||
      'player';
    return {
      id: row.id as string,
      from_id: row.from_user_id as string,
      from_name: name,
      from_tag: tag,
      at: row.created_at as string,
    };
  });
}

export async function getFollowState(
  peerId: string,
  isGuest = false,
): Promise<FollowState> {
  if (!peerId) return 'none';

  if (!useLive(isGuest)) {
    const friends = await loadLocalFriends();
    if (friends.some((f) => f.id === peerId)) return 'friends';
    const outgoing = await loadOutgoing();
    if (outgoing.includes(peerId)) return 'outgoing';
    const incoming = await loadRequests();
    if (incoming.some((r) => r.from_id === peerId)) return 'incoming';
    return 'none';
  }

  const { data: auth } = await getSupabaseLoose().auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return 'none';

  const { data: areFriends } = await getSupabaseLoose().rpc('are_friends', {
    p_a: uid,
    p_b: peerId,
  });
  if (areFriends) return 'friends';

  const [{ data: out }, { data: incoming }] = await Promise.all([
    getSupabaseLoose()
      .from('friend_requests')
      .select('id')
      .eq('status', 'pending')
      .eq('from_user_id', uid)
      .eq('to_user_id', peerId)
      .maybeSingle(),
    getSupabaseLoose()
      .from('friend_requests')
      .select('id')
      .eq('status', 'pending')
      .eq('from_user_id', peerId)
      .eq('to_user_id', uid)
      .maybeSingle(),
  ]);
  if (out) return 'outgoing';
  if (incoming) return 'incoming';
  return 'none';
}

/** Send a follow request. If they already requested you, becomes friends. */
export async function requestFollow(input: {
  peerId: string;
  displayName: string;
  isGuest?: boolean;
}): Promise<FollowState> {
  if (input.peerId.startsWith('local_') || !input.peerId) {
    throw new Error('Sign in to follow players');
  }

  if (!useLive(input.isGuest)) {
    const state = await getFollowState(input.peerId, true);
    if (state === 'friends') return 'friends';
    if (state === 'incoming') {
      const requests = await loadRequests();
      const hit = requests.find((r) => r.from_id === input.peerId);
      if (hit) {
        await acceptFriendRequest(hit.id, true);
        return 'friends';
      }
    }
    const outgoing = await loadOutgoing();
    if (!outgoing.includes(input.peerId)) {
      await saveOutgoing([input.peerId, ...outgoing]);
    }
    // Offline demo: also park an inbound so you can Confirm on Friends.
    if (input.peerId.startsWith('demo-')) {
      const requests = await loadRequests();
      if (!requests.some((r) => r.from_id === input.peerId)) {
        const hit = lookupDemoByUserId(input.peerId);
        await saveRequests([
          {
            id: `req-${input.peerId}`,
            from_id: input.peerId,
            from_name: input.displayName,
            from_tag: hit?.friend_tag ?? normalizeTag(input.displayName),
            at: new Date().toISOString(),
          },
          ...requests,
        ]);
      }
      return 'incoming';
    }
    return 'outgoing';
  }

  const { error } = await getSupabaseLoose().rpc('request_friendship', {
    p_peer_id: input.peerId,
  });
  if (error) {
    if (/already friends/i.test(error.message)) return 'friends';
    throw new Error(error.message);
  }
  emitFriends();
  return getFollowState(input.peerId, false);
}

export async function acceptFriendRequest(
  requestId: string,
  isGuest = false,
): Promise<Friend | null> {
  if (!useLive(isGuest)) {
    const requests = await loadRequests();
    const hit = requests.find((r) => r.id === requestId);
    if (!hit) return null;
    await saveRequests(requests.filter((r) => r.id !== requestId));
    const outgoing = await loadOutgoing();
    await saveOutgoing(outgoing.filter((id) => id !== hit.from_id));
    const friend: Friend = {
      id: hit.from_id,
      display_name: hit.from_name,
      friend_tag: hit.from_tag,
    };
    const current = await loadLocalFriends();
    if (!current.some((f) => f.id === friend.id)) {
      await saveLocalFriends([friend, ...current]);
    } else {
      emitFriends();
    }
    return friend;
  }

  const { error } = await getSupabaseLoose().rpc('respond_friend_request', {
    p_request_id: requestId,
    p_accept: true,
  });
  if (error) throw new Error(error.message);
  emitFriends();
  const friends = await listFriends(false);
  return friends[0] ?? null;
}

export async function declineFriendRequest(requestId: string, isGuest = false) {
  if (!useLive(isGuest)) {
    const requests = await loadRequests();
    await saveRequests(requests.filter((r) => r.id !== requestId));
    return;
  }
  const { error } = await getSupabaseLoose().rpc('respond_friend_request', {
    p_request_id: requestId,
    p_accept: false,
  });
  if (error) throw new Error(error.message);
  emitFriends();
}

export async function removeFriend(friendId: string, isGuest = false) {
  if (!useLive(isGuest)) {
    const current = await loadLocalFriends();
    await saveLocalFriends(current.filter((f) => f.id !== friendId));
    return;
  }

  const { data: auth } = await getSupabaseLoose().auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return;

  await Promise.all([
    getSupabaseLoose()
      .from('friendships')
      .delete()
      .eq('user_id', uid)
      .eq('friend_id', friendId),
    getSupabaseLoose()
      .from('friendships')
      .delete()
      .eq('user_id', friendId)
      .eq('friend_id', uid),
  ]);
  emitFriends();
}

export async function addFriendByTag(tag: string, isGuest = false): Promise<Friend> {
  const normalized = normalizeTag(tag);
  if (!normalized) throw new Error('Enter a friend tag');
  const mine = await AsyncStorage.getItem(TAG_KEY);
  if (mine && mine === normalized) throw new Error("That's your own tag");

  if (!useLive(isGuest)) {
    const hit = DEMO_DIRECTORY.find((f) => f.friend_tag === normalized);
    const friend: Friend = hit ?? {
      id: `friend-${normalized}`,
      display_name: normalized.charAt(0).toUpperCase() + normalized.slice(1),
      friend_tag: normalized,
    };
  await requestFollow({
    peerId: friend.id,
    displayName: friend.display_name,
    isGuest: true,
  });
  return friend;
  }

  const { data: profile, error } = await getSupabaseLoose()
    .from('profiles')
    .select('id, display_name, friend_tag')
    .eq('friend_tag', normalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!profile) throw new Error('No player with that @tag');

  await requestFollow({
    peerId: profile.id as string,
    displayName: (profile.display_name as string | null)?.trim() || normalized,
    isGuest: false,
  });

  return {
    id: profile.id as string,
    display_name: (profile.display_name as string | null)?.trim() || normalized,
    friend_tag: (profile.friend_tag as string | null) || normalized,
  };
}

export function lookupDemoTag(tag: string) {
  return DEMO_DIRECTORY.find((f) => f.friend_tag === normalizeTag(tag));
}

export function lookupDemoByUserId(userId: string) {
  return DEMO_DIRECTORY.find((f) => f.id === userId);
}

export async function isFriend(userIdOrTag: string, isGuest = false): Promise<boolean> {
  const state = await getFollowState(userIdOrTag, isGuest);
  if (state === 'friends') return true;
  if (!useLive(isGuest)) {
    const friends = await loadLocalFriends();
    const normalized = normalizeTag(userIdOrTag);
    return friends.some(
      (f) => f.id === userIdOrTag || f.friend_tag === normalized || f.friend_tag === userIdOrTag,
    );
  }
  return false;
}

/** @deprecated Use requestFollow ,  kept for call sites that still expect Friend. */
export async function addFriendFromMember(input: {
  userId: string;
  displayName: string;
  isGuest?: boolean;
}): Promise<Friend> {
  const state = await requestFollow({
    peerId: input.userId,
    displayName: input.displayName,
    isGuest: input.isGuest,
  });
  if (state !== 'friends' && state !== 'outgoing' && state !== 'incoming') {
    throw new Error('Could not send follow request');
  }
  const hit = lookupDemoByUserId(input.userId);
  return {
    id: input.userId,
    display_name: input.displayName.trim() || hit?.display_name || 'Player',
    friend_tag: hit?.friend_tag || normalizeTag(input.displayName) || 'player',
  };
}
