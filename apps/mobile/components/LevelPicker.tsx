import { colors, radii, spacing, typography } from '@padel-nerdz/config';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { OrganiserLevel } from '@/lib/groups';
import { select } from '@/lib/feedback';

const OPTIONS: { value: Exclude<OrganiserLevel, 'unknown'>; label: string; hint: string }[] = [
  { value: 'beginner', label: 'Beginner', hint: 'New to padel / learning basics' },
  { value: 'intermediate', label: 'Intermediate', hint: 'Solid rallies, match play' },
  { value: 'advanced', label: 'Advanced', hint: 'Competitive, high pace' },
  { value: 'pro', label: 'Pro', hint: 'Tournament / coaching level' },
];

type Props = {
  value: OrganiserLevel | null;
  onChange: (value: Exclude<OrganiserLevel, 'unknown'>) => void;
  label?: string;
  required?: boolean;
};

export function LevelPicker({
  value,
  onChange,
  label = 'Group level',
  required,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {required ? ' · required' : ''}
      </Text>
      <Text style={styles.help}>Discover only shows your group to players at this level or above.</Text>
      <View style={styles.row}>
        {OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                void select();
                onChange(option.value);
              }}
              style={[styles.chip, selected && styles.chipOn]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextOn]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  help: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  chipOn: {
    backgroundColor: colors.accentGreenDim,
    borderColor: 'rgba(200,255,46,0.5)',
  },
  chipText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipTextOn: { color: colors.accentGreen },
});
