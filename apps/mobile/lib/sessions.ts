import type { SessionFormat } from '@padel-nerdz/domain';

import { AnalyticsEvents, track } from './analytics';
import { sendGroupMessage } from './chat';
import {
  closeDemoSession,
  createDemoSession,
  getDemoSession,
  listDemoRegistrations,
  listDemoRegistrationsAll,
  listDemoSessions,
  markDemoCheckIn,
  markDemoNoShow,
  offerDemoSpot,
  postDemoNeedPlayer,
  registerDemoSession,
  seedDemoRegistrants,
  selectDemoPlayers,
  verifyDemoPayment,
  withdrawDemoRegistration,
  type DemoRegistration,
  type DemoSession,
} from './demo-store';
import { PLATFORM_FEE_CENTS, priceBreakdown } from './pricing';
import { scheduleMixinReminder } from './push';
import { getSupabase, getSupabaseLoose, isSupabaseConfigured } from './supabase';

async function scheduleReminderForSession(sessionId: string) {
  try {
    const { data } = await getSupabaseLoose()
      .from('sessions')
      .select('id, title, starts_at')
      .eq('id', sessionId)
      .maybeSingle();
    if (!data?.starts_at) return;
    await scheduleMixinReminder({
      sessionId: data.id as string,
      title: (data.title as string) || 'Mix-in',
      startsAt: data.starts_at as string,
    });
  } catch (e) {
    console.warn('scheduleMixinReminder failed', e);
  }
}

export type SessionSummary = {
  id: string;
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
  registered_count: number;
  session_room_id: string | null;
  status?: 'open' | 'selected' | 'live' | 'done' | 'closed';
  wrap_media_url?: string | null;
};

export type RegistrantStatus =
  | 'registered'
  | 'waitlist'
  | 'selected'
  | 'payment_claimed'
  | 'paid'
  | 'cancelled'
  | 'no_show';

export type Registrant = {
  id: string;
  user_id: string;
  display_name: string;
  status: RegistrantStatus;
  reliability: number;
  payment_claimed_at?: string | null;
  checked_in_at?: string | null;
};

export type MyRegistrationState =
  | 'none'
  | 'interested'
  | 'waitlisted'
  | 'selected_pay'
  | 'awaiting_verify'
  | 'paid'
  | 'withdrawn';

function fromDemo(s: DemoSession): SessionSummary {
  return { ...s };
}

function fromDemoReg(r: DemoRegistration): Registrant {
  return {
    id: r.id,
    user_id: r.user_id,
    display_name: r.display_name,
    status: r.status,
    reliability: r.reliability,
    payment_claimed_at: r.payment_claimed_at ?? null,
    checked_in_at: r.checked_in_at ?? null,
  };
}

export function isLineupLockedStatus(status: RegistrantStatus) {
  return status === 'selected' || status === 'payment_claimed' || status === 'paid';
}

export async function listGroupSessions(
  groupId: string,
  isGuest: boolean,
): Promise<SessionSummary[]> {
  if (isGuest || !isSupabaseConfigured || groupId.startsWith('demo-')) {
    return listDemoSessions(groupId).map(fromDemo);
  }

  const { data, error } = await getSupabaseLoose()
    .from('sessions')
    .select(
      'id, group_id, title, starts_at, venue_label, format, courts, max_players, price_cents, commission_cents, banner_url, session_rooms(id)',
    )
    .eq('group_id', groupId)
    .order('starts_at', { ascending: true });

  if (error) throw error;

  const out: SessionSummary[] = [];
  for (const row of data ?? []) {
    const room = row.session_rooms as unknown as { id: string } | { id: string }[] | null;
    let roomId = Array.isArray(room) ? room[0]?.id ?? null : room?.id ?? null;
    if (!roomId) {
      const { data: roomRow } = await getSupabaseLoose()
        .from('session_rooms')
        .select('id')
        .eq('session_id', row.id)
        .maybeSingle();
      roomId = (roomRow?.id as string | undefined) ?? null;
    }
    const { count } = await getSupabaseLoose()
      .from('session_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', row.id)
      .neq('status', 'cancelled');

    const { data: regs } = await getSupabaseLoose()
      .from('session_registrations')
      .select('status')
      .eq('session_id', row.id)
      .in('status', ['selected', 'payment_claimed', 'paid']);
    const lineup = (regs?.length ?? 0) > 0;

    out.push({
      id: row.id as string,
      group_id: row.group_id as string,
      title: row.title as string,
      starts_at: row.starts_at as string,
      venue_label: (row.venue_label as string | null) ?? null,
      format: row.format as SessionFormat,
      courts: row.courts as number,
      max_players: row.max_players as number,
      price_cents: (row.price_cents as number | null) ?? null,
      commission_cents:
        (row as { commission_cents?: number | null }).commission_cents ?? PLATFORM_FEE_CENTS,
      banner_url: (row as { banner_url?: string | null }).banner_url ?? null,
      registered_count: count ?? 0,
      session_room_id: roomId,
      status: roomId ? 'live' : lineup ? 'selected' : 'open',
    });
  }
  return out;
}

