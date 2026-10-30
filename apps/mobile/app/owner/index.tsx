import { colors, spacing } from '@padel-nerdz/config';
import { Screen } from '@padel-nerdz/ui';
import { Stack } from 'expo-router';
import { Linking, StyleSheet, Text, Pressable } from 'react-native';

const ADMIN_URL =
  process.env.EXPO_PUBLIC_ADMIN_URL ?? 'http://localhost:3000/admin';

/**
 * Platform owner entry — metrics live on the web back office, not in the consumer app.
 */
export default function OwnerDashboardScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Owner', headerShown: true }} />
      <Screen contentStyle={styles.content}>
        <Text style={styles.kicker}>PADEL NERDZ · OWNER</Text>
        <Text style={styles.title}>Metrics moved</Text>
        <Text style={styles.sub}>
          Sign-ups, commission (fee + IVA), and PostHog product analytics are on the admin back
          office — not in the player app.
        </Text>
        <Pressable
          style={styles.cta}
          onPress={() => {
            void Linking.openURL(ADMIN_URL);
          }}
        >
          <Text style={styles.ctaText}>Open back office</Text>
        </Pressable>
        <Text style={styles.hint}>{ADMIN_URL}</Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  kicker: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.accentGreen,
  },
  title: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 30,
    color: colors.textPrimary,
    letterSpacing: -0.8,
  },
  sub: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  cta: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.accentGreen,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  ctaText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 15,
    color: colors.background,
  },
  hint: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
});
