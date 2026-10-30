import { colors, radii, spacing, typography } from '@padel-nerdz/config';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { GroupSummary } from '@/lib/groups';

type Props = {
  group: GroupSummary;
  onPress: () => void;
};

function visibilityLabel(v: GroupSummary['visibility']) {
  if (v === 'public') return 'Public';
  if (v === 'approval') return 'Approval';
  return 'Private';
}

export function GroupListItem({ group, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{group.name.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>
          {group.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {visibilityLabel(group.visibility)}
          {group.location_label ? ` · ${group.location_label}` : ''}
          {` · ${group.member_count} member${group.member_count === 1 ? '' : 's'}`}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {
    opacity: 0.75,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.title,
    color: colors.accentGreen,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
