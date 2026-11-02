import AsyncStorage from '@react-native-async-storage/async-storage';

import { listDemoMessages, listDemoSessionRoomMessages } from './demo-store';

const KEY = 'pn.chatRead.v1';

type ReadMap = Record<string, string>; // channelId -> ISO last-read

let cache: ReadMap = {};
let loaded = false;
const listeners = new Set<() => void>();

async function load() {
  if (loaded) return;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as ReadMap) : {};
  } catch {
    cache = {};
  }
  loaded = true;
}

async function persist() {
  await AsyncStorage.setItem(KEY, JSON.stringify(cache));
  listeners.forEach((l) => l());
}

export function subscribeChatRead(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function getLastReadAt(channelId: string): Promise<string | null> {
  await load();
  return cache[channelId] ?? null;
}

export async function markChannelRead(channelId: string, atIso?: string) {
  await load();
  cache[channelId] = atIso ?? new Date().toISOString();
  await persist();
}

export async function unreadCountForGroup(
  groupId: string,
  userId: string,
): Promise<number> {
  await load();
  const lastRead = cache[groupId];
  const msgs = listDemoMessages(groupId);
  if (!lastRead) {
    // Never opened, count others' messages (cap so first join isn’t insane)
    return Math.min(
      99,
      msgs.filter((m) => m.sender_id && m.sender_id !== userId).length,
    );
  }
  const cut = new Date(lastRead).getTime();
  return msgs.filter(
    (m) =>
      new Date(m.created_at).getTime() > cut &&
      m.sender_id !== userId &&
      m.kind !== 'system',
  ).length;
}

export async function unreadCountForSessionRoom(
  roomId: string,
  userId: string,
): Promise<number> {
  await load();
  const lastRead = cache[roomId];
  const msgs = listDemoSessionRoomMessages(roomId);
  if (!lastRead) {
    return Math.min(
      99,
      msgs.filter((m) => m.sender_id && m.sender_id !== userId).length,
    );
  }
  const cut = new Date(lastRead).getTime();
  return msgs.filter(
    (m) => new Date(m.created_at).getTime() > cut && m.sender_id !== userId,
  ).length;
}

export async function totalUnreadForGroups(
  groupIds: string[],
  userId: string,
): Promise<number> {
  let total = 0;
  for (const id of groupIds) {
    total += await unreadCountForGroup(id, userId);
  }
  return total;
}

/** Active chat, suppress toast while viewing */
let activeChannelId: string | null = null;

export function setActiveChannel(channelId: string | null) {
  activeChannelId = channelId;
}

export function getActiveChannel() {
  return activeChannelId;
}
