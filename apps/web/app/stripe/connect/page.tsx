import type { Metadata } from 'next';
import { ConnectReturnClient } from './connect-return-client';

export const metadata: Metadata = {
  title: 'Stripe Connect',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined) {
  if (Array.isArray(v)) return v[0];
  return v;
}

/**
 * HTTPS landing page Stripe redirects to after Connect onboarding.
 * Deep-links back into the mobile app (custom scheme + https fallback).
 */
export default async function StripeConnectReturnPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const groupId = first(params.groupId)?.trim() ?? '';
  const stripe = first(params.stripe)?.trim() === 'refresh' ? 'refresh' : 'return';

  return <ConnectReturnClient groupId={groupId} stripe={stripe} />;
}
