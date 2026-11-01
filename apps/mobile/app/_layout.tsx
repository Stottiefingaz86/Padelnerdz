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
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import 'react-native-reanimated';

import { colors } from '@padel-nerdz/config';

import { AnalyticsProvider } from '@/components/AnalyticsProvider';
import { CelebrationProvider } from '@/components/CelebrationHost';
import { ChatNotifier } from '@/components/ChatNotifier';
import { GlassHeaderBackground } from '@/components/GlassHeaderBackground';
import { HeaderBack } from '@/components/HeaderBack';
import { StripeRoot } from '@/components/StripeRoot';
import { navigationTheme } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import {
  biometricLabel,
  clearBiometricLock,
  getBiometricKind,
  isBiometricLockEnabled,
  unlockWithBiometric,
} from '@/lib/biometric';
import { tap } from '@/lib/feedback';

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
  const [lockChecked, setLockChecked] = useState(Platform.OS === 'web');
  const [lockEnabled, setLockEnabled] = useState(false);
  const [lockLabel, setLockLabel] = useState('Face ID');
  const [unlocking, setUnlocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState as AppStateStatus);
  const backgroundedAt = useRef<number | null>(null);
  const unlockingRef = useRef(false);
  const autoFaceIdDone = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setFontTimedOut(true), Platform.OS === 'web' ? 1500 : 5000);
    return () => clearTimeout(t);
  }, []);

  const fontsReady = fontsLoaded || Boolean(fontError) || fontTimedOut;

  useEffect(() => {
    void getBiometricKind().then((kind) => setLockLabel(biometricLabel(kind)));
  }, []);

  // Resolve whether lock is on — do NOT prompt Face ID here (window may not be ready).
  useEffect(() => {
    if (!ready || !fontsReady || Platform.OS === 'web') return;
    void SplashScreen.hideAsync();
    let cancelled = false;
    void (async () => {
      const on = await isBiometricLockEnabled();
      if (cancelled) return;
      setLockEnabled(on);
      setLockChecked(true);
      if (!on) setUnlocked(true);
      else setUnlocked(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, fontsReady]);

  // Re-lock after real backgrounding (not Face ID sheet → inactive).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appState.current;
      appState.current = next;
      if (unlockingRef.current) return;
      if (prev === 'active' && next === 'background') {
        backgroundedAt.current = Date.now();
        return;
      }
      if (next === 'active' && backgroundedAt.current != null) {
        const awayMs = Date.now() - backgroundedAt.current;
        backgroundedAt.current = null;
        if (awayMs < 12_000) return;
        void (async () => {
          if (!(await isBiometricLockEnabled())) return;
          autoFaceIdDone.current = false;
          setUnlocked(false);
          setLockEnabled(true);
          setLockError(null);
        })();
      }
    });
    return () => sub.remove();
  }, []);

  async function runUnlock(allowDeviceFallback: boolean) {
    if (unlockingRef.current) return;
    unlockingRef.current = true;
    setUnlocking(true);
    setLockError(null);
    try {
      const result = await unlockWithBiometric({ allowDeviceFallback });
      setUnlocked(result.success);
      if (!result.success && result.error) {
        setLockError(result.error);
      }
    } finally {
      unlockingRef.current = false;
      setUnlocking(false);
    }
  }

  // Auto-launch Face ID once the branded lock screen is actually mounted.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!lockChecked || !lockEnabled || unlocked) return;
    if (autoFaceIdDone.current) return;
    autoFaceIdDone.current = true;
    const t = setTimeout(() => {
      void runUnlock(false);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot when gate appears
  }, [lockChecked, lockEnabled, unlocked]);

  async function onTurnOffLock() {
    void tap();
    await clearBiometricLock();
    setLockEnabled(false);
    setLockError(null);
    setUnlocked(true);
  }

  if (!ready || !fontsReady || !lockChecked) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.accentGreen} size="large" />
      </View>
    );
  }

  if (!unlocked && lockEnabled) {
    return (
      <View style={styles.lockGate}>
        <StatusBar style="light" />
        <View style={styles.lockMark}>
          <Text style={styles.lockMarkText}>PN</Text>
        </View>
        <Text style={styles.lockKicker}>PADEL NERDZ</Text>
        <Text style={styles.lockTitle}>Locked</Text>
        <Text style={styles.lockBody}>
          Use {lockLabel} to open your chats and mix-ins.
        </Text>
        {lockError ? <Text style={styles.lockError}>{lockError}</Text> : null}
        <Pressable
          style={[styles.unlockBtn, unlocking && { opacity: 0.6 }]}
          disabled={unlocking}
          onPress={() => {
            void tap();
            void runUnlock(false);
          }}
        >
          <Text style={styles.unlockText}>
            {unlocking ? `Waiting for ${lockLabel}…` : `Unlock with ${lockLabel}`}
          </Text>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          disabled={unlocking}
          onPress={() => {
            void tap();
            void runUnlock(true);
          }}
        >
          <Text style={styles.secondaryText}>Unlock with device passcode</Text>
        </Pressable>
        <Pressable
          style={styles.ghostBtn}
          disabled={unlocking}
          onPress={() => void onTurnOffLock()}
        >
          <Text style={styles.ghostText}>Turn off app lock</Text>
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
  // StripeRoot is a no-op on web — native Stripe SDK breaks Metro web bundles.
  return (
    <AuthProvider>
      <StripeRoot>
        <ThemeProvider value={navigationTheme}>
          <AnalyticsProvider>
            <CelebrationProvider>
              <RootNavigator />
            </CelebrationProvider>
          </AnalyticsProvider>
        </ThemeProvider>
      </StripeRoot>
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
  lockGate: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  lockMark: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  lockMarkText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 24,
    color: '#0B0D10',
    letterSpacing: -0.5,
  },
  lockKicker: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.accentGreen,
  },
  lockTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 28,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  lockBody: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
    maxWidth: 320,
  },
  lockError: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: colors.error,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: 4,
  },
  unlockBtn: {
    backgroundColor: colors.accentGreen,
    paddingHorizontal: 28,
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    maxWidth: 340,
  },
  unlockText: {
    fontFamily: 'Figtree_700Bold',
    color: '#0B0D10',
    fontSize: 16,
  },
  secondaryBtn: {
    marginTop: 4,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    alignSelf: 'stretch',
    maxWidth: 340,
  },
  secondaryText: {
    fontFamily: 'Figtree_600SemiBold',
    color: colors.textPrimary,
    fontSize: 15,
  },
  ghostBtn: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  ghostText: {
    fontFamily: 'Figtree_400Regular',
    color: colors.textMuted,
    fontSize: 14,
  },
});
