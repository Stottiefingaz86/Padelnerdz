import { colors, motion, radii, spacing, typography } from '@padel-nerdz/config';
import { DarkTheme } from '@react-navigation/native';

export const appTheme = {
  colors,
  spacing,
  radii,
  typography,
  motion,
} as const;

export const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accentGreen,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.borderSubtle,
    notification: colors.accentGreen,
  },
  fonts: DarkTheme.fonts,
};