export async function getSession(
  sessionId: string,
  isGuest: boolean,
): Promise<SessionSummary | null> {
  const sid = Array.isArray(sessionId) ? sessionId[0] : sessionId;
  if (!sid) return null;

  // Demo / offline first, also fallback if a live client still has demo-* ids.
  if (isGuest || !isSupabaseConfigured || sid.startsWith('demo-')) {
    const s = getDemoSession(sid);
    return s ? fromDemo(s) : null;
  }

  const { data, error } = await getSupabaseLoose()
    .from('sessions')
    .select(
      'id, group_id, title, starts_at, venue_label, format, courts, max_players, price_cents, commission_cents, banner_url, session_rooms(id)',
    )
    .eq('id', sid)
    .maybeSingle();
  if (error) throw error;

  // Soft fallback: signed-in users may still have local demo sessions in memory.
  if (!data) {
    const demo = getDemoSession(sid);
    return demo ? fromDemo(demo) : null;
  }

  const room = data.session_rooms as unknown as { id: string } | { id: string }[] | null;
  let roomId = Array.isArray(room) ? room[0]?.id ?? null : room?.id ?? null;
  // Embed can miss when RLS was tight, fetch room directly for paid/organiser access.
  if (!roomId) {
    const { data: roomRow } = await getSupabaseLoose()
      .from('session_rooms')
      .select('id')
      .eq('session_id', data.id)
      .maybeSingle();
    roomId = (roomRow?.id as string | undefined) ?? null;
  }
  const { count } = await getSupabaseLoose()
    .from('session_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', data.id)
    .neq('status', 'cancelled');
  const { data: lineupRegs } = await getSupabaseLoose()
    .from('session_registrations')
    .select('status')
    .eq('session_id', data.id)
    .in('status', ['selected', 'payment_claimed', 'paid']);
  const lineup = (lineupRegs?.length ?? 0) > 0;
  return {
    id: data.id as string,
    group_id: data.group_id as string,
    title: data.title as string,
    starts_at: data.starts_at as string,
    venue_label: (data.venue_label as string | null) ?? null,
    format: data.format as SessionFormat,
    courts: data.courts as number,
    max_players: data.max_players as number,
    price_cents: (data.price_cents as number | null) ?? null,
    commission_cents: (data.commission_cents as number | null) ?? PLATFORM_FEE_CENTS,
    banner_url: (data.banner_url as string | null | undefined) ?? null,
    registered_count: count ?? 0,
    session_room_id: roomId,
    status: roomId ? 'live' : lineup ? 'selected' : 'open',
  };
}

