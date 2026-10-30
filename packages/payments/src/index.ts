/** Payment orchestration abstraction — manual now, marketplace later. */

export type PaymentMode = 'manual' | 'integrated';

export type ManualPaymentMethod = {
  id: string;
  label: string;
  instructions: string;
};

export type PaymentProvider = {
  mode: PaymentMode;
  listManualMethods: (groupId: string) => Promise<ManualPaymentMethod[]>;
};

export const defaultPaymentMode: PaymentMode = 'manual';
