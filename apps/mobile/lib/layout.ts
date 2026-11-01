import { spacing } from '@padel-nerdz/config';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Nav-bar body height under the status bar when `headerTransparent` glass is on.
 * Keep in sync with stack `headerStyle` / default RN header metrics.
 * Slightly tall so list/scroll content never slips under the glass bar.
 */
export const GLASS_NAV_BODY = Platform.OS === 'ios' ? 52 : 56;

/** Top inset so scroll/list content clears the sticky glass header. */
export function useGlassHeaderOffset(extra: number = spacing.md + 4): number {
  const insets = useSafeAreaInsets();
  // Web / Android often report a short status bar; keep a floor so content never sits under glass.
  const top = Math.max(insets.top, Platform.OS === 'web' ? 24 : Platform.OS === 'android' ? 8 : 0);
  return top + GLASS_NAV_BODY + extra;
}