export async function createMixIn(input: {
  groupId: string;
  userId: string;
  displayName: string;
  isGuest: boolean;
  title: string;
  startsAt: string;
  venueLabel?: string;
  format: SessionFormat;
  courts: number;
  maxPlayers: number;
  priceCents?: number | null;
  commissionCents?: number;
  bannerUrl?: string | null;
}): Promise<SessionSummary> {
  if (input.isGuest || !isSupabaseConfigured || input.groupId.startsWith('demo-')) {
    const session = createDemoSession({
      group_id: input.groupId,
      title: input.title,
      starts_at: input.startsAt,
      venue_label: input.venueLabel ?? null,
      format: input.format,
      courts: input.courts,
      max_players: input.maxPlayers,
      price_cents: input.priceCents ?? null,
      commission_cents: input.commissionCents ?? PLATFORM_FEE_CENTS,
      banner_url: input.bannerUrl ?? null,
      created_by: input.userId,
      created_by_name: input.displayName,
    });
    // Seed fake registrants so organisers can practice selection in demo
    seedDemoRegistrants(session.id, input.groupId);
    // Organiser registers themselves so Confirm lineup isn’t empty of “you”
    registerDemoSession({
      sessionId: session.id,
      userId: input.userId,
      displayName: input.displayName,
      groupId: input.groupId,
    });
    track(AnalyticsEvents.sessionCreated, {
      group_id: input.groupId,
      session_id: session.id,
      source: 'demo',
    });
    return fromDemo(getDemoSession(session.id)!);
  }

  const { data: session, error } = await getSupabaseLoose()
    .from('sessions')
    .insert({
      group_id: input.groupId,
      title: input.title.trim(),
      starts_at: input.startsAt,
      venue_label: input.venueLabel?.trim() || null,
      format: input.format,
      courts: input.courts,
      max_players: input.maxPlayers,
      price_cents: input.priceCents ?? null,
      commission_cents: input.commissionCents ?? PLATFORM_FEE_CENTS,
      currency: 'EUR',
      banner_url: input.bannerUrl ?? null,
      created_by: input.userId,
    })
    .select(
      'id, group_id, title, starts_at, venue_label, format, courts, max_players, price_cents, commission_cents, banner_url',
    )
    .single();

  if (error) throw error;

  // Organiser is interested by default, they can still confirm lineup from Admin.
  try {
    await registerForSession({
      sessionId: session.id,
      groupId: input.groupId,
      userId: input.userId,
      displayName: input.displayName,
      isGuest: false,
    });
  } catch (e) {
    console.warn('Auto-register organiser failed', e);
    // Last-chance direct insert so create never leaves the host off the list.
    try {
      await getSupabaseLoose().from('session_registrations').upsert(
        {
          session_id: session.id,
          user_id: input.userId,
          status: 'registered',
        },
        { onConflict: 'session_id,user_id' },
      );
    } catch (e2) {
      console.warn('Organiser upsert fallback failed', e2);
    }
  }

  const playerTotal = totalChargeCents({
    price_cents: session.price_cents,
    commission_cents: session.commission_cents ?? PLATFORM_FEE_CENTS,
  });

  await sendGroupMessage({
    groupId: input.groupId,
    userId: input.userId,
    displayName: 'Padel Nerdz',
    isGuest: false,
    kind: 'mixin_card',
    body: `Mix-in open: ${session.title}`,
    payload: {
      session_id: session.id,
      title: session.title,
      starts_at: session.starts_at,
      venue_label: session.venue_label,
      format: session.format,
      banner_url: session.banner_url,
      max_players: session.max_players,
      courts: session.courts,
      price_cents: session.price_cents,
      commission_cents: session.commission_cents ?? PLATFORM_FEE_CENTS,
      /** Player-facing total (court + fee + IVA), what the card must show */
      player_total_cents: playerTotal,
    },
  });

  track(AnalyticsEvents.sessionCreated, {
    group_id: input.groupId,
    session_id: session.id,
    source: 'live',
  });

  void scheduleMixinReminder({
    sessionId: session.id,
    title: session.title,
    startsAt: session.starts_at,
  });

  return {
    ...session,
    format: session.format as SessionFormat,
    registered_count: 1,
    session_room_id: null,
    status: 'open',
  };
}

async function confirmOwnRegistration(sessionId: string, userId: string): Promise<boolean> {
  const { data } = await getSupabaseLoose()
    .from('session_registrations')
    .select('id, status')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();
  return Boolean(data && data.status !== 'cancelled');
}

export async function registerForSession(input: {
  sessionId: string;
  groupId: string;
  userId: string;
  displayName: string;
  isGuest: boolean;
}): Promise<void> {
  if (input.isGuest || !isSupabaseConfigured || input.sessionId.startsWith('demo-')) {
    registerDemoSession({
      sessionId: input.sessionId,
      userId: input.userId,
      displayName: input.displayName,
      groupId: input.groupId,
    });
    return;
  }

  if (!input.userId) {
    throw new Error('Sign in again, then register interest.');
  }

  // Make sure the JWT is on the client before SECURITY DEFINER checks auth.uid().
  const { data: authData } = await getSupabase().auth.getSession();
  if (!authData.session?.user?.id) {
    throw new Error('Sign in again, then register interest.');
  }

  // Prefer SECURITY DEFINER RPC, creator/organiser can always self-register to play.
  const { error: rpcError } = await getSupabaseLoose().rpc('register_interest_in_session', {
    p_session_id: input.sessionId,
  });

  if (!rpcError) {
    // Verify row exists, some clients get empty errors with success=false.
    if (await confirmOwnRegistration(input.sessionId, input.userId)) {
      await scheduleReminderForSession(input.sessionId);
      return;
    }
  }

  const rpcMsg = rpcError
    ? [rpcError.message, rpcError.details, rpcError.hint].filter(Boolean).join(', ')
    : '';

  // Already interested (or non-cancelled) counts as success
  if (/already|duplicate|unique/i.test(rpcMsg)) {
    await scheduleReminderForSession(input.sessionId);
    return;
  }
  if (await confirmOwnRegistration(input.sessionId, input.userId)) {
    await scheduleReminderForSession(input.sessionId);
    return;
  }

  // Direct insert/update fallback (covers missing RPC / cache lag)
  const { data: existing } = await getSupabaseLoose()
    .from('session_registrations')
    .select('id, status')
    .eq('session_id', input.sessionId)
    .eq('user_id', input.userId)
    .maybeSingle();

  if (existing && existing.status !== 'cancelled') {
    await scheduleReminderForSession(input.sessionId);
    return;
  }

  if (existing?.status === 'cancelled') {
    const { error: upErr } = await getSupabaseLoose()
      .from('session_registrations')
      .update({ status: 'registered' })
      .eq('id', existing.id);
    if (!upErr) {
      await scheduleReminderForSession(input.sessionId);
      return;
    }
  } else {
    const { error } = await getSupabaseLoose().from('session_registrations').insert({
      session_id: input.sessionId,
      user_id: input.userId,
      status: 'registered',
    });
    if (!error) {
      await scheduleReminderForSession(input.sessionId);
      return;
    }

    const msg = [error.message, error.details, error.hint].filter(Boolean).join(', ');
    if (/already|duplicate|unique/i.test(msg)) {
      await scheduleReminderForSession(input.sessionId);
      return;
    }
    if (/row-level security|42501|permission/i.test(msg) || /not a group member/i.test(rpcMsg)) {
      throw new Error(
        'You must be a group member to register. Leave and rejoin the group, or ask an admin.',
      );
    }
    if (/foreign key|session not found/i.test(msg) || /session not found/i.test(rpcMsg)) {
      throw new Error('This mix-in couldn’t be found. Open Admin and try again.');
    }
    throw new Error(msg || rpcMsg || 'Could not register interest');
  }

  if (/not authenticated/i.test(rpcMsg)) {
    throw new Error('Sign in again, then register interest.');
  }
  throw new Error(rpcMsg || 'Could not register interest');
}

