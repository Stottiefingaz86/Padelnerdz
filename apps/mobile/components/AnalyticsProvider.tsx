import { PostHogProvider, usePostHog } from 'posthog-react-native';
import { useEffect, type ReactNode } from 'react';

import {
  bindPostHogClient,
  getPostHogApiKey,
  getPostHogHost,
  isAnalyticsEnabled,
} from '@/lib/analytics';

function PostHogBinder({ children }: { children: ReactNode }) {
  const client = usePostHog();
  useEffect(() => {
    if (!client) return;
    bindPostHogClient({
      // PostHog JSON types are stricter than our Props bag, cast at the boundary.
      capture: (event, properties) =>
        client.capture(event, properties as never),
      identify: (id, properties) =>
        client.identify(id, properties as never),
      reset: () => client.reset(),
    });
    return () => bindPostHogClient(null);
  }, [client]);
  return <>{children}</>;
}

/**
 * Must sit inside Expo Router's NavigationContainer.
 * Screen autocapture uses useNavigation, keep it off at the root wrapper;
 * we track product events explicitly via track().
 */
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  if (!isAnalyticsEnabled()) {
    return <>{children}</>;
  }

  return (
    <PostHogProvider
      apiKey={getPostHogApiKey()}
      options={{
        host: getPostHogHost(),
        enableSessionReplay: false,
      }}
      autocapture={{
        captureTouches: false,
        // Avoid useNavigation before NavigationContainer is ready (Expo web crash)
        captureScreens: false,
      }}
    >
      <PostHogBinder>{children}</PostHogBinder>
    </PostHogProvider>
  );
}
