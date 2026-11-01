import { getSupabaseLoose, isSupabaseConfigured } from './supabase';

export type TypingPeer = { userId: string; displayName: string };

type Listener = (peers: TypingPeer[]) => void;

const TTL_MS = 2800;

const rooms = new Map<string, Map<string, { displayName: string; expires: number }>>();
const listeners = new Map<string, Set<Listener>>();
const channels = new Map<
  string,
  ReturnType<ReturnType<typeof getSupabaseLoose>['channel']>
>();

function prune(roomId: string) {
  const m = rooms.get(roomId);
  if (!m) return;
  const now = Date.now();
  for (const [id, v] of m) {
    if (v.expires < now) m.delete(id);
  }
}

function snapshot(roomId: string): TypingPeer[] {
  prune(roomId);
  const m = rooms.get(roomId);
  if (!m) return [];
  return [...m.entries()].map(([userId, v]) => ({
    userId,
    displayName: v.displayName,
  }));
}

function emit(roomId: string) {
  const peers = snapshot(roomId);
  listeners.get(roomId)?.forEach((l) => l(peers));
}

function ensureRoom(roomId: string) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Map());
  if (!isSupabaseConfigured || channels.has(roomId) || roomId.startsWith('demo-')) {
    return;
  }
  try {
    const ch = getSupabaseLoose()
      .channel(`typing:${roomId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const userId = String((payload as { userId?: string })?.userId ?? '');
        const displayName = String(
          (payload as { displayName?: string })?.displayName ?? 'Player',
        );
        const active = (payload as { active?: boolean })?.active !== false;
        if (!userId) return;
        const map = rooms.get(roomId)!;
        if (!active) map.delete(userId);
        else map.set(userId, { displayName, expires: Date.now() + TTL_MS });
        emit(roomId);
      })
      .subscribe();
    channels.set(roomId, ch);
  } catch {
    /* typing is best-effort */
  }
}

/** Broadcast that you are (or stopped) typing in a chat room. */
export function setTyping(input: {
  roomId: string;
  userId: string;
  displayName: string;
  active: boolean;
}) {
  if (!input.roomId || !input.userId) return;
  ensureRoom(input.roomId);
  const map = rooms.get(input.roomId)!;
  if (input.active) {
    map.set(input.userId, {
      displayName: input.displayName,
      expires: Date.now() + TTL_MS,
    });
  } else {
    map.delete(input.userId);
  }
  emit(input.roomId);

  const ch = channels.get(input.roomId);
  if (!ch) return;
  void ch.send({
    type: 'broadcast',
    event: 'typing',
    payload: {
      userId: input.userId,
      displayName: input.displayName,
      active: input.active,
    },
  });
}

export function formatTypingLabel(peers: TypingPeer[], selfId: string): string | null {
  const others = peers.filter((p) => p.userId !== selfId);
  if (others.length === 0) return null;
  if (others.length === 1) return `${others[0]!.displayName} is typing…`;
  if (others.length === 2) {
    return `${others[0]!.displayName} and ${others[1]!.displayName} are typing…`;
  }
  return `${others.length} people are typing…`;
}

/** Live typing line for a room. Returns unsubscribe. */
export function subscribeTyping(
  roomId: string,
  selfId: string,
  listener: (label: string | null) => void,
): () => void {
  ensureRoom(roomId);
  const wrap: Listener = (peers) => listener(formatTypingLabel(peers, selfId));
  if (!listeners.has(roomId)) listeners.set(roomId, new Set());
  listeners.get(roomId)!.add(wrap);
  wrap(snapshot(roomId));

  const interval = setInterval(() => emit(roomId), 900);
  return () => {
    listeners.get(roomId)?.delete(wrap);
    clearInterval(interval);
  };
}
