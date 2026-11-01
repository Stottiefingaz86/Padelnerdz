import {
  lastDemoMessage,
  listDemoMessages,
  listDemoSessionRoomMessages,
  sendDemoMessage,
  sendDemoSessionRoomMessage,
  subscribeDemoStore,
  type DemoMessage,
  type MessageKind,
} from './demo-store';
import { requestRemoteChatPush } from './push';
import { getSupabaseLoose, isSupabaseConfigured } from './supabase';

export type ChatMessage = {
  id: string;
  group_id: string;
  sender_id: string | null;
  sender_name: string;
  body: string;
  kind: MessageKind;
  payload: Record<string, unknown>;
  created_at: string;
  mine: boolean;
};

export type ChatListItem = {
  id: string;
  title: string;
  subtitle: string;
  updatedAt: string;
  kind: 'group' | 'session_room';
  href: string;
};

function mapMessage(m: DemoMessage, userId: string): ChatMessage {
  return {
    id: m.id,
    group_id: m.group_id,
    sender_id: m.sender_id,
    sender_name: m.sender_name,
    body: m.body,
    kind: m.kind,
    payload: m.payload,
    created_at: m.created_at,
    mine: m.sender_id === userId,
  };
}

export function subscribeChat(listener: () => void) {
  return subscribeDemoStore(listener);
}

