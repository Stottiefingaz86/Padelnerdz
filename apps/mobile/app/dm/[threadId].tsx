import { colors, spacing } from '@padel-nerdz/config';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatWallpaper } from '@/components/chat/ChatWallpaper';
import { FlatSendIcon } from '@/components/FlatIcons';
import { useAuth } from '@/lib/auth';
import {
  getDmThreadMeta,
  listDmMessages,
  markDmThreadRead,
  sendDmMessage,
  type DmMessage,
} from '@/lib/dm';
import { messageSent, tap, warn } from '@/lib/feedback';
import { useGlassHeaderOffset } from '@/lib/layout';

export default function DirectMessageScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const insets = useSafeAreaInsets();
  const headerOffset = useGlassHeaderOffset();
  const { profile, user, offline } = useAuth();
  const isGuest = offline;
  const userId = user?.id ?? profile?.id ?? '';

  const [title, setTitle] = useState('Message');
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<DmMessage>>(null);

  const refresh = useCallback(async () => {
    if (!threadId || !userId) return;
    const [meta, msgs] = await Promise.all([
      getDmThreadMeta(threadId, userId, isGuest),
      listDmMessages(threadId, userId, isGuest),
    ]);
    if (meta) setTitle(meta.peerName);
    setMessages(msgs);
    void markDmThreadRead(threadId);
  }, [threadId, userId, isGuest]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      const t = setInterval(() => void refresh(), 4000);
      return () => clearInterval(t);
    }, [refresh]),
  );

  async function onSend() {
    if (!threadId || !userId || !draft.trim() || sending) return;
    setSending(true);
    try {
      const msg = await sendDmMessage({
        threadId,
        userId,
        body: draft,
        isGuest,
      });
      setDraft('');
      setMessages((prev) => [...prev, msg]);
      void messageSent(threadId);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (e) {
      void warn();
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title, headerBackTitle: 'Back' }} />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={88}
      >
        <ChatWallpaper>
        <FlatList
          ref={listRef}
          data={messages}
          style={styles.listFlex}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            messages.length === 0 && styles.listEmpty,
            { paddingTop: headerOffset, paddingBottom: 12 },
          ]}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <Text style={styles.empty}>
              Say hi — suggest a 5‑minute hit to gauge level, or share court details.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.mine ? styles.mine : styles.theirs]}>
              <Text style={[styles.body, item.mine && styles.bodyMine]}>{item.body}</Text>
              <Text style={[styles.time, item.mine && styles.timeMine]}>
                {new Date(item.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          )}
        />
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message…"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            maxLength={2000}
          />
          <Pressable
            style={[styles.send, (!draft.trim() || sending) && { opacity: 0.4 }]}
            disabled={!draft.trim() || sending}
            onPress={() => {
              void tap();
              void onSend();
            }}
          >
            <FlatSendIcon color="#0B0D10" size={20} />
          </Pressable>
        </View>
        </ChatWallpaper>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  listFlex: { flex: 1, backgroundColor: 'transparent' },
  banner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerText: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  list: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: 8 },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  empty: {
    textAlign: 'center',
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accentGreen,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  body: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  bodyMine: { color: '#0B0D10' },
  time: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 10,
    color: colors.textMuted,
    alignSelf: 'flex-end',
  },
  timeMine: { color: 'rgba(11,13,16,0.55)' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.elevated,
    color: colors.textPrimary,
    fontFamily: 'Figtree_400Regular',
    fontSize: 15,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