export async function listRegistrants(
  sessionId: string,
  groupId: string,
  isGuest: boolean,
  opts?: { includeCancelled?: boolean },
): Promise<Registrant[]> {
  if (isGuest || !isSupabaseConfigured || sessionId.startsWith('demo-')) {
    const source = opts?.includeCancelled
      ? listDemoRegistrationsAll(sessionId)
      : listDemoRegistrations(sessionId);
    return source.map(fromDemoReg);
  }

  // Loose client + no embeds, joins were wiping the Admin interest list.
  // Prefer checked_in_at; fall back if migration not applied yet.
  let data: unknown[] | null = null;
  {
    const withCheckIn = await getSupabaseLoose()
      .from('session_registrations')
      .select('id, user_id, status, payment_claimed_at, checked_in_at')
      .eq('session_id', sessionId);
    if (!withCheckIn.error) {
      data = withCheckIn.data;
    } else {
      const fallback = await getSupabaseLoose()
        .from('session_registrations')
        .select('id, user_id, status, payment_claimed_at')
        .eq('session_id', sessionId);
      if (fallback.error) {
        throw new Error(fallback.error.message || 'Could not load players');
      }
      data = fallback.data;
    }
  }

  const rows = ((data ?? []) as Array<{
    id: string;
    user_id: string;
    status: string;
    payment_claimed_at: string | null;
    checked_in_at?: string | null;
  }>).filter((r) => (opts?.includeCancelled ? true : r.status !== 'cancelled'));
  if (rows.length === 0) return [];

  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const nameById = new Map<string, string>();
  const relById = new Map<string, number>();
  try {
    const { data: profiles } = await getSupabaseLoose()
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds);
    for (const p of profiles ?? []) {
      const name = (p.display_name as string | null)?.trim();
      if (name) nameById.set(p.id as string, name);
    }
  } catch {
    // Names optional
  }
  try {
    const { data: rels, error: relError } = await getSupabaseLoose()
      .from('player_reliability')
      .select('user_id, sessions_played, no_shows')
      .in('user_id', userIds);
    if (!relError) {
      for (const rel of rels ?? []) {
        const attended = (rel.sessions_played as number | undefined) ?? 0;
        const noShows = (rel.no_shows as number | undefined) ?? 0;
        const total = attended + noShows;
        relById.set(
          rel.user_id as string,
          total === 0 ? 0 : Math.round((attended / total) * 100),
        );
      }
    }
  } catch {
    // Reliability optional
  }

  return rows
    .map((row) => ({
      id: row.id,
      user_id: row.user_id,
      display_name: nameById.get(row.user_id) || 'Player',
      status: row.status as Registrant['status'],
      reliability: relById.get(row.user_id) ?? 0,
      payment_claimed_at: row.payment_claimed_at ?? null,
      checked_in_at: row.checked_in_at ?? null,
    }))
    .sort((a, b) => b.reliability - a.reliability);
}

export function registrationStateForUser(
  regs: Registrant[],
  userId: string,
): MyRegistrationState {
  const mine = regs.find((r) => r.user_id === userId);
  if (!mine) return 'none';
  if (mine.status === 'paid') return 'paid';
  if (mine.status === 'payment_claimed') return 'awaiting_verify';
  if (mine.status === 'selected') return 'selected_pay';
  if (mine.status === 'waitlist') return 'waitlisted';
  if (mine.status === 'registered') return 'interested';
  if (mine.status === 'cancelled') return 'withdrawn';
  return 'none';
}

