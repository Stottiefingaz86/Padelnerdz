import type { SessionFormat } from '@padel-nerdz/domain';

export type FormatOption = {
  value: SessionFormat;
  label: string;
  /** Short line under the title on the picker row */
  blurb: string;
  /** Full rules for the info sheet */
  rules: string;
  popular?: boolean;
  /** Suggested courts / max when this format is picked */
  defaults?: { courts: string; maxPlayers: string };
};

/** Live formats only, Americano / Mexicano stay out until engines ship. */
export const MIXIN_FORMATS: FormatOption[] = [
  {
    value: 'kings_and_queens',
    label: 'Kings & Queens',
    popular: true,
    blurb: 'Most popular · rotating courts each round',
    defaults: { courts: '2', maxPlayers: '8' },
    rules:
      'Best for regular mix-ins (8 / 12 / 16 players).\n\n' +
      '• After each match, winners move up a court and losers move down.\n' +
      '• Partners split every round, you don’t stay with the same teammate.\n' +
      '• The next round is built automatically from those results.\n\n' +
      'Top court = Kings & Queens. Win there and you stay. Everyone else keeps moving.',
  },
  {
    value: 'tournament_by_wins',
    label: 'Tournament by wins',
    blurb: 'Fixed teams · groups then knockout',
    defaults: { courts: '4', maxPlayers: '32' },
    rules:
      'Built for bigger events with fixed doubles teams.\n\n' +
      '1. Seed teams into skill bands A (stronger) and B (developing), then into groups (A1/A2, B1/B2).\n' +
      '2. Group stage, every team plays the others in its group. Matches are best of 9 games. Every game you win counts as a table point (a 5–4 loss still banks 4 points).\n' +
      '3. Top 2 from each group go through.\n' +
      '4. Knockout, cross semis (1st of one group vs 2nd of the other), then 3rd/4th place and the final. Only the match winner advances.\n\n' +
      'Needs enough courts and paid players to fill the draw.',
  },
  {
    value: 'custom',
    label: 'Custom (open play)',
    blurb: 'No auto fixtures, you run the courts',
    defaults: { courts: '2', maxPlayers: '8' },
    rules:
      'Use this when you just want a paid session room without Kings & Queens or tournament fixtures.\n\n' +
      '• Players still register, pay, and unlock session chat.\n' +
      '• You organise courts and scores yourself (or skip fixtures entirely).',
  },
];

export function formatRules(value: SessionFormat): string {
  return MIXIN_FORMATS.find((f) => f.value === value)?.rules ?? '';
}
