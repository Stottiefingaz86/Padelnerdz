import { colors, spacing } from '@padel-nerdz/config';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { roleLabel, type GroupMember } from '@/lib/groups';

type Props = {
  member: GroupMember;
  onPress?: () => void;
};

export function MemberRow({ member, onPress }: Props) {
  const name = member.is_you ? `${member.display_name} (You)` : member.display_name;
  const badge = roleLabel(member.role);

  const body = (
    <>
      <Avatar name={member.display_name} size={48} />
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          #{member.group_rank} · {member.sessions_played} mix-ins ·{' '}
          {member.reliability == null ? 'new' : `${member.reliability}%`}
        </Text>
        {badge ? <Text style={styles.role}>{badge}</Text> : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable style={styles.row} onPress={onPress} android_ripple={{ color: 'transparent' }}>
        {body}
      </Pressable>
    );
  }

  return <View style={styles.row}>{body}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    backgroundColor: colors.surface,
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  name: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
  },
  meta: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
  },
  role: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
  chevron: {
    fontSize: 22,
    color: colors.textMuted,
  },
});
