/**
 * Player-facing price hides the platform cut.
 * Organiser sets court share (e.g. €14). We add platform fee + Spanish IVA on the fee.
 *
 * Example: €14.00 court + €1.00 fee + 21% IVA on fee (€0.21) → player pays €15.21
 * Platform expected take: €1.21 (fee + IVA) — only visible on owner dashboard.
 */

export const PLATFORM_FEE_CENTS = 100; // €1.00
export const PLATFORM_IVA_RATE = 0.21; // Spain standard VAT on digital services

export type PriceBreakdown = {
  /** What the organiser entered (court / host share) */
  courtCents: number;
  /** Net platform fee before tax */
  feeCents: number;
  /** IVA on the platform fee only */
  ivaCents: number;
  /** fee + IVA — what should accrue to Padel Nerdz */
  platformTakeCents: number;
  /** Amount the player is asked to pay (single number in the app) */
  playerTotalCents: number;
};

export function priceBreakdown(
  courtCents: number | null | undefined,
  feeCents: number = PLATFORM_FEE_CENTS,
): PriceBreakdown {
  const court = Math.max(0, courtCents ?? 0);
  const fee = Math.max(0, feeCents);
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
