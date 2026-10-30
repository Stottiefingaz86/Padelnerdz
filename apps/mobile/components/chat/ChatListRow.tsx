import { colors, spacing } from '@padel-nerdz/config';
import { PressableScale } from '@padel-nerdz/ui';
import { StyleSheet, Text, View } from 'react-native';

import { tap } from '@/lib/feedback';

type Props = {
  title: string;
  preview: string;
  timeLabel: string;
  onPress: () => void;
  accent?: string;
  unread?: number;
  subtitle?: string;
};

export function ChatListRow({
  title,
  preview,
  timeLabel,
  onPress,
  accent,
  unread = 0,
  subtitle,
}: Props) {
  const initial = title.slice(0, 1).toUpperCase();
  return (
    <PressableScale
      onPress={onPress}
      onPressFeedback={() => {
        void tap();
      }}
      style={styles.row}
    >
      <View style={[styles.avatar, accent ? { backgroundColor: accent } : null]}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={styles.copy}>
        <View style={styles.top}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.time, unread > 0 && styles.timeUnread]}>{timeLabel}</Text>
        </View>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        <View style={styles.bottom}>
          <Text style={styles.preview} numberOfLines={1}>
            {preview}
          </Text>
          {unread > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    backgroundColor: colors.background,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#1F3A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 20,
    color: colors.accentGreen,
  },
  copy: {
    flex: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
    paddingBottom: 12,
    gap: 2,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16.5,
    color: colors.textPrimary,
  },
  time: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
  timeUnread: {
    color: colors.accentGreen,
  },
  subtitle: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  preview: {
    flex: 1,
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    color: '#0B0D10',
  },
});
