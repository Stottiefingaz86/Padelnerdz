import { colors } from '@padel-nerdz/config';
import type { LucideIcon, LucideProps } from 'lucide-react-native';
import { View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';

/** Standard sizes ,  keep UI icons on this scale only. */
export const iconSize = {
  sm: 18,
  md: 22,
  lg: 24,
  xl: 28,
} as const;

export type IconSize = keyof typeof iconSize;

type Props = {
  icon: LucideIcon;
  size?: IconSize | number;
  /** Tab bars pass ColorValue; Lucide needs a string. */
  color?: ColorValue;
  /** Lucide stroke; default 2 reads clearly at 22–24. */
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
} & Omit<LucideProps, 'size' | 'color' | 'strokeWidth'>;

/**
 * App-wide Lucide icon. Prefer this over expo-symbols / hand-drawn glyphs.
 * Browse: https://lucide.dev/icons
 */
export function Icon({
  icon: Glyph,
  size = 'md',
  color = colors.textPrimary,
  strokeWidth = 2,
  style,
  accessibilityLabel,
  ...rest
}: Props) {
  const px = typeof size === 'number' ? size : iconSize[size];
  const tint =
    typeof color === 'string' && color.length > 0 ? color : colors.textPrimary;
  return (
    <View
      style={[{ width: px, height: px, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      accessibilityLabel={accessibilityLabel}
    >
      <Glyph color={tint} size={px} strokeWidth={strokeWidth} {...rest} />
    </View>
  );
}
