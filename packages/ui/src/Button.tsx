import { colors, radii, spacing, typography } from '@padel-nerdz/config';
import { ActivityIndicator, StyleSheet, Text, type ViewStyle } from 'react-native';

import { PressableScale } from './PressableScale';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  onPressFeedback?: () => void;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  onPressFeedback,
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <PressableScale
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      onPressFeedback={onPressFeedback}
      style={[styles.base, styles[variant], isDisabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#0B0D10' : colors.accentGreen}
        />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label` as const]]}>{label}</Text>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: {
    backgroundColor: colors.accentGreen,
  },
  secondary: {
    backgroundColor: colors.elevated2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    ...typography.bodyStrong,
  },
  primaryLabel: {
    color: '#0B0D10',
  },
  secondaryLabel: {
    color: colors.textPrimary,
  },
  ghostLabel: {
    color: colors.accentGreen,
  },
});
