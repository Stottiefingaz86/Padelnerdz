import { colors, radii, spacing, typography } from '@padel-nerdz/config';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { select } from '@/lib/feedback';
import { levelLabel, levelRank, type OrganiserLevel } from '@/lib/groups';

const ORDER: Exclude<OrganiserLevel, 'unknown'>[] = [
  'beginner',
  'intermediate',
  'advanced',
  'pro',
];

export type LevelRange = {
  min: Exclude<OrganiserLevel, 'unknown'>;
  max: Exclude<OrganiserLevel, 'unknown'>;
};

/** `null` = not chosen yet; `'all'` = every level welcome */
export type LevelChoice = LevelRange | 'all' | null;

type Props = {
  value: LevelChoice;
  onChange: (value: LevelChoice) => void;
  label?: string;
  help?: string;
  required?: boolean;
  /** Single claimed level (profile) — still uses range UI with min=max */
  single?: boolean;
  /** Show an All levels chip (public / approval groups) */
  allowAll?: boolean;
};

function inRange(level: OrganiserLevel, range: LevelRange | null) {
  if (!range) return false;
  const r = levelRank(level);
  return r >= levelRank(range.min) && r <= levelRank(range.max);
}

export function formatLevelRange(range: LevelChoice | undefined) {
  if (range === 'all') return 'All levels';
  if (!range) return 'Any level';
  if (range.min === range.max) return levelLabel(range.min);
  return `${levelLabel(range.min)} – ${levelLabel(range.max)}`;
}

export function LevelRangePicker({
  value,
  onChange,
  label = 'Group levels',
  help = 'Tap two ends to set a band — e.g. Beginner through Intermediate.',
  required,
  single,
  allowAll,
}: Props) {
  const rangeValue: LevelRange | null =
    value && value !== 'all' ? value : null;
  const allSelected = value === 'all';

  function toggle(level: Exclude<OrganiserLevel, 'unknown'>) {
    void select();
    if (single || !rangeValue) {
      onChange({ min: level, max: level });
      return;
    }
    const tapped = levelRank(level);
    const minR = levelRank(rangeValue.min);
    const maxR = levelRank(rangeValue.max);
    if (rangeValue.min === rangeValue.max && rangeValue.min === level) {
      return;
    }
    if (tapped <= minR) {
      onChange({ min: level, max: rangeValue.max });
      return;
    }
    if (tapped >= maxR) {
      onChange({ min: rangeValue.min, max: level });
      return;
    }
    onChange({ min: level, max: level });
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {required ? ' · required' : ''}
      </Text>
      <Text style={styles.help}>{help}</Text>
      <View style={styles.row}>
        {allowAll ? (
          <Pressable
            onPress={() => {
              void select();
              onChange('all');
            }}
            style={[styles.chip, allSelected && styles.chipOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: allSelected }}
          >
            <Text style={[styles.chipText, allSelected && styles.chipTextOn]}>
              All levels
            </Text>
          </Pressable>
        ) : null}
        {ORDER.map((level) => {
          const selected = !allSelected && inRange(level, rangeValue);
          return (
            <Pressable
              key={level}
              onPress={() => toggle(level)}
              style={[styles.chip, selected && styles.chipOn]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextOn]}>
                {levelLabel(level)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {value ? <Text style={styles.summary}>{formatLevelRange(value)}</Text> : null}
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
  summary: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 13,
    color: colors.accentGreen,
  },
});
