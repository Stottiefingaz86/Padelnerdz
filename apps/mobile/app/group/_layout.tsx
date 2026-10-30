import { colors } from '@padel-nerdz/config';
import { Stack } from 'expo-router';

import { GlassHeaderBackground } from '@/components/GlassHeaderBackground';
import { HeaderBack } from '@/components/HeaderBack';

export default function GroupLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerBlurEffect: undefined,
        headerBackground: () => <GlassHeaderBackground />,
        headerStyle: { backgroundColor: 'transparent' },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontFamily: 'Figtree_600SemiBold',
          color: colors.textPrimary,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
        headerBackTitle: 'Back',
        headerTitleAlign: 'center',
        // Nested stack often has no history — always show our back control.
        headerBackVisible: false,
        headerLeft: () => <HeaderBack />,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="create" options={{ title: 'New group' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Group info' }} />
      <Stack.Screen name="[id]/chat" options={{ title: 'Chat' }} />
      <Stack.Screen name="[id]/invite" options={{ title: 'Invite' }} />
      <Stack.Screen name="[id]/create-mixin" options={{ title: 'Create mix-in' }} />
      <Stack.Screen name="[id]/settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="[id]/admin" options={{ title: 'Admin' }} />
      <Stack.Screen name="[id]/payments" options={{ title: 'Payments' }} />
      <Stack.Screen name="[id]/member/[userId]" options={{ title: 'Member' }} />
      <Stack.Screen name="[id]/select/[sessionId]" options={{ title: 'Confirm lineup' }} />
      <Stack.Screen name="[id]/fixtures/[sessionId]" options={{ title: 'Fixtures' }} />
      <Stack.Screen name="[id]/pay/[sessionId]" options={{ title: 'Confirm place' }} />
      <Stack.Screen
        name="[id]/verify-payments/[sessionId]"
        options={{ title: 'Verify payments' }}
      />
      <Stack.Screen name="[id]/session/[sessionId]" options={{ title: 'Mix-in' }} />
      <Stack.Screen name="[id]/fill-spot/[sessionId]" options={{ title: 'Fill spot' }} />
      <Stack.Screen name="[id]/session-room/[roomId]" options={{ title: 'Session room' }} />
    </Stack>
  );
}
