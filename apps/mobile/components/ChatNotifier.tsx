import { colors, radii, spacing } from '@padel-nerdz/config';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { getActiveChannel } from '@/lib/chat-read';
import { isChannelMuted, isChannelSoundOn } from '@/lib/channel-prefs';
import { lastDemoMessage, listDemoMemberships, subscribeDemoStore } from '@/lib/demo-store';
import { chatAlert, success } from '@/lib/feedback';
import {
  listFriendRequests,
  subscribeFriends,
  type FriendRequest,
} from '@/lib/friends';
import { presentChatNotification, registerDevicePushToken } from '@/lib/push';
import { getSupabaseLoose, isSupabaseConfigured } from '@/lib/supabase';

type Toast = {
  id: string;
  kind: 'chat' | 'friend';
  title: string;
  body: string;
  href: string;
};

function previewBody(kind: string | undefined, body: string) {
  if (kind === 'mixin_card') return body || 'New mix-in posted';
  if (kind === 'image') return 'Photo';
  if (kind === 'video') return 'Video';
  return body;
}

/** In-app + OS notifications for chat, mix-ins, and friend requests. */
export function ChatNotifier() {
  const insets = useSafeAreaInsets();
  const { profile, offline } = useAuth();
  const userId = profile?.id ?? '';
  const [toast, setToast] = useState<Toast | null>(null);
  const lastByGroup = useRef<Record<string, string>>({});
  const seenRequests = useRef<Set<string>>(new Set());
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const booted = useRef(false);
  const appState = useRef(AppState.currentState);

  function showToast(next: Toast) {
    setToast(next);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setToast(null), 4200);
  }

  async function announceChat(input: {
    id: string;
    channelId: string;
    title: string;
    body: string;
    href: string;
    senderId: string | null;
  }) {
    if (!booted.current) return;
    if (input.senderId && input.senderId === userId) return;
    if (getActiveChannel() === input.channelId) return;

    if (await isChannelMuted(input.channelId)) return;

    if (await isChannelSoundOn(input.channelId)) void chatAlert(input.channelId);

    showToast({
      id: input.id,
      kind: 'chat',
      title: input.title,
      body: input.body,
      href: input.href,
    });

    // System banner when backgrounded; in-app toast covers foreground. Remote push covers killed.
    if (Platform.OS !== 'web' && appState.current !== 'active') {
      await presentChatNotification({
        title: input.title,
        body: input.body,
        href: input.href,
        channelId: input.channelId,
      });
    }
  }

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!userId || offline) return;
    void registerDevicePushToken(userId);
  }, [userId, offline]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const href = response.notification.request.content.data?.href;
      if (typeof href === 'string' && href.startsWith('/')) {
        router.push(href as never);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!userId) return;

    function scanDemoChats() {
      if (!offline) return;
      const groups = listDemoMemberships();
      for (const g of groups) {
        const last = lastDemoMessage(g.id);
        if (!last) continue;
        const prev = lastByGroup.current[g.id];
        if (!prev) {
          lastByGroup.current[g.id] = last.id;
          continue;
        }
        if (prev === last.id) continue;
        lastByGroup.current[g.id] = last.id;
        void announceChat({
          id: last.id,
          channelId: g.id,
          title: g.name,
          body: previewBody(last.kind, last.body),
          href: `/group/${g.id}/chat`,
          senderId: last.sender_id,
        });
      }
    }

    async function scanFriends() {
      const requests = await listFriendRequests();
      for (const r of requests) {
        if (seenRequests.current.has(r.id)) continue;
        seenRequests.current.add(r.id);
        if (!booted.current) continue;
        void success();
        showToast({
          id: r.id,
          kind: 'friend',
          title: 'Friend request',
          body: `${r.from_name} (@${r.from_tag}) wants to connect`,
          href: '/inbox',
        });
      }
    }

    function boot() {
      scanDemoChats();
      void scanFriends().finally(() => {
        booted.current = true;
      });
    }

    boot();
    const unsubDemo = subscribeDemoStore(scanDemoChats);
    const unsubFriends = subscribeFriends(() => void scanFriends());

    let channel: ReturnType<ReturnType<typeof getSupabaseLoose>['channel']> | null =
      null;

    if (!offline && isSupabaseConfigured) {
      channel = getSupabaseLoose()
        .channel(`pn-notifs-${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'group_messages' },
          (payload) => {
            const row = payload.new as {
              id: string;
              group_id: string;
              sender_id: string | null;
              body: string;
              kind?: string;
            };
            void (async () => {
              const { data: group } = await getSupabaseLoose()
                .from('groups')
                .select('name')
                .eq('id', row.group_id)
                .maybeSingle();
              const { data: sender } = row.sender_id
                ? await getSupabaseLoose()
                    .from('profiles')
                    .select('display_name')
                    .eq('id', row.sender_id)
                    .maybeSingle()
                : { data: null };

              const isMixin = row.kind === 'mixin_card';
              const title = isMixin
                ? (group?.name as string) || 'Mix-in'
                : (sender?.display_name as string) ||
                  (group?.name as string) ||
                  'Padel Nerdz';
              await announceChat({
                id: row.id,
                channelId: row.group_id,
                title,
                body: previewBody(row.kind, row.body),
                href: `/group/${row.group_id}/chat`,
                senderId: row.sender_id,
              });
            })();
          },
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'session_room_messages' },
          (payload) => {
            const row = payload.new as {
              id: string;
              session_room_id: string;
              sender_id: string | null;
              body: string;
              kind?: string;
            };
            void (async () => {
              const { data: room } = await getSupabaseLoose()
                .from('session_rooms')
                .select('id, sessions(group_id)')
                .eq('id', row.session_room_id)
                .maybeSingle();
              const groupId = (room?.sessions as { group_id?: string } | null)?.group_id;
              await announceChat({
                id: row.id,
                channelId: row.session_room_id,
                title: 'Session chat',
                body: previewBody(row.kind, row.body),
                href: groupId
                  ? `/group/${groupId}/session-room/${row.session_room_id}`
                  : '/inbox',
                senderId: row.sender_id,
              });
            })();
          },
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'dm_messages' },
          (payload) => {
            const row = payload.new as {
              id: string;
              thread_id: string;
              sender_id: string | null;
              body: string;
            };
            void (async () => {
              const { data: sender } = row.sender_id
                ? await getSupabaseLoose()
                    .from('profiles')
                    .select('display_name')
                    .eq('id', row.sender_id)
                    .maybeSingle()
                : { data: null };
              await announceChat({
                id: row.id,
                channelId: row.thread_id,
                title: (sender?.display_name as string) || 'Direct message',
                body: row.body,
                href: `/dm/${row.thread_id}`,
                senderId: row.sender_id,
              });
            })();
          },
        )
        .subscribe();
    }

    return () => {
      unsubDemo();
      unsubFriends();
      if (channel) void getSupabaseLoose().removeChannel(channel);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // announceChat closes over userId; remount on identity change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, offline]);

  if (!toast) return null;

  return (
    <Animated.View
      entering={FadeInUp.duration(220)}
      exiting={FadeOutUp.duration(180)}
      style={[styles.wrap, { top: insets.top + 8 }]}
      pointerEvents="box-none"
    >
      <Pressable
        style={styles.card}
        onPress={() => {
          const href = toast.href;
          setToast(null);
          router.push(href as never);
        }}
      >
        <View style={[styles.dot, toast.kind === 'friend' && styles.dotFriend]} />
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>
            {toast.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {toast.body}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export type { FriendRequest };

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: colors.elevated2,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.28)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentGreen,
  },
  dotFriend: {
    backgroundColor: colors.accentBlue,
  },
  copy: { flex: 1, gap: 2 },
  title: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 14,
    color: colors.textPrimary,
  },
  body: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
