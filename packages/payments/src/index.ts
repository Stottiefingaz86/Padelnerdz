/** Payment orchestration — Stripe Connect marketplace (card / wallets). */

export type PaymentMode = 'manual' | 'integrated';

export type ManualPaymentMethod = {
  id: string;
  label: string;
  instructions: string;
};

export type PaymentProvider = {
  mode: PaymentMode;
  listManualMethods: (groupId: string) => Promise<ManualPaymentMethod[]>;
};

/** Live product mode: integrated Stripe Connect destination charges. */
export const defaultPaymentMode: PaymentMode = 'integrated';

export const STRIPE_CONNECT = {
  currency: 'eur' as const,
  country: 'ES' as const,
  /** Net platform fee before IVA (cents). */
  platformFeeCents: 100,
  ivaRate: 0.21,
};

export function platformTakeCents(feeCents = STRIPE_CONNECT.platformFeeCents) {
  const iva = Math.round(feeCents * STRIPE_CONNECT.ivaRate);
  return feeCents + iva;
}
