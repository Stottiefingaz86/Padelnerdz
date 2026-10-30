import { colors, typography } from '@padel-nerdz/config';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  size?: 'sm' | 'lg';
  /** Optional real logo image from the app layer */
  logo?: ReactNode;
};

/** Fallback wordmark; prefer passing the real BrandLogo from the app. */
export function BrandMark({ size = 'lg', logo }: Props) {
  if (logo) {
    return <View style={styles.wrap}>{logo}</View>;
  }

  const mark = size === 'sm' ? 44 : 64;
  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.mark,
          {
            width: mark,
            height: mark,
            borderRadius: size === 'sm' ? 14 : 18,
          },
        ]}
      >
        <Text style={[styles.monogram, size === 'sm' && styles.monogramSm]}>PN</Text>
      </View>
      <Text style={[styles.wordmark, size === 'sm' && styles.wordmarkSm]}>Padel Nerdz</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 12,
  },
  mark: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogram: {
    ...typography.title,
    color: colors.accentGreen,
    letterSpacing: 1.2,
  },
  monogramSm: {
    fontSize: 16,
  },
  wordmark: {
    ...typography.display,
    color: colors.textPrimary,
  },
  wordmarkSm: {
    fontSize: 18,
  },
});
