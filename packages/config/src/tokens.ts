/** Brand tokens — dark premium + lime energy (mockup-aligned) */
export const colors = {
  background: '#0B0D10',
  surface: '#141414',
  elevated: '#1C1C1C',
  elevated2: '#242424',
  border: '#2E2E2E',
  borderSubtle: '#222222',
  textPrimary: '#FFFFFF',
  textSecondary: '#B5B5B5',
  textMuted: '#7A7A7A',
  /** Primary CTA / active — energetic lime */
  accentGreen: '#C8FF2E',
  accentGreenDim: 'rgba(200, 255, 46, 0.14)',
  /** Kept for legacy imports — maps to muted lime, not blue */
  accentBlue: '#A8E85A',
  accentBlueDim: 'rgba(200, 255, 46, 0.10)',
  chatBg: '#0B0D10',
  bubbleOut: '#1E2A1C',
  bubbleIn: '#1A1E26',
  warning: '#FFB74D',
  error: '#FF6E6E',
  success: '#C8FF2E',
  overlay: 'rgba(7, 8, 10, 0.72)',
  glow: 'rgba(200, 255, 46, 0.35)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 28,
  pill: 999,
} as const;

export const typography = {
  hero: {
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: -1.1,
  },
  display: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.4,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: -0.1,
  },
  bodyStrong: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: -0.05,
  },
  label: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
  },
} as const;

export const motion = {
  pressScale: 0.97,
  spring: { damping: 18, stiffness: 280, mass: 0.6 },
  snappy: { damping: 22, stiffness: 420, mass: 0.45 },
} as const;

export type ColorToken = keyof typeof colors;

export type AppTheme = {
  colors: typeof colors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  motion: typeof motion;
};
