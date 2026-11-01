import { colors, spacing } from '@padel-nerdz/config';
import type { ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

/** Nav bar body below the status bar (matches apps/mobile glass headers). */
const STACK_HEADER_BODY = Platform.OS === 'ios' ? 52 : 56;

type Props = {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  /** Safe-area edges. Omit top inside stack screens that already show a nav header. */
  edges?: readonly Edge[];
};

export function Screen({
  children,
  scroll = false,
  style,
  contentStyle,
  edges = ['top', 'left', 'right'],
}: Props) {
  const insets = useSafeAreaInsets();
  const omitTop = !edges.includes('top');
  // Transparent glass headers overlay the scene — pad under status bar + nav bar.
  const headerPad = omitTop ? insets.top + STACK_HEADER_BODY : 0;

  // Apply header pad last so screen contentStyle can't pull UI under a glass header.
  const underHeaderPad = headerPad
    ? { paddingTop: spacing.md + headerPad }
    : null;

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, contentStyle, underHeaderPad]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      showsVerticalScrollIndicator={false}
      automaticallyAdjustKeyboardInsets
      onScrollBeginDrag={Keyboard.dismiss}
    >
      {children}
    </ScrollView>
  ) : (
    <Pressable style={styles.flex} onPress={Keyboard.dismiss} accessible={false}>
      <View
        style={[styles.content, styles.flex, contentStyle, underHeaderPad]}
        pointerEvents="box-none"
      >
        {children}
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.safe, style]} edges={edges}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        {body}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
});
