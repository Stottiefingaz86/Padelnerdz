import AsyncStorage from '@react-native-async-storage/async-storage';

import { getFollowState } from './friends';
import { requestRemoteChatPush } from './push';
import { getSupabaseLoose, isSupabaseConfigured } from './supabase';

const DEMO_THREADS_KEY = 'pn.dmThreads.v1';
const DEMO_MESSAGES_KEY = 'pn.dmMessages.v1';

export type DmThread = {
  id: string;
  peer_id: string;
  peer_name: string;
  context_group_id: string | null;
  last_message_at: string;
  preview: string;
  /** Last message author, used for unread (Instagram-style bold row). */
  last_sender_id?: string | null;
  unread?: boolean;
};

const READ_KEY = 'pn.dmReadAt.v1';

async function loadReadMap(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(READ_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export async function markDmThreadRead(threadId: string): Promise<void> {
  const map = await loadReadMap();
  map[threadId] = new Date().toISOString();
  await AsyncStorage.setItem(READ_KEY, JSON.stringify(map));
}

function isUnread(
  thread: Pick<DmThread, 'id' | 'last_message_at' | 'last_sender_id'>,
  userId: string,
  readMap: Record<string, string>,
): boolean {
  if (!thread.last_sender_id || thread.last_sender_id === userId) return false;
  const readAt = readMap[thread.id];
  if (!readAt) return true;
  return thread.last_message_at > readAt;
}

export type DmMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  mine: boolean;
};

type DemoThreadRow = {
  id: string;
  user_a: string;
  user_b: string;
  context_group_id: string | null;
  created_by: string;
  last_message_at: string;
  peer_name?: string;
};

type DemoMessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

async function loadDemoThreads(): Promise<DemoThreadRow[]> {
  try {
    const raw = await AsyncStorage.getItem(DEMO_THREADS_KEY);
    return raw ? (JSON.parse(raw) as DemoThreadRow[]) : [];
  } catch {
    return [];
  }
}

async function saveDemoThreads(rows: DemoThreadRow[]) {
  await AsyncStorage.setItem(DEMO_THREADS_KEY, JSON.stringify(rows));
}

async function loadDemoMessages(): Promise<DemoMessageRow[]> {
  try {
    const raw = await AsyncStorage.getItem(DEMO_MESSAGES_KEY);
    return raw ? (JSON.parse(raw) as DemoMessageRow[]) : [];
  } catch {
    return [];
  }
}

async function saveDemoMessages(rows: DemoMessageRow[]) {
  await AsyncStorage.setItem(DEMO_MESSAGES_KEY, JSON.stringify(rows.slice(-500)));
}

function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** Open (or reuse) a DM, only after follow is approved (friends). */
export async function openDmWithMember(input: {
  peerId: string;
  peerName: string;
  groupId?: string | null;
  actorId: string;
  isGuest: boolean;
}): Promise<string> {
  if (input.peerId === input.actorId) {
    throw new Error('You can’t message yourself');
  }

  const follow = await getFollowState(input.peerId, input.isGuest);
  if (follow !== 'friends') {
    throw new Error(
      follow === 'outgoing'
        ? 'Waiting for them to approve your follow before you can message.'
        : follow === 'incoming'
          ? 'Approve their follow request first, then you can message.'
          : 'Follow them first, messaging unlocks after they approve.',
    );
  }

  const groupId = input.groupId?.startsWith('demo-') ? null : input.groupId ?? null;

  if (input.isGuest || !isSupabaseConfigured || input.peerId.startsWith('demo-')) {
    const [user_a, user_b] = orderedPair(input.actorId, input.peerId);
    const threads = await loadDemoThreads();
    const existing = threads.find((t) => t.user_a === user_a && t.user_b === user_b);
    if (existing) {
      existing.peer_name = input.peerName;
      await saveDemoThreads(threads);
      return existing.id;
    }
    const id = `demo-dm-${Date.now()}`;
    threads.unshift({
      id,
      user_a,
      user_b,
      context_group_id: groupId,
      created_by: input.actorId,
      last_message_at: new Date().toISOString(),
      peer_name: input.peerName,
    });
    await saveDemoThreads(threads);
    return id;
  }

  const { data, error } = await getSupabaseLoose().rpc('open_dm_thread', {
    p_peer_id: input.peerId,
    p_group_id: groupId,
  });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== 'string') throw new Error('Could not open chat');
  return data;
}

