import { colors } from '@padel-nerdz/config';
import { SmilePlus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { select, tap } from '@/lib/feedback';
import {
  QUICK_REACTIONS,
  type ReactionSummary,
  type ReactionChannel,
  toggleMessageReaction,
  type MessageReactionMap,
} from '@/lib/reactions';

type Props = {
  messageId: string;
  channelType: ReactionChannel;
  channelId: string;
  userId: string;
  isGuest: boolean;
  reactions?: ReactionSummary[];
  align?: 'left' | 'right';
  onChanged: (next: MessageReactionMap) => void;
  /** Hide for system/special cards */
  enabled?: boolean;
};

export function MessageReactions({
  messageId,
  channelType,
  channelId,
  userId,
  isGuest,
  reactions = [],
  align = 'left',
  onChanged,
  enabled = true,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!enabled) return null;

  async function toggle(emoji: string) {
    if (busy || !userId) return;
    setBusy(true);
    try {
      void select();
      const next = await toggleMessageReaction({
        channelType,
        channelId,
        messageId,
        userId,
        emoji,
        isGuest,
      });
      onChanged(next);
      setPickerOpen(false);
    } catch (e) {
      console.warn('toggle reaction', e);
    } finally {
      setBusy(false);
    }
  }

  const liked = reactions.some((r) => r.emoji === '❤️' && r.mine);

  return (
    <View style={[styles.wrap, align === 'right' && styles.wrapRight]}>
      <View style={styles.row}>
        {reactions.map((r) => (
          <Pressable
            key={r.emoji}
            style={[styles.chip, r.mine && styles.chipMine]}
            onPress={() => void toggle(r.emoji)}
            hitSlop={4}
          >
            <Text style={styles.chipEmoji}>{r.emoji}</Text>
            <Text style={[styles.chipCount, r.mine && styles.chipCountMine]}>{r.count}</Text>
          </Pressable>
        ))}
        <Pressable
          style={[styles.chip, styles.addChip, liked && styles.chipMine]}
          onPress={() => {
            void tap();
            void toggle('❤️');
          }}
          onLongPress={() => {
            void tap();
            setPickerOpen((v) => !v);
          }}
          delayLongPress={220}
          hitSlop={6}
          accessibilityLabel="Like or react"
        >
          <Text style={styles.addText}>{liked ? '❤️' : '♡'}</Text>
        </Pressable>
        <Pressable
          style={styles.emojiBtn}
          onPress={() => {
            void tap();
            setPickerOpen((v) => !v);
          }}
          hitSlop={6}
          accessibilityLabel="Add emoji reaction"
        >
          <Icon icon={SmilePlus} color={colors.textMuted} size={16} />
        </Pressable>
      </View>

      {pickerOpen ? (
        <View style={[styles.picker, align === 'right' && styles.pickerRight]}>
          {QUICK_REACTIONS.map((e) => (
            <Pressable key={e} style={styles.pickerItem} onPress={() => void toggle(e)}>
              <Text style={styles.pickerEmoji}>{e}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 6,
    maxWidth: '90%',
    gap: 6,
  },
  wrapRight: { alignSelf: 'flex-end' },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  chipMine: {
    borderColor: 'rgba(200,255,46,0.45)',
    backgroundColor: 'rgba(200,255,46,0.12)',
  },
  chipEmoji: { fontSize: 13 },
  chipCount: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 12,
    color: colors.textSecondary,
  },
  chipCountMine: { color: colors.accentGreen },
  addChip: { paddingHorizontal: 9 },
  addText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emojiBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  picker: {
    flexDirection: 'row',
    gap: 2,
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignSelf: 'flex-start',
  },
  pickerRight: { alignSelf: 'flex-end' },
  pickerItem: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerEmoji: { fontSize: 20 },
});