/** Player pulls out with notice. No in-app refund for paid spots. */
export async function withdrawFromSession(input: {
  sessionId: string;
  groupId: string;
  userId: string;
  displayName: string;
  isGuest: boolean;
  reason?: string;
}): Promise<{ wasPaid: boolean; wasSelected: boolean }> {
  if (input.isGuest || !isSupabaseConfigured || input.sessionId.startsWith('demo-')) {
    return withdrawDemoRegistration(input);
  }

  const { data: existing } = await getSupabase()
    .from('session_registrations')
    .select('status')
    .eq('session_id', input.sessionId)
    .eq('user_id', input.userId)
    .maybeSingle();

  if (!existing) throw new Error('You’re not registered for this mix-in');
  const status = existing.status as RegistrantStatus;
  if (status === 'cancelled' || status === 'no_show') {
    throw new Error('You’re already out of this mix-in');
  }

  const wasPaid = status === 'paid';
  const wasSelected =
    status === 'selected' || status === 'payment_claimed' || wasPaid;

  const { error } = await getSupabase()
    .from('session_registrations')
    .update({ status: 'cancelled' })
    .eq('session_id', input.sessionId)
    .eq('user_id', input.userId);
  if (error) throw error;

  const reasonBit = input.reason?.trim() ? ` (${input.reason.trim()})` : '';
  const moneyBit = wasPaid
    ? ' Payment stays as settled outside the app unless you arrange otherwise.'
    : '';

  await sendGroupMessage({
    groupId: input.groupId,
    userId: input.userId,
    displayName: 'Padel Nerdz',
    isGuest: false,
    kind: 'system',
    body: `${input.displayName} can’t make it${reasonBit}, spot open.${moneyBit}`,
    payload: {
      event: 'player_withdrew',
      session_id: input.sessionId,
      user_id: input.userId,
      was_paid: wasPaid,
      was_selected: wasSelected,
    },
  });

  return { wasPaid, wasSelected };
}

/** Organiser offers an open court spot to a waitlisted / interested player. */
export async function offerSessionSpot(input: {
  sessionId: string;
  groupId: string;
  replacementUserId: string;
  organiserId: string;
  isGuest: boolean;
}): Promise<{ name: string }> {
  if (input.isGuest || !isSupabaseConfigured || input.sessionId.startsWith('demo-')) {
    return offerDemoSpot(input);
  }

  const regs = await listRegistrants(input.sessionId, input.groupId, false);
  const target = regs.find((r) => r.user_id === input.replacementUserId);
  // Also allow cancelled (withdrew earlier) to be re-offered via upsert
  const { data: row } = await getSupabase()
    .from('session_registrations')
    .select('id, status')
    .eq('session_id', input.sessionId)
    .eq('user_id', input.replacementUserId)
    .maybeSingle();

  if (!row && !target) throw new Error('Pick someone from the interest / waitlist');

  const session = await getSession(input.sessionId, false);
  const filled = regs.filter((r) => r.status === 'paid' || r.status === 'selected').length;
  if (session && filled >= session.max_players) {
    throw new Error('Lineup is full, withdraw someone first');
  }

  if (row) {
    const { error } = await getSupabase()
      .from('session_registrations')
      .update({ status: 'selected' })
      .eq('id', row.id);
    if (error) throw error;
  } else {
    const { error } = await getSupabase().from('session_registrations').insert({
      session_id: input.sessionId,
      user_id: input.replacementUserId,
      status: 'selected',
    });
    if (error) throw error;
  }

  const name = target?.display_name ?? 'Player';
  await sendGroupMessage({
    groupId: input.groupId,
    userId: input.organiserId,
    displayName: 'Padel Nerdz',
    isGuest: false,
    kind: 'accept_notice',
    body: `Spot offered to ${name}`,
    payload: {
      session_id: input.sessionId,
      selected: [name],
      selected_ids: [input.replacementUserId],
      phase: 'spot_offered',
      title: session?.title ?? 'Mix-in',
    },
  });

  return { name };
}

/** Organiser posts that the mix-in still needs players. */
export async function postNeedPlayer(input: {
  sessionId: string;
  groupId: string;
  organiserId: string;
  organiserName: string;
  isGuest: boolean;
  spots?: number;
}): Promise<void> {
  if (input.isGuest || !isSupabaseConfigured || input.sessionId.startsWith('demo-')) {
    postDemoNeedPlayer({
      sessionId: input.sessionId,
      groupId: input.groupId,
      organiserName: input.organiserName,
      spots: input.spots,
    });
    return;
  }

  const session = await getSession(input.sessionId, false);
  const spots = input.spots ?? 1;
  await sendGroupMessage({
    groupId: input.groupId,
    userId: input.organiserId,
    displayName: 'Padel Nerdz',
    isGuest: false,
    kind: 'system',
    body: `Need ${spots} more player${spots === 1 ? '' : 's'} for ${session?.title ?? 'the mix-in'}, register interest or message the organiser.`,
    payload: {
      event: 'need_player',
      session_id: input.sessionId,
      spots,
      posted_by: input.organiserName,
    },
  });
}

