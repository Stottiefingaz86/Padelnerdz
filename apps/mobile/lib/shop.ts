/**
 * Shop catalog.
 * Merch = own brand (checkout later). Rackets = affiliate recommendations.
 * Later: block/carousel components fed from a real catalog API.
 */

export type MerchItem = {
  id: string;
  name: string;
  blurb: string;
  priceLabel: string;
  kind: 'tee' | 'hoodie' | 'cap' | 'sweatband';
};

export type RacketRec = {
  id: string;
  name: string;
  blurb: string;
  partner: string;
  /** Affiliate / storefront URL */
  url: string;
  priceHint?: string;
};

/** Own brand — Printful / warehouse later. Shown as real products, not “coming soon”. */
export const NERDZ_MERCH: MerchItem[] = [
  {
    id: 'tee-crown',
    name: 'Crown tee',
    blurb: 'Soft black tee with the Padel Nerdz crown.',
    priceLabel: '€32',
    kind: 'tee',
  },
  {
    id: 'hoodie-court',
    name: 'Court hoodie',
    blurb: 'Heavyweight for cold mornings before the mix-in.',
    priceLabel: '€68',
    kind: 'hoodie',
  },
  {
    id: 'cap-nerdz',
    name: 'Nerdz cap',
    blurb: 'Low-profile — green mark, no clutter.',
    priceLabel: '€28',
    kind: 'cap',
  },
  {
    id: 'sweatband-pair',
    name: 'Sweatbands',
    blurb: 'Pair of wristbands — absorb the grind.',
    priceLabel: '€14',
    kind: 'sweatband',
  },
];

/**
 * Recommended rackets — affiliate piece.
 * Swap URLs when tracking links are live (`EXPO_PUBLIC_AFFILIATE_*`).
 */
export const RACKET_RECS: RacketRec[] = [
  {
    id: 'bullpadel-vertex',
    name: 'Bullpadel Vertex',
    blurb: 'Power shape for advanced / pro — our most-tapped ES pick.',
    partner: 'Pádel Nuestro',
    url:
      process.env.EXPO_PUBLIC_AFFILIATE_PADEL_NUESTRO ??
      'https://www.padelnuestro.com/palas-de-padel',
    priceHint: 'From ~€250',
  },
  {
    id: 'babolat-technical',
    name: 'Babolat Technical Viper',
    blurb: 'Explosive attack pala — great if you live at the net.',
    partner: 'Padel Market',
    url: process.env.EXPO_PUBLIC_AFFILIATE_PADEL_MARKET ?? 'https://padelmarket.com/',
    priceHint: 'From ~€220',
  },
  {
    id: 'head-speed',
    name: 'HEAD Speed Pro',
    blurb: 'Control + spin for intermediate players levelling up.',
    partner: 'Everything Padel',
    url:
      process.env.EXPO_PUBLIC_AFFILIATE_EVERYTHING_PADEL ??
      'https://www.everythingpadel.com/',
    priceHint: 'From ~€180',
  },
];

export function racketById(id: string) {
  return RACKET_RECS.find((r) => r.id === id) ?? null;
}
