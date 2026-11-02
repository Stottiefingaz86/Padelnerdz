/** Session attendance QR, player shows, organiser scans / enters code. */

function hashBits(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Short stable code (no secrets), proves session + player pairing. */
export function checkInCode(sessionId: string, userId: string): string {
  const n = hashBits(`${sessionId}:${userId}:pn-checkin`);
  return n.toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
}

export function checkInDeepLink(sessionId: string, userId: string): string {
  const code = checkInCode(sessionId, userId);
  return `padelnerdz://checkin/${sessionId}/${userId}/${code}`;
}

export function checkInQrImageUrl(sessionId: string, userId: string): string {
  const data = encodeURIComponent(checkInDeepLink(sessionId, userId));
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&bgcolor=0B0D10&color=C8FF2E&data=${data}`;
}

export type ParsedCheckIn = {
  sessionId: string;
  userId: string;
  code: string;
};

/** Accept deep link or bare 6-char code (needs sessionId when bare). */
export function parseCheckInInput(
  raw: string,
  fallbackSessionId?: string,
): ParsedCheckIn | null {
  const trimmed = raw.trim();
  const link = trimmed.match(
    /padelnerdz:\/\/checkin\/([^/]+)\/([^/]+)\/([A-Za-z0-9]+)/i,
  );
  if (link) {
    const sessionId = link[1]!;
    const userId = link[2]!;
    const code = link[3]!.toUpperCase();
    if (checkInCode(sessionId, userId) !== code) return null;
    return { sessionId, userId, code };
  }

  const bare = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (bare.length === 6 && fallbackSessionId) {
    return { sessionId: fallbackSessionId, userId: '', code: bare };
  }
  return null;
}

export function verifyCheckInCode(sessionId: string, userId: string, code: string): boolean {
  return checkInCode(sessionId, userId) === code.trim().toUpperCase();
}
