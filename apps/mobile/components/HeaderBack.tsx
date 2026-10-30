import { colors } from '@padel-nerdz/config';
import { router, useLocalSearchParams } from 'expo-router';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { FlatChevronLeft } from '@/components/FlatIcons';
import { tap } from '@/lib/feedback';

type Props = {
  /** Used when history is empty (deep link / first screen in nested stack). */
  fallbackHref?: string;
};

/**
 * Always-visible back control. Nested Expo stacks often mount with no history,
 * so the system back never appears — this always escapes.
 */
export function HeaderBack({ fallbackHref }: Props) {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const groupId = Array.isArray(params.id) ? params.id[0] : params.id;

  function onPress() {
    void tap();
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (fallbackHref) {
      router.replace(fallbackHref as never);
      return;
    }
    if (groupId) {
      router.replace(`/group/${groupId}/chat` as never);
      return;
    }
    router.replace('/(tabs)/chats');
  }

  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={styles.btn}
      accessibilityRole="button"
      accessibilityLabel="Back"
      android_ripple={{ color: 'transparent' }}
    >
      <FlatChevronLeft color={colors.accentGreen} size={22} />
    </Pressable>
  );
}

/** Drop into Stack `screenOptions` / `options`. */
export function headerBackOptions(fallbackHref?: string) {
  return {
    headerBackVisible: false,
    headerLeft: () => <HeaderBack fallbackHref={fallbackHref} />,
  } as const;
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    marginLeft: Platform.OS === 'ios' ? -4 : 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
