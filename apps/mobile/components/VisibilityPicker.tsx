import type { GroupVisibility } from '@padel-nerdz/domain';
import { colors, radii, spacing, typography } from '@padel-nerdz/config';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const OPTIONS: { value: GroupVisibility; label: string; hint: string }[] = [
  { value: 'public', label: 'Public', hint: 'Discoverable, anyone can join' },
  { value: 'approval', label: 'Approval', hint: 'Discoverable, organiser approves' },
  { value: 'private', label: 'Private', hint: 'Invite only, hidden from Discover' },
];

type Props = {
  value: GroupVisibility;
  onChange: (value: GroupVisibility) => void;
};

export function VisibilityPicker({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Visibility</Text>
      <View style={styles.list}>
        {OPTIONS.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                {option.label}
              </Text>
              <Text style={styles.hint}>{option.hint}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  list: {
    gap: spacing.sm,
  },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 4,
  },
  optionSelected: {
    borderColor: colors.accentGreen,
  },
  optionLabel: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  optionLabelSelected: {
    color: colors.accentGreen,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
