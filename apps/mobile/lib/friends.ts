import AsyncStorage from '@react-native-async-storage/async-storage';

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

const FRIENDS_KEY = 'pn.friends.v1';
const TAG_KEY = 'pn.myFriendTag.v1';
const REQUESTS_KEY = 'pn.friendRequests.v1';
/** Legacy flag from when we auto-seeded a fake inbound request — cleared on load. */
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

export async function getMyFriendTag(displayName?: string): Promise<string> {
  const existing = await AsyncStorage.getItem(TAG_KEY);
  if (existing) return existing;
  const base = normalizeTag(displayName ?? 'player') || 'player';
  const tag = `${base}${Math.floor(Math.random() * 90 + 10)}`;
  await AsyncStorage.setItem(TAG_KEY, tag);
  return tag;
}

export async function setMyFriendTag(tag: string): Promise<string> {
  const next = normalizeTag(tag);
  if (next.length < 3) throw new Error('Tag needs at least 3 characters');
  await AsyncStorage.setItem(TAG_KEY, next);
  return next;
}

export function friendDeepLink(tag: string) {
  return `padelnerdz://friend/${normalizeTag(tag)}`;
}

export function friendQrImageUrl(tag: string) {
  const data = encodeURIComponent(friendDeepLink(tag));
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&bgcolor=0B0D10&color=C8FF2E&data=${data}`;
}

export async function listFriends(): Promise<Friend[]> {
  try {
    const raw = await AsyncStorage.getItem(FRIENDS_KEY);
    return raw ? (JSON.parse(raw) as Friend[]) : [];
  } catch {
    return [];
  }
}

export async function addFriendByTag(tag: string): Promise<Friend> {
  const normalized = normalizeTag(tag);
  if (!normalized) throw new Error('Enter a friend tag');
  const mine = await AsyncStorage.getItem(TAG_KEY);
  if (mine && mine === normalized) throw new Error("That's your own tag");

  const hit = DEMO_DIRECTORY.find((f) => f.friend_tag === normalized);
  const friend: Friend = hit ?? {
    id: `friend-${normalized}`,
    display_name: normalized.charAt(0).toUpperCase() + normalized.slice(1),
    friend_tag: normalized,
  };

  const current = await listFriends();
  if (current.some((f) => f.friend_tag === friend.friend_tag)) {
    return friend;
  }
  await AsyncStorage.setItem(FRIENDS_KEY, JSON.stringify([friend, ...current]));
  emitFriends();
  return friend;
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

/**
 * Strip leftover demo “Jordan Lee” (and other demo-*) requests that older builds
 * auto-seeded into AsyncStorage. Real requests never use demo-* ids.
 */
export async function listFriendRequests(): Promise<FriendRequest[]> {
  const current = await loadRequests();
  const cleaned = current.filter((r) => !r.from_id.startsWith('demo-'));
  if (cleaned.length !== current.length) {
    await saveRequests(cleaned);
  }
  // Stop any old seed flag from confusing future logic
  await AsyncStorage.removeItem(REQUESTS_SEEDED_KEY);
  return cleaned;
}

export async function acceptFriendRequest(requestId: string): Promise<Friend | null> {
  const requests = await loadRequests();
  const hit = requests.find((r) => r.id === requestId);
  if (!hit) return null;
  await saveRequests(requests.filter((r) => r.id !== requestId));
  return addFriendByTag(hit.from_tag);
}

export async function declineFriendRequest(requestId: string) {
  const requests = await loadRequests();
  await saveRequests(requests.filter((r) => r.id !== requestId));
}

export async function removeFriend(friendId: string) {
  const current = await listFriends();
  await AsyncStorage.setItem(
    FRIENDS_KEY,
    JSON.stringify(current.filter((f) => f.id !== friendId)),
  );
  emitFriends();
}

export function lookupDemoTag(tag: string) {
  return DEMO_DIRECTORY.find((f) => f.friend_tag === normalizeTag(tag));
}

export function lookupDemoByUserId(userId: string) {
  return DEMO_DIRECTORY.find((f) => f.id === userId);
}

export async function isFriend(userIdOrTag: string): Promise<boolean> {
  const friends = await listFriends();
  const normalized = normalizeTag(userIdOrTag);
  return friends.some(
    (f) => f.id === userIdOrTag || f.friend_tag === normalized || f.friend_tag === userIdOrTag,
  );
}

/** Add from a group member profile (demo directory or freeform). */
export async function addFriendFromMember(input: {
  userId: string;
  displayName: string;
}): Promise<Friend> {
  const hit = lookupDemoByUserId(input.userId);
  if (hit) return addFriendByTag(hit.friend_tag);

  const tag = normalizeTag(input.displayName) || normalizeTag(input.userId) || 'player';
  const friend: Friend = {
    id: input.userId,
    display_name: input.displayName.trim() || tag,
    friend_tag: tag,
  };
  const current = await listFriends();
  if (current.some((f) => f.id === friend.id || f.friend_tag === friend.friend_tag)) {
    return friend;
  }
  await AsyncStorage.setItem(FRIENDS_KEY, JSON.stringify([friend, ...current]));
  return friend;
}
