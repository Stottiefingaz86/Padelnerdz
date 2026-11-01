import { colors, spacing } from '@padel-nerdz/config';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuth } from '@/lib/auth';
import { success, tap } from '@/lib/feedback';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { continueAsGuest } = useAuth();

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require('../../assets/images/landing-hero.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <View style={styles.darken} pointerEvents="none" />
      <LinearGradient
        colors={['rgba(11,13,16,0.45)', 'rgba(11,13,16,0.55)', 'rgba(11,13,16,0.92)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View
        style={[
          styles.content,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg },
        ]}
      >
        <Animated.View entering={FadeIn.duration(420)} style={styles.hero}>
          <BrandLogo size="hero" />
          <Animated.Text entering={FadeInDown.delay(60).duration(320)} style={styles.headline}>
            Your padel groups,{'\n'}organised.
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(110).duration(320)} style={styles.copy}>
            Group chats, mix-in sign-ups, and court sessions — built for clubs and regulars.
          </Animated.Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(300)} style={styles.actions}>
          <AppButton label="Sign up with phone" onPress={() => router.push('/(auth)/phone')} />
          {process.env.EXPO_PUBLIC_ALLOW_LOCAL_PHONE_FALLBACK === 'true' ? (
            <Pressable
              onPress={() => {
                void tap();
                void success();
                continueAsGuest('Demo Player', { complete: true });
                router.replace('/(tabs)/chats');
              }}
              hitSlop={8}
              style={styles.demoLink}
            >
              <Text style={styles.demoText}>Just looking around? Try a quick demo</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  darken: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },
  hero: {
    gap: spacing.md,
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  headline: {
    marginTop: spacing.md,
    fontFamily: 'Figtree_700Bold',
    fontSize: 32,
    letterSpacing: -1,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 38,
  },
  copy: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    lineHeight: 23,
    maxWidth: 320,
  },
  actions: {
    gap: spacing.md,
  },
  demoLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  demoText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
});
