import { useStripe } from '@stripe/stripe-react-native';

export function useStripePay() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  return {
    supported: true as const,
    initPaymentSheet,
    presentPaymentSheet,
  };
}
