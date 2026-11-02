import AsyncStorage from '@react-native-async-storage/async-storage';

import { AnalyticsEvents, track } from './analytics';
import { loadLocalAccount } from './local-account';
import { priceBreakdown } from './pricing';

const LEDGER_KEY = 'pn.ownerPaymentLedger.v1';

export type PaymentLedgerEntry = {
  id: string;
  at: string;
  sessionId: string;
  groupId: string;
  userId: string;
  displayName: string;
  courtCents: number;
  platformTakeCents: number;
  playerTotalCents: number;
  method: string;
};

export type OwnerMetrics = {
  signups: number;
  paymentsCount: number;
  grossPlayerVolumeCents: number;
  commissionNetCents: number;
  commissionIvaCents: number;
  commissionGrossCents: number;
  recentPayments: PaymentLedgerEntry[];
  note: string;
};

async function loadLedger(): Promise<PaymentLedgerEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(LEDGER_KEY);
    return raw ? (JSON.parse(raw) as PaymentLedgerEntry[]) : [];
  } catch {
    return [];
  }
}

async function saveLedger(entries: PaymentLedgerEntry[]) {
  await AsyncStorage.setItem(LEDGER_KEY, JSON.stringify(entries.slice(0, 500)));
}

/** Player tapped “I’ve paid” ,  honour claim only (not bank-verified). */
export function recordPaymentClaim(input: {
  sessionId: string;
  groupId: string;
  method?: string;
}) {
  track(AnalyticsEvents.paymentClaimed, {
    session_id: input.sessionId,
    group_id: input.groupId,
    method: input.method ?? 'manual',
  });
}

/** Organiser confirmed money in Bizum/Revolut ,  counts as a real confirmed payment. */
export async function recordOwnerPayment(input: {
  sessionId: string;
  groupId: string;
  userId: string;
  displayName: string;
  courtCents: number;
  feeCents?: number;
  method?: string;
}) {
  const breakdown = priceBreakdown(input.courtCents, input.feeCents);
  const entry: PaymentLedgerEntry = {
    id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    sessionId: input.sessionId,
    groupId: input.groupId,
    userId: input.userId,
    displayName: input.displayName,
    courtCents: breakdown.courtCents,
    platformTakeCents: breakdown.platformTakeCents,
    playerTotalCents: breakdown.playerTotalCents,
    method: input.method ?? 'manual',
  };
  const current = await loadLedger();
  const without = current.filter(
    (e) => !(e.sessionId === input.sessionId && e.userId === input.userId),
  );
  await saveLedger([entry, ...without]);
  track(AnalyticsEvents.paymentConfirmed, {
    session_id: entry.sessionId,
    group_id: entry.groupId,
    platform_take_cents: entry.platformTakeCents,
    player_total_cents: entry.playerTotalCents,
    method: entry.method,
  });
  return entry;
}

export async function getOwnerMetrics(): Promise<OwnerMetrics> {
  const ledger = await loadLedger();
  const local = await loadLocalAccount();

  const paymentsCount = ledger.length;
  const gross = ledger.reduce((s, e) => s + e.playerTotalCents, 0);
  const commissionGross = ledger.reduce((s, e) => s + e.platformTakeCents, 0);
  const commissionIva = Math.round(commissionGross * (0.21 / 1.21));
  const commissionNet = commissionGross - commissionIva;

  return {
    signups: local ? 1 : 0,
    paymentsCount,
    grossPlayerVolumeCents: gross,
    commissionNetCents: commissionNet,
    commissionIvaCents: commissionIva,
    commissionGrossCents: commissionGross,
    recentPayments: ledger.slice(0, 20),
    note:
      'Stripe Connect destination charges: platform keeps fee+IVA (application_fee); organiser receives court share on their connected account.',
  };
}
