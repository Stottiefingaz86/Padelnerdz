import { colors, radii, spacing, typography } from '@padel-nerdz/config';
import { PressableScale } from '@padel-nerdz/ui';
import { StyleSheet, Text, View } from 'react-native';

import { select, tap } from '@/lib/feedback';

type Props = {
  title: string;
  subtitle?: string;
  onPress: () => void;
  disabled?: boolean;
  accent?: 'green' | 'blue' | 'none';
};

export function ActionRow({ title, subtitle, onPress, disabled, accent = 'none' }: Props) {
  return (
    <PressableScale
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onPressFeedback={() => {
        void tap();
        void select();
      }}
      style={[
        styles.row,
        disabled && styles.disabled,
        accent === 'green' && styles.accent_green,
        accent === 'blue' && styles.accent_blue,
      ]}
    >
      <View
        style={[
          styles.rail,
          accent === 'green' && styles.railGreen,
          accent === 'blue' && styles.railBlue,
        ]}
      />
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 72,
    paddingRight: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.elevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  accent_green: {
    borderColor: 'rgba(61,255,154,0.28)',
  },
  accent_blue: {
    borderColor: 'rgba(92,200,255,0.24)',
  },
  disabled: {
    opacity: 0.4,
  },
  rail: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
  },
  railGreen: {
    backgroundColor: colors.accentGreen,
  },
  railBlue: {
    backgroundColor: colors.accentGreen,
  },
  copy: {
    flex: 1,
    gap: 3,
    paddingLeft: spacing.sm,
  },
  title: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  chevron: {
    fontSize: 26,
    color: colors.textMuted,
    marginTop: -2,
  },
});
