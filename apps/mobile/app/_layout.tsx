import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  useFonts,
} from '@expo-google-fonts/figtree';
import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import { colors } from '@padel-nerdz/config';

import { AnalyticsProvider } from '@/components/AnalyticsProvider';
import { CelebrationProvider } from '@/components/CelebrationHost';
import { ChatNotifier } from '@/components/ChatNotifier';
import { GlassHeaderBackground } from '@/components/GlassHeaderBackground';
import { HeaderBack } from '@/components/HeaderBack';
import { navigationTheme } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { unlockWithBiometric } from '@/lib/biometric';

export { ErrorBoundary } from 'expo-router';

if (Platform.OS !== 'web') {
  void SplashScreen.preventAutoHideAsync();
}

function RootNavigator() {
  const { ready } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });
  // Never block forever if font fetch stalls (common on web)
  const [fontTimedOut, setFontTimedOut] = useState(false);
  const [unlocked, setUnlocked] = useState(Platform.OS === 'web');
  useEffect(() => {
    const t = setTimeout(() => setFontTimedOut(true), Platform.OS === 'web' ? 1500 : 5000);
    return () => clearTimeout(t);
  }, []);

  const fontsReady = fontsLoaded || Boolean(fontError) || fontTimedOut;

  useEffect(() => {
    if (ready && fontsReady && Platform.OS !== 'web') {
      void SplashScreen.hideAsync();
      void unlockWithBiometric().then(setUnlocked);
    }
  }, [ready, fontsReady]);

  if (!ready || !fontsReady) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.accentGreen} size="large" />
      </View>
    );
  }

  if (!unlocked) {
    return (
      <View style={styles.boot}>
        <Text style={styles.lockTitle}>Padel Nerdz is locked</Text>
        <Pressable
          style={styles.unlockBtn}
          onPress={() => void unlockWithBiometric().then(setUnlocked)}
        >
          <Text style={styles.unlockText}>Unlock</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade_from_bottom',
          animationDuration: 280,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(onboarding)" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="group"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="dm/[threadId]"
          options={{
            headerShown: true,
            animation: 'slide_from_right',
            headerTransparent: true,
            headerBackground: () => <GlassHeaderBackground />,
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: colors.textPrimary,
            headerBackVisible: false,
            headerTitleAlign: 'center',
            headerLeft: () => <HeaderBack fallbackHref="/inbox" />,
            title: 'Message',
          }}
        />
        <Stack.Screen
          name="inbox"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="join"
          options={{
            headerShown: true,
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerTransparent: true,
            headerBackground: () => <GlassHeaderBackground />,
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: colors.textPrimary,
            headerBackVisible: false,
            headerTitleAlign: 'center',
            headerLeft: () => <HeaderBack fallbackHref="/(tabs)/discover" />,
            title: 'Join Group',
          }}
        />
        <Stack.Screen
          name="friend/[tag]"
          options={{
            headerShown: true,
            presentation: 'modal',
            headerTransparent: true,
            headerBackground: () => <GlassHeaderBackground />,
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: colors.textPrimary,
            headerBackVisible: false,
            headerTitleAlign: 'center',
            headerLeft: () => <HeaderBack fallbackHref="/inbox" />,
            title: 'Add friend',
          }}
        />
        <Stack.Screen
          name="owner/index"
          options={{
            headerShown: true,
            title: 'Owner',
            headerTransparent: true,
            headerBackground: () => <GlassHeaderBackground />,
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: colors.textPrimary,
            headerBackVisible: false,
            headerTitleAlign: 'center',
            headerLeft: () => <HeaderBack fallbackHref="/(tabs)/profile" />,
          }}
        />
        <Stack.Screen
          name="privacy-settings"
          options={{
            headerShown: true,
            title: 'Privacy',
            headerTransparent: true,
            headerBackground: () => <GlassHeaderBackground />,
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: colors.textPrimary,
            headerBackVisible: false,
            headerTitleAlign: 'center',
            headerLeft: () => <HeaderBack fallbackHref="/(tabs)/profile" />,
          }}
        />
      </Stack>
      <ChatNotifier />
    </>
  );
}

export default function RootLayout() {
  // ThemeProvider/Stack establish navigation context before PostHog mounts.
  // PostHog must not wrap above NavigationContainer (useNavigation crash on web).
  return (
    <AuthProvider>
      <ThemeProvider value={navigationTheme}>
        <AnalyticsProvider>
          <CelebrationProvider>
            <RootNavigator />
          </CelebrationProvider>
        </AnalyticsProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    minHeight: Platform.OS === 'web' ? ('100vh' as unknown as number) : undefined,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 24,
  },
  lockTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 20,
    color: colors.textPrimary,
  },
  unlockBtn: {
    backgroundColor: colors.accentGreen,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  unlockText: {
    fontFamily: 'Figtree_700Bold',
    color: colors.background,
    fontSize: 16,
  },
});
