import { colors } from '@padel-nerdz/config';
import { Stack } from 'expo-router';

import { GlassHeaderBackground } from '@/components/GlassHeaderBackground';
import { HeaderBack } from '@/components/HeaderBack';

export default function InboxLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerBackground: () => <GlassHeaderBackground />,
        headerStyle: { backgroundColor: 'transparent' },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontFamily: 'Figtree_600SemiBold',
          color: colors.textPrimary,
        },
        headerShadowVisible: false,
        headerTitleAlign: 'center',
        headerBackVisible: false,
        headerLeft: () => <HeaderBack fallbackHref="/(tabs)/profile" />,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Messages' }} />
      <Stack.Screen name="friends" options={{ title: 'Friends' }} />
    </Stack>
  );
}