export async function selectPlayersForSession(input: {
  sessionId: string;
  groupId: string;
  organiserId: string;
  displayName: string;
  selectedUserIds: string[];
  isGuest: boolean;
}): Promise<{ selectedNames: string[] }> {
  if (input.isGuest || !isSupabaseConfigured || input.sessionId.startsWith('demo-')) {
    const result = selectDemoPlayers({
      sessionId: input.sessionId,
      groupId: input.groupId,
      selectedUserIds: input.selectedUserIds,
      organiserId: input.organiserId,
    });
    return { selectedNames: result.selectedNames };
  }

  const regs = await listRegistrants(input.sessionId, input.groupId, false);
  for (const reg of regs) {
    const status = input.selectedUserIds.includes(reg.user_id) ? 'selected' : 'waitlist';
    const { error } = await getSupabaseLoose()
      .from('session_registrations')
      .update({ status })
      .eq('id', reg.id);
    if (error) throw error;
  }

  const selectedNames = regs
    .filter((r) => input.selectedUserIds.includes(r.user_id))
    .map((r) => r.display_name);

  const session = await getSession(input.sessionId, false);

  // Main chat: short accept notice only, no payment spam
  await sendGroupMessage({
    groupId: input.groupId,
    userId: input.organiserId,
    displayName: 'Padel Nerdz',
    isGuest: false,
    kind: 'accept_notice',
    body: `Lineup set for ${session?.title ?? 'mix-in'}`,
    payload: {
      session_id: input.sessionId,
      selected: selectedNames,
      selected_ids: input.selectedUserIds,
      phase: 'lineup_set',
      title: session?.title ?? 'Mix-in',
    },
  });

  return { selectedNames };
}

/**
 * @deprecated Honour-claim removed, places unlock only via Stripe PaymentSheet + webhook.
 */
export async function claimSessionPayment(_input: {
  sessionId: string;
  groupId: string;
  userId: string;
  displayName: string;
  isGuest: boolean;
}): Promise<{ sessionRoomId: string | null }> {
  throw new Error('Pay in-app with Stripe, honour claims are disabled.');
}

/** @deprecated Honour reject removed, Stripe is the only pay path. */
export async function rejectPaymentClaim(_input: {
  sessionId: string;
  groupId: string;
  playerUserId: string;
  organiserId: string;
  isGuest: boolean;
}): Promise<void> {
  throw new Error('Manual payment verify is disabled. Players pay with Stripe.');
}

/**
 * @deprecated Organiser bank-verify removed, paid status is set by Stripe webhook only.
 * Demo mode still unlocks for offline testing.
 */
export async function verifySessionPayment(input: {
  sessionId: string;
  groupId: string;
  playerUserId: string;
  playerDisplayName: string;
  organiserId: string;
  isGuest: boolean;
}): Promise<{ sessionRoomId: string }> {
  if (input.isGuest || !isSupabaseConfigured || input.sessionId.startsWith('demo-')) {
    return verifyDemoPayment({
      sessionId: input.sessionId,
      groupId: input.groupId,
      userId: input.playerUserId,
      displayName: input.playerDisplayName,
      organiserId: input.organiserId,
    });
  }
  throw new Error(
    'Manual verify is disabled. Players pay in-app with Stripe, the place unlocks automatically.',
  );
}

/**
 * Paid players (and organisers) get session-room membership so chat unlocks.
 * Safe to call repeatedly, upserts membership when a room already exists.
 */
export async function ensurePaidSessionRoomAccess(input: {
  sessionId: string;
  userId: string;
  isGuest: boolean;
}): Promise<string | null> {
  if (input.isGuest || !isSupabaseConfigured || input.sessionId.startsWith('demo-')) {
    const s = getDemoSession(input.sessionId);
    return s?.session_room_id ?? null;
  }

  const { data: room } = await getSupabaseLoose()
    .from('session_rooms')
    .select('id')
    .eq('session_id', input.sessionId)
    .maybeSingle();
  if (!room?.id) return null;

  const roomId = room.id as string;

  const { data: reg } = await getSupabaseLoose()
    .from('session_registrations')
    .select('status')
    .eq('session_id', input.sessionId)
    .eq('user_id', input.userId)
    .maybeSingle();

  const status = reg?.status as RegistrantStatus | undefined;
  if (status === 'paid') {
    const { error } = await getSupabaseLoose().from('session_room_members').upsert(
      { session_room_id: roomId, user_id: input.userId },
      { onConflict: 'session_room_id,user_id', ignoreDuplicates: true },
    );
    if (error && !/duplicate|unique/i.test(error.message)) {
      console.warn('ensurePaidSessionRoomAccess membership', error.message);
    }
  }

  return roomId;
}

