import { spacing } from '@padel-nerdz/config';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Nav-bar body height under the status bar when `headerTransparent` glass is on.
 * Keep in sync with stack `headerStyle` / default RN header metrics.
 */
export const GLASS_NAV_BODY = Platform.OS === 'ios' ? 44 : 56;

/** Top inset so scroll/list content clears the sticky glass header. */
export function useGlassHeaderOffset(extra: number = spacing.md): number {
  const insets = useSafeAreaInsets();
  return insets.top + GLASS_NAV_BODY + extra;
}
