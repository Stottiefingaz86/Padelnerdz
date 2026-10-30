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

type Props = {
  value: LevelRange | null;
  onChange: (value: LevelRange) => void;
  label?: string;
  help?: string;
  required?: boolean;
  /** Single claimed level (profile) — still uses range UI with min=max */
  single?: boolean;
};

function inRange(level: OrganiserLevel, range: LevelRange | null) {
  if (!range) return false;
  const r = levelRank(level);
  return r >= levelRank(range.min) && r <= levelRank(range.max);
}

export function formatLevelRange(range: LevelRange | null | undefined) {
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
}: Props) {
  function toggle(level: Exclude<OrganiserLevel, 'unknown'>) {
    void select();
    if (single || !value) {
      onChange({ min: level, max: level });
      return;
    }
    const tapped = levelRank(level);
    const minR = levelRank(value.min);
    const maxR = levelRank(value.max);
    if (value.min === value.max && value.min === level) {
      return;
    }
    if (tapped <= minR) {
      onChange({ min: level, max: value.max });
      return;
    }
    if (tapped >= maxR) {
      onChange({ min: value.min, max: level });
      return;
    }
    // Inside existing band → shrink to that single level
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
        {ORDER.map((level) => {
          const selected = inRange(level, value);
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
      {value ? (
        <Text style={styles.summary}>{formatLevelRange(value)}</Text>
      ) : null}
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