export async function listGroupMessages(
  groupId: string,
  userId: string,
  isGuest: boolean,
): Promise<ChatMessage[]> {
  if (isGuest || !isSupabaseConfigured || groupId.startsWith('demo-')) {
    return listDemoMessages(groupId).map((m) => mapMessage(m, userId));
  }

  const { data, error } = await getSupabaseLoose()
    .from('group_messages')
    .select('id, group_id, sender_id, body, kind, payload, created_at, profiles(display_name)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
    .limit(300);

  if (error) throw error;

  return (data ?? []).map((row: any) => {
    const profile = row.profiles as { display_name: string | null } | null;
    const kind = (row.kind as MessageKind | undefined) ?? 'text';
    return {
      id: row.id as string,
      group_id: row.group_id as string,
      sender_id: row.sender_id as string | null,
      sender_name:
        kind === 'system' || kind === 'mixin_card'
          ? 'Padel Nerdz'
          : profile?.display_name?.trim() || 'Player',
      body: row.body as string,
      kind,
      payload: (row.payload as Record<string, unknown>) ?? {},
      created_at: row.created_at as string,
      mine: row.sender_id === userId,
    };
  });
}

export async function sendGroupMessage(input: {
  groupId: string;
  userId: string;
  displayName: string;
  body: string;
  isGuest: boolean;
  kind?: MessageKind;
  payload?: Record<string, unknown>;
}): Promise<ChatMessage> {
  const kind = input.kind ?? 'text';
  const body =
    input.body.trim() ||
    (kind === 'image' ? 'Photo' : kind === 'video' ? 'Video' : '');
  if (!body) throw new Error('Message cannot be empty');

  if (input.isGuest || !isSupabaseConfigured || input.groupId.startsWith('demo-')) {
    return mapMessage(
      sendDemoMessage({
        group_id: input.groupId,
        sender_id: kind === 'system' || kind === 'mixin_card' ? null : input.userId,
        sender_name:
          kind === 'system' || kind === 'mixin_card' ? 'Padel Nerdz' : input.displayName,
        body,
        kind,
        payload: input.payload,
      }),
      input.userId,
    );
  }

  const { data, error } = await getSupabaseLoose()
    .from('group_messages')
    .insert({
      group_id: input.groupId,
      sender_id: kind === 'system' || kind === 'mixin_card' ? null : input.userId,
      body,
      kind,
      payload: input.payload ?? {},
    })
    .select('id, group_id, sender_id, body, kind, payload, created_at')
    .single();

  if (error) throw error;

  const kindOut = (data.kind as MessageKind) ?? 'text';
  const bodyOut = data.body as string;
  void requestRemoteChatPush({
    kind: 'group',
    channelId: input.groupId,
    messageId: data.id as string,
    title:
      kindOut === 'mixin_card'
        ? 'New mix-in'
        : kindOut === 'system'
          ? 'Padel Nerdz'
          : input.displayName,
    body:
      kindOut === 'mixin_card'
        ? bodyOut || 'A mix-in was posted in chat'
        : kindOut === 'image'
          ? 'Photo'
          : kindOut === 'video'
            ? 'Video'
            : bodyOut,
    href: `/group/${input.groupId}/chat`,
    senderId: (data.sender_id as string | null) ?? input.userId,
  });

  return {
    id: data.id as string,
    group_id: data.group_id as string,
    sender_id: data.sender_id as string | null,
    body: bodyOut,
    created_at: data.created_at as string,
    kind: kindOut,
    payload: (data.payload as Record<string, unknown>) ?? {},
    sender_name:
      data.kind === 'system' || data.kind === 'mixin_card' ? 'Padel Nerdz' : input.displayName,
    mine: data.sender_id === input.userId,
  };
}

export function previewForGroup(
  groupId: string,
): { body: string; at: string; kind: MessageKind } | null {
  const last = lastDemoMessage(groupId);
  if (!last) return null;
  return { body: last.body, at: last.created_at, kind: last.kind };
}

export async function listSessionRoomMessages(
  roomId: string,
  userId: string,
  isGuest: boolean,
): Promise<ChatMessage[]> {
  if (isGuest || !isSupabaseConfigured || roomId.startsWith('demo-')) {
    return listDemoSessionRoomMessages(roomId).map((m) => mapMessage(m, userId));
  }

  const { data, error } = await getSupabaseLoose()
    .from('session_room_messages')
    .select('id, session_room_id, sender_id, body, kind, payload, created_at, profiles(display_name)')
    .eq('session_room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(300);

  if (error) throw error;

  return (data ?? []).map((row: any) => {
    const profile = row.profiles as { display_name: string | null } | null;
    const kind = (row.kind as MessageKind) ?? 'text';
    return {
      id: row.id as string,
      group_id: row.session_room_id as string,
      sender_id: row.sender_id as string | null,
      sender_name:
        kind === 'system' ||
        kind === 'players_card' ||
        kind === 'fixtures_card' ||
        kind === 'arrival_card' ||
        kind === 'mixin_card' ||
        kind === 'accept_notice' ||
        kind === 'wrap_card'
          ? 'Padel Nerdz'
          : profile?.display_name?.trim() || 'Player',
      body: row.body as string,
      kind,
      payload: (row.payload as Record<string, unknown>) ?? {},
      created_at: row.created_at as string,
      mine: row.sender_id === userId,
    };
  });
}

/** Posts the arrival check-in guide once per session room. */
export async function ensureArrivalGuideMessage(input: {
  roomId: string;
  sessionId: string;
  venue?: string | null;
  title?: string | null;
  userId: string;
  isGuest: boolean;
}): Promise<boolean> {
  const msgs = await listSessionRoomMessages(input.roomId, input.userId, input.isGuest);
  if (msgs.some((m) => m.kind === 'arrival_card')) return false;
  await sendSessionRoomMessage({
    roomId: input.roomId,
    userId: input.userId,
    displayName: 'Padel Nerdz',
    body: 'When you arrive',
    isGuest: input.isGuest,
    kind: 'arrival_card',
    payload: {
      session_id: input.sessionId,
      venue_label: input.venue ?? null,
      title: input.title ?? null,
    },
  });
  return true;
}

async function assertSessionRoomAcceptsMessages(
  roomId: string,
  isGuest: boolean,
  kind: MessageKind,
) {
  // Closing flow may still post wrap/system into an archived room.
  if (kind === 'wrap_card' || kind === 'system') return;

  if (isGuest || !isSupabaseConfigured || roomId.startsWith('demo-')) {
    const { getDemoSessionByRoomId } = await import('./demo-store');
    const hit = getDemoSessionByRoomId(roomId);
    if (hit?.status === 'closed') {
      throw new Error('This session is closed — chat is read-only.');
    }
    return;
  }

  const { data: room } = await getSupabaseLoose()
    .from('session_rooms')
    .select('session_id, sessions(status)')
    .eq('id', roomId)
    .maybeSingle();
  const status = (room?.sessions as { status?: string } | null)?.status;
  if (status === 'closed') {
    throw new Error('This session is closed — chat is read-only.');
  }
}

export async function sendSessionRoomMessage(input: {
  roomId: string;
  userId: string;
  displayName: string;
  body: string;
  isGuest: boolean;
  kind?: MessageKind;
  payload?: Record<string, unknown>;
}): Promise<ChatMessage> {
  const kind = input.kind ?? 'text';
  const body =
    input.body.trim() ||
    (kind === 'image'
      ? 'Photo'
      : kind === 'video'
        ? 'Video'
        : kind === 'arrival_card'
          ? 'When you arrive'
          : kind === 'wrap_card'
            ? 'Session wrap'
            : '');
  if (!body) throw new Error('Message cannot be empty');

  await assertSessionRoomAcceptsMessages(input.roomId, input.isGuest, kind);

  if (input.isGuest || !isSupabaseConfigured || input.roomId.startsWith('demo-')) {
    return mapMessage(
      sendDemoSessionRoomMessage({
        session_room_id: input.roomId,
        sender_id:
          kind === 'arrival_card' || kind === 'system' || kind === 'wrap_card'
            ? null
            : input.userId,
        sender_name:
          kind === 'arrival_card' || kind === 'system' || kind === 'wrap_card'
            ? 'Padel Nerdz'
            : input.displayName,
        body,
        kind,
        payload: input.payload,
      }),
      input.userId,
    );
  }

  const { data, error } = await getSupabaseLoose()
    .from('session_room_messages')
    .insert({
      session_room_id: input.roomId,
      sender_id: input.userId,
      body,
      kind,
      payload: input.payload ?? {},
    })
    .select('id, session_room_id, sender_id, body, kind, payload, created_at')
    .single();

  if (error) throw error;

  let roomHref = `/inbox`;
  try {
    const { data: room } = await getSupabaseLoose()
      .from('session_rooms')
      .select('id, sessions(group_id)')
      .eq('id', input.roomId)
      .maybeSingle();
    const groupId = (room?.sessions as { group_id?: string } | null)?.group_id;
    if (groupId) roomHref = `/group/${groupId}/session-room/${input.roomId}`;
  } catch {
    /* keep inbox fallback */
  }

  void requestRemoteChatPush({
    kind: 'session_room',
    channelId: input.roomId,
    messageId: data.id as string,
    title: input.displayName,
    body:
      kind === 'image' ? 'Photo' : kind === 'video' ? 'Video' : (data.body as string),
    href: roomHref,
    senderId: input.userId,
  });

  return {
    id: data.id as string,
    group_id: data.session_room_id as string,
    sender_id: data.sender_id as string | null,
    sender_name: input.displayName,
    body: data.body as string,
    kind: (data.kind as MessageKind) ?? 'text',
    payload: (data.payload as Record<string, unknown>) ?? {},
    created_at: data.created_at as string,
    mine: true,
  };
}
