import {
  listDemoMessageReactions,
  toggleDemoMessageReaction,
  type DemoMessageReaction,
} from './demo-store';
import { getSupabaseLoose, isSupabaseConfigured } from './supabase';

export type ReactionChannel = 'group' | 'session_room';

export type ReactionSummary = {
  emoji: string;
  count: number;
  mine: boolean;
};

export type MessageReactionMap = Record<string, ReactionSummary[]>;

export const QUICK_REACTIONS = ['❤️', '👍', '😂', '🔥', '👏', '🙌'] as const;

function summarize(
  rows: Array<{ message_id: string; user_id: string; emoji: string }>,
  userId: string,
): MessageReactionMap {
  const byMessage = new Map<string, Map<string, { count: number; mine: boolean }>>();
  for (const row of rows) {
    let emojiMap = byMessage.get(row.message_id);
    if (!emojiMap) {
      emojiMap = new Map();
      byMessage.set(row.message_id, emojiMap);
    }
    const cur = emojiMap.get(row.emoji) ?? { count: 0, mine: false };
    cur.count += 1;
    if (row.user_id === userId) cur.mine = true;
    emojiMap.set(row.emoji, cur);
  }

  const out: MessageReactionMap = {};
  for (const [messageId, emojiMap] of byMessage) {
    out[messageId] = [...emojiMap.entries()]
      .map(([emoji, v]) => ({ emoji, count: v.count, mine: v.mine }))
      .sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji));
  }
  return out;
}

export async function listChannelReactions(input: {
  channelType: ReactionChannel;
  channelId: string;
  userId: string;
  isGuest: boolean;
}): Promise<MessageReactionMap> {
  if (
    input.isGuest ||
    !isSupabaseConfigured ||
    input.channelId.startsWith('demo-')
  ) {
    const rows = listDemoMessageReactions(input.channelType, input.channelId);
    return summarize(rows, input.userId);
  }

  const { data, error } = await getSupabaseLoose()
    .from('message_reactions')
    .select('message_id, user_id, emoji')
    .eq('channel_type', input.channelType)
    .eq('channel_id', input.channelId);

  if (error) {
    console.warn('listChannelReactions', error.message);
    return {};
  }

  return summarize(
    (data ?? []) as Array<{ message_id: string; user_id: string; emoji: string }>,
    input.userId,
  );
}

export async function toggleMessageReaction(input: {
  channelType: ReactionChannel;
  channelId: string;
  messageId: string;
  userId: string;
  emoji: string;
  isGuest: boolean;
}): Promise<MessageReactionMap> {
  if (
    input.isGuest ||
    !isSupabaseConfigured ||
    input.channelId.startsWith('demo-')
  ) {
    const rows = toggleDemoMessageReaction({
      channelType: input.channelType,
      channelId: input.channelId,
      messageId: input.messageId,
      userId: input.userId,
      emoji: input.emoji,
    });
    return summarize(rows as DemoMessageReaction[], input.userId);
  }

  const { data: existing } = await getSupabaseLoose()
    .from('message_reactions')
    .select('id')
    .eq('channel_type', input.channelType)
    .eq('message_id', input.messageId)
    .eq('user_id', input.userId)
    .eq('emoji', input.emoji)
    .maybeSingle();

  if (existing?.id) {
    await getSupabaseLoose().from('message_reactions').delete().eq('id', existing.id);
  } else {
    const { error } = await getSupabaseLoose().from('message_reactions').insert({
      channel_type: input.channelType,
      channel_id: input.channelId,
      message_id: input.messageId,
      user_id: input.userId,
      emoji: input.emoji,
    });
    if (error) throw error;
  }

  return listChannelReactions({
    channelType: input.channelType,
    channelId: input.channelId,
    userId: input.userId,
    isGuest: false,
  });
}
