import { colors } from '@padel-nerdz/config';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { WrapSlideshow } from '@/components/chat/WrapSlideshow';
import { useAuth } from '@/lib/auth';
import { buildWrapDeck, type WrapDeck, type WrapSlide } from '@/lib/wrap';

export default function SessionWrapScreen() {
  const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
  const { profile, user, offline } = useAuth();
  const isGuest = offline;
  const userId = user?.id ?? profile?.id ?? '';

  const [deck, setDeck] = useState<WrapDeck | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !sessionId || !userId) return;
    try {
      const built = await buildWrapDeck({
        sessionId,
        groupId: id,
        userId,
        isGuest,
      });
      setDeck(built);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build wrap');
    }
  }, [id, sessionId, userId, isGuest]);

  useEffect(() => {
    void load();
  }, [load]);

  function close() {
    if (router.canGoBack()) router.back();
    else if (id) router.replace(`/group/${id}/chat`);
    else router.replace('/(tabs)/chats');
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, animation: 'fade' }} />
      {deck ? (
        <WrapSlideshow
          slides={deck.slides as WrapSlide[]}
          sessionTitle={deck.title}
          onClose={close}
        />
      ) : (
        <View style={styles.boot}>
          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            <ActivityIndicator color={colors.accentGreen} size="large" />
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: '#0B0D10',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  error: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
