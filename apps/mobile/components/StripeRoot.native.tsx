import { StripeProvider } from '@stripe/stripe-react-native';
import type { ReactNode } from 'react';

import { stripePublishableKey } from '@/lib/payments';

/** Native Stripe provider, not used on web (see StripeRoot.web.tsx). */
export function StripeRoot({ children }: { children: ReactNode }) {
  const publishableKey = stripePublishableKey();
  return (
    <StripeProvider
      publishableKey={publishableKey || 'pk_test_placeholder'}
      merchantIdentifier="merchant.com.padelnerdz.app"
      urlScheme="padelnerdz"
    >
      {children}
    </StripeProvider>
  );
}