export async function listMyDmThreads(
  userId: string,
  isGuest: boolean,
): Promise<DmThread[]> {
  if (!userId) return [];

  const readMap = await loadReadMap();

  if (isGuest || !isSupabaseConfigured) {
    const threads = await loadDemoThreads();
    const messages = await loadDemoMessages();
    return threads
      .filter((t) => t.user_a === userId || t.user_b === userId)
      .map((t) => {
        const peerId = t.user_a === userId ? t.user_b : t.user_a;
        const last = messages
          .filter((m) => m.thread_id === t.id)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
        const row: DmThread = {
          id: t.id,
          peer_id: peerId,
          peer_name: t.peer_name ?? 'Player',
          context_group_id: t.context_group_id,
          last_message_at: last?.created_at ?? t.last_message_at,
          preview: last?.body ?? 'Direct message',
          last_sender_id: last?.sender_id ?? null,
        };
        row.unread = isUnread(row, userId, readMap);
        return row;
      })
      .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
  }

  const { data, error } = await getSupabaseLoose()
    .from('dm_threads')
    .select('id, user_a, user_b, context_group_id, last_message_at')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order('last_message_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  const out: DmThread[] = [];
  for (const row of data ?? []) {
    const peerId = row.user_a === userId ? row.user_b : row.user_a;
    const { data: profile } = await getSupabaseLoose()
      .from('profiles')
      .select('display_name')
      .eq('id', peerId)
      .maybeSingle();
    const { data: last } = await getSupabaseLoose()
      .from('dm_messages')
      .select('body, created_at, sender_id')
      .eq('thread_id', row.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const thread: DmThread = {
      id: row.id as string,
      peer_id: peerId as string,
      peer_name: profile?.display_name?.trim() || 'Player',
      context_group_id: (row.context_group_id as string | null) ?? null,
      last_message_at: (last?.created_at as string | undefined) ?? (row.last_message_at as string),
      preview: (last?.body as string | undefined) ?? 'Direct message',
      last_sender_id: (last?.sender_id as string | undefined) ?? null,
    };
    thread.unread = isUnread(thread, userId, readMap);
    out.push(thread);
  }
  return out;
}

/** Badge total for profile inbox icon. */
export async function countInboxBadge(
  userId: string,
  isGuest: boolean,
  friendRequestCount: number,
): Promise<number> {
  if (!userId) return friendRequestCount;
  try {
    const threads = await listMyDmThreads(userId, isGuest);
    const unread = threads.filter((t) => t.unread).length;
    return friendRequestCount + unread;
  } catch {
    return friendRequestCount;
  }
}

export async function getDmThreadMeta(
  threadId: string,
  userId: string,
  isGuest: boolean,
): Promise<{ peerName: string; peerId: string } | null> {
  if (isGuest || !isSupabaseConfigured || threadId.startsWith('demo-dm-')) {
    const threads = await loadDemoThreads();
    const t = threads.find((x) => x.id === threadId);
    if (!t) return null;
    const peerId = t.user_a === userId ? t.user_b : t.user_a;
    return { peerId, peerName: t.peer_name ?? 'Player' };
  }

  const { data, error } = await getSupabaseLoose()
    .from('dm_threads')
    .select('user_a, user_b')
    .eq('id', threadId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const peerId = data.user_a === userId ? data.user_b : data.user_a;
  const { data: profile } = await getSupabaseLoose()
    .from('profiles')
    .select('display_name')
    .eq('id', peerId)
    .maybeSingle();
  return {
    peerId: peerId as string,
    peerName: profile?.display_name?.trim() || 'Player',
  };
}

export async function listDmMessages(
  threadId: string,
  userId: string,
  isGuest: boolean,
): Promise<DmMessage[]> {
  if (isGuest || !isSupabaseConfigured || threadId.startsWith('demo-dm-')) {
    const messages = await loadDemoMessages();
    return messages
      .filter((m) => m.thread_id === threadId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((m) => ({
        ...m,
        mine: m.sender_id === userId,
      }));
  }

  const { data, error } = await getSupabaseLoose()
    .from('dm_messages')
    .select('id, thread_id, sender_id, body, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(300);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id as string,
    thread_id: row.thread_id as string,
    sender_id: row.sender_id as string,
    body: row.body as string,
    created_at: row.created_at as string,
    mine: row.sender_id === userId,
  }));
}

export async function sendDmMessage(input: {
  threadId: string;
  userId: string;
  body: string;
  isGuest: boolean;
}): Promise<DmMessage> {
  const body = input.body.trim();
  if (!body) throw new Error('Message is empty');

  if (input.isGuest || !isSupabaseConfigured || input.threadId.startsWith('demo-dm-')) {
    const row: DemoMessageRow = {
      id: `demo-dmm-${Date.now()}`,
      thread_id: input.threadId,
      sender_id: input.userId,
      body,
      created_at: new Date().toISOString(),
    };
    const messages = await loadDemoMessages();
    messages.push(row);
    await saveDemoMessages(messages);
    const threads = await loadDemoThreads();
    const t = threads.find((x) => x.id === input.threadId);
    if (t) {
      t.last_message_at = row.created_at;
      await saveDemoThreads(threads);
    }
    return { ...row, mine: true };
  }

  const { data, error } = await getSupabaseLoose()
    .from('dm_messages')
    .insert({
      thread_id: input.threadId,
      sender_id: input.userId,
      body,
    })
    .select('id, thread_id, sender_id, body, created_at')
    .single();
  if (error) throw error;

  void requestRemoteChatPush({
    kind: 'dm',
    channelId: input.threadId,
    messageId: data.id as string,
    title: 'New message',
    body,
    href: `/dm/${input.threadId}`,
    senderId: input.userId,
  });

  return {
    id: data.id as string,
    thread_id: data.thread_id as string,
    sender_id: data.sender_id as string,
    body: data.body as string,
    created_at: data.created_at as string,
    mine: true,
  };
}
