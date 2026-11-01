import { listGroupMessages, listSessionRoomMessages, type ChatMessage } from './chat';
import { getSessionFixtures } from './fixtures';
import { resolveMediaDisplayUrl } from './media';
import {
  getSession,
  listRegistrants,
  type Registrant,
  type SessionSummary,
} from './sessions';

export type WrapSlide =
  | {
      id: string;
      kind: 'cover';
      title: string;
      subtitle: string;
      venue?: string | null;
      when: string;
      format?: string | null;
    }
  | {
      id: string;
      kind: 'squad';
      title: string;
      players: Array<{ name: string; reliability?: number }>;
    }
  | {
      id: string;
      kind: 'fixtures';
      title: string;
      round: number;
      matches: Array<{ label: string; teamA: string; teamB: string; score?: string }>;
    }
  | {
      id: string;
      kind: 'photo';
      title: string;
      uri: string;
      caption?: string;
    }
  | {
      id: string;
      kind: 'chat_shared';
      title: string;
      subtitle: string;
      photos: Array<{ uri: string; sender: string }>;
      quotes: Array<{ body: string; sender: string }>;
    }
  | {
      id: string;
      kind: 'quote';
      title: string;
      body: string;
      sender: string;
    }
  | {
      id: string;
      kind: 'finale';
      title: string;
      subtitle: string;
      playerCount: number;
      photoCount: number;
      matchCount: number;
    };

