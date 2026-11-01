/**
 * Player-facing price hides the platform cut.
 * Organiser sets court share (e.g. €14). We take 8% of that + Spanish IVA on the fee.
 *
 * Example: €14.00 court → €1.12 fee (8%) + €0.24 IVA (21% on fee) → player pays €15.36
 * Platform take: €1.36 (fee + IVA) — only visible on owner / admin surfaces.
 */

/** Share of event (court) fee kept by the platform before IVA */
export const PLATFORM_FEE_RATE = 0.08;
/** Spain standard VAT on the platform service fee */
export const PLATFORM_IVA_RATE = 0.21;

export type PriceBreakdown = {
  /** What the organiser entered (court / host share) */
  courtCents: number;
  /** Net platform fee before tax (8% of court) */
  feeCents: number;
  /** IVA on the platform fee only */
  ivaCents: number;
  /** fee + IVA — what should accrue to Padel Nerdz */
  platformTakeCents: number;
  /** Amount the player is asked to pay (single number in the app) */
  playerTotalCents: number;
};

/** Platform fee (ex-IVA) for a court price — always derived from the event fee. */
export function platformFeeCents(courtCents: number | null | undefined): number {
  const court = Math.max(0, courtCents ?? 0);
  return Math.round(court * PLATFORM_FEE_RATE);
}

/**
 * @param courtCents Organiser court / event price
 * @param feeCents Optional override (tests / legacy). Omit to use 8% of court.
 */
export function priceBreakdown(
  courtCents: number | null | undefined,
  feeCents?: number | null,
): PriceBreakdown {
  const court = Math.max(0, courtCents ?? 0);
  const fee =
    feeCents != null && Number.isFinite(feeCents)
      ? Math.max(0, Math.round(feeCents))
      : platformFeeCents(court);
  const ivaCents = Math.round(fee * PLATFORM_IVA_RATE);
  const platformTakeCents = fee + ivaCents;
  return {
    courtCents: court,
    feeCents: fee,
    ivaCents,
    platformTakeCents,
    playerTotalCents: court + platformTakeCents,
  };
}

/** @deprecated Use platformFeeCents(court) — fixed €1 fee removed */
export const PLATFORM_FEE_CENTS = 100;

export function formatMoney(cents: number, currency: 'EUR' | 'GBP' = 'EUR') {
  const value = cents / 100;
  try {
    return new Intl.NumberFormat(currency === 'EUR' ? 'es-ES' : 'en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    const sym = currency === 'EUR' ? '€' : '£';
    return `${sym}${value.toFixed(cents % 100 === 0 ? 0 : 2)}`;
  }
}
