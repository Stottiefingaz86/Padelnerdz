import { colors, spacing, typography } from '@padel-nerdz/config';
import { PressableScale } from '@padel-nerdz/ui';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { select } from '@/lib/feedback';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
};

export function AuthShell({ title, subtitle, children, footer, onBack }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.nav}>
        {onBack ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={12}
            onPress={onBack}
            onPressFeedback={() => {
              void select();
            }}
            style={styles.backBtn}
          >
            <Text style={styles.backChevron}>‹</Text>
            <Text style={styles.backLabel}>Back</Text>
          </PressableScale>
        ) : (
          <View style={styles.backSpacer} />
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <Animated.Text entering={FadeInDown.duration(320)} style={styles.title}>
            {title}
          </Animated.Text>
          {subtitle ? (
            <Animated.Text entering={FadeInDown.delay(40).duration(320)} style={styles.subtitle}>
              {subtitle}
            </Animated.Text>
          ) : null}
          <Animated.View entering={FadeInRight.delay(80).duration(360)} style={styles.body}>
            {children}
          </Animated.View>
        </ScrollView>

        {footer ? (
          <Animated.View
            entering={FadeInDown.delay(120).duration(280)}
            style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
          >
            {footer}
          </Animated.View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  nav: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
    paddingVertical: 6,
    paddingRight: 12,
  },
  backSpacer: {
    height: 32,
  },
  backChevron: {
    fontSize: 34,
    lineHeight: 34,
    color: colors.accentGreen,
    fontWeight: '300',
    marginTop: -2,
  },
  backLabel: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 16,
    color: colors.accentGreen,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 30,
    letterSpacing: -0.9,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 23,
    marginBottom: spacing.lg,
  },
  body: {
    gap: spacing.md,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
});