export type WrapDeck = {
  sessionId: string;
  groupId: string;
  title: string;
  slides: WrapSlide[];
  coverAccent: string;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sideNames(side: {
  player_a: { display_name: string };
  player_b: { display_name: string };
}) {
  return `${side.player_a.display_name} & ${side.player_b.display_name}`;
}

function pickPlayers(regs: Registrant[]) {
  return regs
    .filter((r) => r.status === 'paid' || r.status === 'selected' || r.status === 'no_show')
    .map((r) => ({
      name: r.display_name,
      reliability: r.reliability > 0 ? r.reliability : undefined,
    }));
}

async function resolvePhotoUri(msg: ChatMessage): Promise<string | null> {
  const path = typeof msg.payload.path === 'string' ? msg.payload.path : null;
  const uri = typeof msg.payload.uri === 'string' ? msg.payload.uri : null;
  const mediaUrl = typeof msg.payload.media_url === 'string' ? msg.payload.media_url : null;
  return resolveMediaDisplayUrl(path || uri || mediaUrl);
}

async function collectChatMedia(
  msgs: ChatMessage[],
): Promise<{
  photos: Array<{ id: string; uri: string; sender: string }>;
  quotes: Array<{ id: string; body: string; sender: string }>;
}> {
  const imageMsgs = msgs.filter((m) => m.kind === 'image');
  const photos: Array<{ id: string; uri: string; sender: string }> = [];
  for (const m of imageMsgs) {
    const uri = await resolvePhotoUri(m);
    if (!uri) continue;
    photos.push({ id: m.id, uri, sender: m.sender_name });
  }

  const quotes = msgs
    .filter(
      (m) =>
        m.kind === 'text' &&
        m.body.trim().length >= 8 &&
        m.body.trim().length <= 160 &&
        !m.mine,
    )
    .slice(-6)
    .map((m) => ({
      id: m.id,
      body: m.body.trim(),
      sender: m.sender_name,
    }));

  return { photos, quotes };
}

/**
 * Build a Spotify/Instagram-story style deck from session players, fixtures, and chat media.
 */
export async function buildWrapDeck(input: {
  sessionId: string;
  groupId: string;
  userId: string;
  isGuest: boolean;
  session?: SessionSummary | null;
}): Promise<WrapDeck> {
  const session =
    input.session ?? (await getSession(input.sessionId, input.isGuest));
  if (!session) throw new Error('Session not found');

  const [regs, fixtures] = await Promise.all([
    listRegistrants(input.sessionId, input.groupId, input.isGuest),
    getSessionFixtures(input.sessionId, input.isGuest),
  ]);

  const players = pickPlayers(regs);
  const slides: WrapSlide[] = [];

  slides.push({
    id: 'cover',
    kind: 'cover',
    title: session.title,
    subtitle: 'Session wrap',
    venue: session.venue_label,
    when: formatWhen(session.starts_at),
    format: session.format,
  });

  if (players.length > 0) {
    slides.push({
      id: 'squad',
      kind: 'squad',
      title: `${players.length} on court`,
      players,
    });
  }

  if (fixtures && fixtures.matches.length > 0) {
    slides.push({
      id: 'fixtures',
      kind: 'fixtures',
      title: `Round ${fixtures.round}`,
      round: fixtures.round,
      matches: fixtures.matches.map((m) => ({
        label: m.label,
        teamA: sideNames(m.team_a),
        teamB: sideNames(m.team_b),
        score:
          m.score_a != null && m.score_b != null
            ? `${m.score_a} – ${m.score_b}`
            : undefined,
      })),
    });
  }

  const photoIds = new Set<string>();
  let allPhotos: Array<{ id: string; uri: string; sender: string }> = [];
  let allQuotes: Array<{ id: string; body: string; sender: string }> = [];

  if (session.session_room_id) {
    try {
      const roomMsgs = await listSessionRoomMessages(
        session.session_room_id,
        input.userId,
        input.isGuest,
      );
      const room = await collectChatMedia(roomMsgs);
      allPhotos = room.photos;
      allQuotes = room.quotes;
    } catch {
      /* chat optional */
    }
  }

  // Also pull group-chat photos tagged to this session or shared around session day
  try {
    const groupMsgs = await listGroupMessages(input.groupId, input.userId, input.isGuest);
    const start = new Date(session.starts_at).getTime();
    const windowStart = start - 12 * 60 * 60 * 1000;
    const windowEnd = start + 36 * 60 * 60 * 1000;
    const related = groupMsgs.filter((m) => {
      if (m.kind !== 'image' && m.kind !== 'text') return false;
      const sid = m.payload.session_id;
      if (sid && String(sid) === input.sessionId) return true;
      const t = new Date(m.created_at).getTime();
      return t >= windowStart && t <= windowEnd;
    });
    const group = await collectChatMedia(related);
    for (const p of group.photos) {
      if (!photoIds.has(p.id) && !allPhotos.some((x) => x.uri === p.uri)) {
        allPhotos.push(p);
      }
    }
    for (const q of group.quotes) {
      if (!allQuotes.some((x) => x.id === q.id)) allQuotes.push(q);
    }
  } catch {
    /* optional */
  }

  for (const p of allPhotos) photoIds.add(p.id);

  // Individual photo slides (up to 8)
  for (const p of allPhotos.slice(-8)) {
    slides.push({
      id: `photo-${p.id}`,
      kind: 'photo',
      title: p.sender,
      uri: p.uri,
      caption: 'From the chat',
    });
  }

  if (allPhotos.length > 0 || allQuotes.length > 0) {
    slides.push({
      id: 'chat-shared',
      kind: 'chat_shared',
      title: 'Shared in chat',
      subtitle:
        allPhotos.length > 0
          ? `${allPhotos.length} photo${allPhotos.length === 1 ? '' : 's'} from the session`
          : 'Moments from the room',
      photos: allPhotos.slice(-9).map((p) => ({ uri: p.uri, sender: p.sender })),
      quotes: allQuotes.slice(-4).map((q) => ({ body: q.body, sender: q.sender })),
    });
  }

  // Standalone quotes only if we didn't already show chat_shared with them
  if (allPhotos.length === 0) {
    for (const q of allQuotes.slice(-3)) {
      slides.push({
        id: `quote-${q.id}`,
        kind: 'quote',
        title: 'Chat moment',
        body: q.body,
        sender: q.sender,
      });
    }
  }

  const photoCount = allPhotos.length;

  slides.push({
    id: 'finale',
    kind: 'finale',
    title: 'That’s a wrap',
    subtitle: session.title,
    playerCount: players.length,
    photoCount,
    matchCount: fixtures?.matches.length ?? 0,
  });

  if (slides.length < 2) {
    slides.push({
      id: 'finale-fallback',
      kind: 'finale',
      title: 'That’s a wrap',
      subtitle: session.title,
      playerCount: players.length,
      photoCount: 0,
      matchCount: 0,
    });
  }

  return {
    sessionId: session.id,
    groupId: input.groupId,
    title: session.title,
    slides,
    coverAccent: '#C8FF2E',
  };
}

export function wrapDeckToPayload(deck: WrapDeck) {
  return {
    session_id: deck.sessionId,
    title: deck.title,
    player_count: deck.slides.find((s) => s.kind === 'finale')
      ? (deck.slides.find((s) => s.kind === 'finale') as Extract<WrapSlide, { kind: 'finale' }>)
          .playerCount
      : 0,
    photo_count: deck.slides.filter((s) => s.kind === 'photo').length,
    match_count: deck.slides
      .filter((s) => s.kind === 'fixtures')
      .reduce((n, s) => n + (s.kind === 'fixtures' ? s.matches.length : 0), 0),
    slides: deck.slides,
    cover_accent: deck.coverAccent,
  };
}
