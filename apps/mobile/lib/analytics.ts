import Constants from 'expo-constants';

type Props = Record<string, string | number | boolean | null | undefined>;

const APP_PROPS = { app: 'padel_nerdz', surface: 'mobile' as const };

type AnalyticsClient = {
  capture: (event: string, properties?: Props) => void;
  identify: (id: string, properties?: Props) => void;
  reset: () => void;
};

let posthog: AnalyticsClient | null = null;

export function getPostHogApiKey(): string {
  return (
    process.env.EXPO_PUBLIC_POSTHOG_KEY ??
    (Constants.expoConfig?.extra as { posthogKey?: string } | undefined)?.posthogKey ??
    ''
  );
}

export function getPostHogHost(): string {
  return (
    process.env.EXPO_PUBLIC_POSTHOG_HOST ??
    (Constants.expoConfig?.extra as { posthogHost?: string } | undefined)?.posthogHost ??
    'https://us.i.posthog.com'
  );
}

export function isAnalyticsEnabled(): boolean {
  return Boolean(getPostHogApiKey());
}

/** Called once PostHogProvider mounts / from the hook. */
export function bindPostHogClient(client: AnalyticsClient | null) {
  posthog = client;
}

export function track(event: string, properties?: Props) {
  if (!posthog) return;
  try {
    posthog.capture(event, { ...APP_PROPS, ...properties });
  } catch {
    /* analytics must never break UX */
  }
}

export function identifyUser(userId: string, properties?: Props) {
  if (!posthog) return;
  try {
    posthog.identify(userId, { ...APP_PROPS, ...properties });
  } catch {
    /* ignore */
  }
}

export function resetAnalytics() {
  if (!posthog) return;
  try {
    posthog.reset();
  } catch {
    /* ignore */
  }
}

export const AnalyticsEvents = {
  userSignedUp: 'user_signed_up',
  groupJoined: 'group_joined',
  sessionCreated: 'session_created',
  paymentClaimed: 'payment_claimed',
  paymentConfirmed: 'payment_confirmed',
  shopPartnerTap: 'shop_partner_tap',
  shopOpened: 'shop_opened',
} as const;