export async function closeSession(input: {
  sessionId: string;
  groupId: string;
  organiserId: string;
  isGuest: boolean;
  wrapMediaUrl?: string | null;
}): Promise<SessionSummary> {
  const { buildWrapDeck, wrapDeckToPayload } = await import('./wrap');

  if (input.isGuest || !isSupabaseConfigured || input.sessionId.startsWith('demo-')) {
    const sessionPreview = await getSession(input.sessionId, true);
    let wrapPayload: Record<string, unknown> | null = null;
    try {
      const deck = await buildWrapDeck({
        sessionId: input.sessionId,
        groupId: input.groupId,
        userId: input.organiserId,
        isGuest: true,
        session: sessionPreview,
      });
      wrapPayload = wrapDeckToPayload(deck);
    } catch (e) {
      console.warn('closeSession wrap deck', e);
    }
    const photo = Array.isArray(wrapPayload?.slides)
      ? (wrapPayload!.slides as Array<{ kind?: string; uri?: string }>).find(
          (s) => s.kind === 'photo',
        )
      : null;
    return fromDemo(
      closeDemoSession({
        sessionId: input.sessionId,
        groupId: input.groupId,
        organiserId: input.organiserId,
        wrapMediaUrl: input.wrapMediaUrl ?? photo?.uri ?? null,
        wrapPayload,
      }),
    );
  }

  const session = await getSession(input.sessionId, false);
  if (!session) throw new Error('Session not found');

  let deckPayload: Record<string, unknown> = {
    session_id: input.sessionId,
    title: session.title,
    player_count: 0,
  };
  try {
    const deck = await buildWrapDeck({
      sessionId: input.sessionId,
      groupId: input.groupId,
      userId: input.organiserId,
      isGuest: false,
      session,
    });
    deckPayload = wrapDeckToPayload(deck);
  } catch (e) {
    console.warn('closeSession wrap deck', e);
  }

  const photoSlide = Array.isArray(deckPayload.slides)
    ? (deckPayload.slides as Array<{ kind?: string; uri?: string }>).find((s) => s.kind === 'photo')
    : null;
  const wrapUri = input.wrapMediaUrl ?? photoSlide?.uri ?? null;

  await getSupabaseLoose()
    .from('sessions')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      wrap_media_url: wrapUri,
    })
    .eq('id', input.sessionId);

  try {
    const { awardSessionClosedPlayed } = await import('./points');
    await awardSessionClosedPlayed({ sessionId: input.sessionId, isGuest: false });
  } catch (e) {
    console.warn('closeSession point awards', e);
  }

  const wrapPayload = {
    ...deckPayload,
    media_url: wrapUri,
    closed_at: new Date().toISOString(),
  };

  await sendGroupMessage({
    groupId: input.groupId,
    userId: input.organiserId,
    displayName: 'Padel Nerdz',
    isGuest: false,
    kind: 'wrap_card',
    body: `Wrap-up: ${session.title}`,
    payload: wrapPayload,
  });

  if (session.session_room_id) {
    try {
      const { sendSessionRoomMessage } = await import('./chat');
      await sendSessionRoomMessage({
        roomId: session.session_room_id,
        userId: input.organiserId,
        displayName: 'Padel Nerdz',
        isGuest: false,
        kind: 'wrap_card',
        body: `Wrap-up: ${session.title}`,
        payload: wrapPayload,
      });
      await sendSessionRoomMessage({
        roomId: session.session_room_id,
        userId: input.organiserId,
        displayName: 'Padel Nerdz',
        isGuest: false,
        kind: 'system',
        body: 'Session closed, this chat is now read-only.',
      });
    } catch (e) {
      console.warn('closeSession session-room wrap', e);
    }
  }

  return { ...session, status: 'closed', wrap_media_url: wrapUri };
}

/** What the player pays, court + fixed €1 fee + IVA on the fee. */
export function totalChargeCents(session: {
  price_cents: number | null;
  commission_cents?: number | null;
}) {
  return priceBreakdown(
    session.price_cents,
    session.commission_cents ?? PLATFORM_FEE_CENTS,
  ).playerTotalCents;
}

/** Platform take (fee + IVA), owner dashboard only, never shown in player UI. */
export function platformTakeCents(session: {
  price_cents: number | null;
  commission_cents?: number | null;
}) {
  return priceBreakdown(
    session.price_cents,
    session.commission_cents ?? PLATFORM_FEE_CENTS,
  ).platformTakeCents;
}

