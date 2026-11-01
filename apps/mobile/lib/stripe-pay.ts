export function useStripePay() {
  return {
    supported: false as const,
    initPaymentSheet: async () => ({
      error: { message: 'Stripe payments require the iOS or Android app.', code: 'Unavailable' },
    }),
    presentPaymentSheet: async () => ({
      error: { message: 'Stripe payments require the iOS or Android app.', code: 'Unavailable' },
    }),
  };
}
