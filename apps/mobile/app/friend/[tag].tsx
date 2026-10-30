import { colors, spacing } from '@padel-nerdz/config';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { addFriendByTag } from '@/lib/friends';
import { success, warn } from '@/lib/feedback';

/** Deep link target: padelnerdz://friend/:tag */
export default function AddFriendByLinkScreen() {
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const [status, setStatus] = useState<'working' | 'ok' | 'err'>('working');
  const [message, setMessage] = useState('Adding friend…');

  useEffect(() => {
    if (!tag) return;
    void (async () => {
      try {
        const friend = await addFriendByTag(tag);
        setMessage(`Added @${friend.friend_tag}`);
        setStatus('ok');
        void success();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Could not add friend');
        setStatus('err');
        void warn();
      }
    })();
  }, [tag]);

  return (
    <>
      <Stack.Screen options={{ title: 'Add friend' }} />
      <View style={styles.root}>
        {status === 'working' ? <ActivityIndicator color={colors.accentGreen} /> : null}
        <Text style={styles.text}>{message}</Text>
        <Pressable style={styles.btn} onPress={() => router.replace('/inbox')}>
          <Text style={styles.btnText}>Open Friends</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  text: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 18,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  btn: {
    marginTop: spacing.md,
    backgroundColor: colors.accentGreen,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  btnText: {
    fontFamily: 'Figtree_700Bold',
    color: colors.background,
  },
});