/** Organiser marks a player as did-not-show, reliability drops. */
export async function markSessionNoShow(input: {
  sessionId: string;
  groupId: string;
  userId: string;
  isGuest: boolean;
}): Promise<Registrant | null> {
  if (input.isGuest || !isSupabaseConfigured || input.sessionId.startsWith('demo-')) {
    const reg = markDemoNoShow({
      sessionId: input.sessionId,
      groupId: input.groupId,
      userId: input.userId,
    });
    return reg ? fromDemoReg(reg) : null;
  }

  const { error } = await getSupabaseLoose()
    .from('session_registrations')
    .update({ status: 'no_show' })
    .eq('session_id', input.sessionId)
    .eq('user_id', input.userId);
  if (error) throw error;

  try {
    const { awardPointEvent } = await import('./points');
    await awardPointEvent({
      groupId: input.groupId,
      userId: input.userId,
      kind: 'no_show',
      sessionId: input.sessionId,
      isGuest: false,
    });
  } catch (e) {
    console.warn('award no_show', e);
  }

  const regs = await listRegistrants(input.sessionId, input.groupId, false);
  return regs.find((r) => r.user_id === input.userId) ?? null;
}

export async function markSessionCheckIn(input: {
  sessionId: string;
  groupId: string;
  userId: string;
  isGuest: boolean;
}): Promise<Registrant | null> {
  if (input.isGuest || !isSupabaseConfigured || input.sessionId.startsWith('demo-')) {
    const reg = markDemoCheckIn({
      sessionId: input.sessionId,
      userId: input.userId,
    });
    return reg ? fromDemoReg(reg) : null;
  }

  const { error } = await getSupabaseLoose()
    .from('session_registrations')
    .update({ checked_in_at: new Date().toISOString() })
    .eq('session_id', input.sessionId)
    .eq('user_id', input.userId)
    .eq('status', 'paid');
  if (error) {
    const missingCol =
      error.code === '42703' || /checked_in_at/i.test(error.message ?? '');
    if (missingCol) {
      throw new Error(
        'Check-in isn’t set up on this project yet, apply the check-in migration.',
      );
    }
    throw new Error(error.message || 'Check-in failed');
  }

  const regs = await listRegistrants(input.sessionId, input.groupId, false);
  return regs.find((r) => r.user_id === input.userId) ?? null;
}

/** Resolve a bare check-in code against paid players for a session. */
export async function findRegistrantByCheckInCode(input: {
  sessionId: string;
  groupId: string;
  code: string;
  isGuest: boolean;
}): Promise<Registrant | null> {
  const { checkInCode } = await import('./check-in');
  const regs = await listRegistrants(input.sessionId, input.groupId, input.isGuest);
  const paid = regs.filter((r) => r.status === 'paid');
  const needle = input.code.trim().toUpperCase();
  return paid.find((r) => checkInCode(input.sessionId, r.user_id) === needle) ?? null;
}

export type MixinHistoryItem = {
  session_id: string;
  group_id: string;
  title: string;
  starts_at: string;
  venue_label: string | null;
  status: RegistrantStatus;
  session_room_id: string | null;
};

/** Every mix-in this player registered / played, for profile journey. */
export async function listMyMixinHistory(
  userId: string,
  isGuest: boolean,
): Promise<MixinHistoryItem[]> {
  if (isGuest || !isSupabaseConfigured || userId === 'guest' || userId.startsWith('local_')) {
    const {
      listDemoMemberships,
      listDemoSessions,
      listDemoRegistrationsAll: allRegs,
    } = await import('./demo-store');
    const out: MixinHistoryItem[] = [];
    for (const g of listDemoMemberships()) {
      for (const s of listDemoSessions(g.id)) {
        const reg = allRegs(s.id).find((r) => r.user_id === userId || r.user_id === 'guest');
        if (!reg || reg.status === 'cancelled') continue;
        out.push({
          session_id: s.id,
          group_id: s.group_id,
          title: s.title,
          starts_at: s.starts_at,
          venue_label: s.venue_label,
          status: reg.status,
          session_room_id: s.session_room_id,
        });
      }
    }
    return out.sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  }

  const { data, error } = await getSupabaseLoose()
    .from('session_registrations')
    .select(
      'status, session_id, sessions(id, group_id, title, starts_at, venue_label, session_rooms(id))',
    )
    .eq('user_id', userId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(80);

  if (error) throw error;

  const out: MixinHistoryItem[] = [];
  for (const row of data ?? []) {
    const s = row.sessions as unknown as {
      id: string;
      group_id: string;
      title: string;
      starts_at: string;
      venue_label: string | null;
      session_rooms: { id: string } | { id: string }[] | null;
    } | null;
    if (!s) continue;
    const room = Array.isArray(s.session_rooms) ? s.session_rooms[0] : s.session_rooms;
    out.push({
      session_id: s.id,
      group_id: s.group_id,
      title: s.title,
      starts_at: s.starts_at,
      venue_label: s.venue_label,
      status: row.status as RegistrantStatus,
      session_room_id: room?.id ?? null,
    });
  }
  return out.sort((a, b) => b.starts_at.localeCompare(a.starts_at));
}
