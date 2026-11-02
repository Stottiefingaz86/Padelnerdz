import { colors, spacing } from '@padel-nerdz/config';
import { Screen } from '@padel-nerdz/ui';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { tap } from '@/lib/feedback';

/**
 * Honour / Bizum verify removed. Kept as a route so old deep links don’t crash , 
 * points organisers at Stripe auto-unlock.
 */
export default function VerifyPaymentsScreen() {
  const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();

  return (
    <Screen scroll contentStyle={styles.content}>
      <Stack.Screen options={{ title: 'Payments', headerBackTitle: 'Mix-in' }} />
      <Text style={styles.kicker}>STRIPE ONLY</Text>
      <Text style={styles.title}>No manual verify</Text>
      <Text style={styles.body}>
        Players pay in-app with Stripe (card / Apple Pay / Google Pay). When payment succeeds, the
        webhook marks them paid and unlocks session chat automatically.
      </Text>
      <Text style={styles.body}>
        Bizum / Revolut “I’ve paid” claims are disabled so places can’t be unlocked without a real
        charge.
      </Text>
      <AppButton
        label="Back to mix-in"
        onPress={() => {
          void tap();
          if (id && sessionId) {
            router.replace(`/group/${id}/session/${sessionId}`);
          } else {
            router.back();
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  kicker: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.accentGreen,
  },
  title: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 24,
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  body: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
});
