import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import {
  getDemoPaymentSettings,
  saveDemoPaymentSettings,
  type DemoPaymentSettings,
} from './demo-store';
import { getSupabase, getSupabaseLoose, isSupabaseConfigured } from './supabase';

export type PaymentMethod = 'revolut' | 'bizum' | 'stripe' | 'cash';

export type ConnectStatus = 'not_connected' | 'onboarding' | 'pending' | 'ready';

export type GroupPaymentSettings = {
  group_id: string;
  preferred_method: PaymentMethod;
  revolut_me_code: string | null;
  revolut_me_url: string | null;
  bizum_phone: string | null;
  bizum_name: string | null;
  stripe_enabled: boolean;
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean;
  stripe_details_submitted: boolean;
  payment_note: string | null;
};

function fromDemo(s: DemoPaymentSettings): GroupPaymentSettings {
  return {
    ...s,
    stripe_account_id: s.stripe_account_id ?? null,
    stripe_charges_enabled: Boolean(s.stripe_charges_enabled),
    stripe_details_submitted: Boolean(s.stripe_details_submitted),
  };
}

function mapRow(data: Record<string, unknown>, groupId: string): GroupPaymentSettings {
  return {
    group_id: (data.group_id as string) ?? groupId,
    preferred_method: (data.preferred_method as PaymentMethod) ?? 'stripe',
    revolut_me_code: (data.revolut_me_code as string | null) ?? null,
    revolut_me_url: (data.revolut_me_url as string | null) ?? null,
    bizum_phone: (data.bizum_phone as string | null) ?? null,
    bizum_name: (data.bizum_name as string | null) ?? null,
    stripe_enabled: Boolean(data.stripe_enabled),
    stripe_account_id: (data.stripe_account_id as string | null) ?? null,
    stripe_charges_enabled: Boolean(data.stripe_charges_enabled),
    stripe_details_submitted: Boolean(data.stripe_details_submitted),
    payment_note: (data.payment_note as string | null) ?? null,
  };
}

const SELECT_COLS =
  'group_id, preferred_method, revolut_me_code, revolut_me_url, bizum_phone, bizum_name, stripe_enabled, stripe_account_id, stripe_charges_enabled, stripe_details_submitted, payment_note';

export function isStripePayoutReady(settings: GroupPaymentSettings) {
  return Boolean(
    settings.stripe_enabled &&
      settings.stripe_charges_enabled &&
      settings.stripe_account_id,
  );
}

export function connectStatusFromSettings(settings: GroupPaymentSettings): ConnectStatus {
  if (!settings.stripe_account_id) return 'not_connected';
  if (isStripePayoutReady(settings)) return 'ready';
  if (settings.stripe_details_submitted) return 'pending';
  return 'onboarding';
}

export async function getGroupPaymentSettings(
  groupId: string,
  isGuest: boolean,
): Promise<GroupPaymentSettings> {
  if (isGuest || !isSupabaseConfigured || groupId.startsWith('demo-')) {
    return fromDemo(getDemoPaymentSettings(groupId));
  }

  const { data, error } = await getSupabaseLoose()
    .from('group_payment_settings')
    .select(SELECT_COLS)
    .eq('group_id', groupId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    return {
      group_id: groupId,
      preferred_method: 'stripe',
      revolut_me_code: null,
      revolut_me_url: null,
      bizum_phone: null,
      bizum_name: null,
      stripe_enabled: false,
      stripe_account_id: null,
      stripe_charges_enabled: false,
      stripe_details_submitted: false,
      payment_note: null,
    };
  }

  return mapRow(data as Record<string, unknown>, groupId);
}

async function invokeAuthed<T>(
  fn: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data: sessionData } = await getSupabase().auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Sign in again to continue.');

  const { data, error } = await getSupabaseLoose().functions.invoke(fn, {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) {
    let fromBody: string | undefined =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error?: unknown }).error ?? '')
        : undefined;
    // FunctionsHttpError often leaves `data` null, read the Response body.
    if (!fromBody && error && typeof error === 'object' && 'context' in error) {
      try {
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx.json === 'function') {
          const parsed = (await ctx.json()) as { error?: string };
          fromBody = parsed?.error;
        }
      } catch {
        /* ignore */
      }
    }
    throw new Error(fromBody || error.message || 'Request failed');
  }
  if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
    throw new Error(String((data as { error: string }).error));
  }
  return data as T;
}

/** Start or continue Stripe Connect Express onboarding for this group. */
export async function startStripeConnectOnboarding(input: {
  groupId: string;
  isGuest: boolean;
}): Promise<{ url: string }> {
  if (input.isGuest || !isSupabaseConfigured || input.groupId.startsWith('demo-')) {
    saveDemoPaymentSettings({
      ...getDemoPaymentSettings(input.groupId),
      preferred_method: 'stripe',
      stripe_enabled: true,
      stripe_account_id: 'demo_acct',
      stripe_charges_enabled: true,
      stripe_details_submitted: true,
    });
    return { url: Linking.createURL(`group/${input.groupId}/payments`, { queryParams: { stripe: 'return' } }) };
  }

  // Stripe Account Links require https return/refresh URLs (not padelnerdz://).
  // Edge function builds SUPABASE…/stripe-connect-return (or PUBLIC_SITE_URL) which deep-links back.
  return invokeAuthed<{ url: string }>('stripe-connect-onboard', {
    groupId: input.groupId,
  });
}

/** HTTPS URL Stripe redirects to after Connect, must match edge-function return_url. */
export function connectReturnUrl(groupId: string, stripe: 'return' | 'refresh' = 'return') {
  const site = process.env.EXPO_PUBLIC_SITE_URL?.replace(/\/$/, '');
  // Prefer marketing site when configured (never app schemes).
  if (site && /^https:/i.test(site)) {
    return `${site}/stripe/connect?groupId=${encodeURIComponent(groupId)}&stripe=${stripe}`;
  }
  // Default: public edge function that deep-links back into the app.
  const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
  if (supabaseUrl && /^https:/i.test(supabaseUrl)) {
    return `${supabaseUrl}/functions/v1/stripe-connect-return?groupId=${encodeURIComponent(groupId)}&stripe=${stripe}`;
  }
  return `https://asxqvytuzvnklptwoilj.supabase.co/functions/v1/stripe-connect-return?groupId=${encodeURIComponent(groupId)}&stripe=${stripe}`;
}

/** Refresh Connect account flags from Stripe into group_payment_settings. */
export async function refreshStripeConnectStatus(input: {
  groupId: string;
  isGuest: boolean;
}): Promise<{
  ready: boolean;
  status: ConnectStatus;
  settings: GroupPaymentSettings;
}> {
  if (input.isGuest || !isSupabaseConfigured || input.groupId.startsWith('demo-')) {
    const settings = fromDemo(getDemoPaymentSettings(input.groupId));
    const status = connectStatusFromSettings(settings);
    return { ready: status === 'ready', status, settings };
  }

  const remote = await invokeAuthed<{
    ready: boolean;
    status: ConnectStatus;
  }>('stripe-connect-status', { groupId: input.groupId });

  const settings = await getGroupPaymentSettings(input.groupId, false);
  return {
    ready: remote.ready,
    status: remote.status,
    settings,
  };
}

export async function createStripePaymentIntent(input: {
  sessionId: string;
  groupId: string;
  isGuest: boolean;
}): Promise<{
  clientSecret: string;
  paymentIntentId: string;
  amountCents: number;
  applicationFeeCents: number;
}> {
  if (input.isGuest || !isSupabaseConfigured || input.sessionId.startsWith('demo-')) {
    throw new Error('Card payments need a live session, leave demo / guest mode.');
  }
  return invokeAuthed('stripe-create-payment-intent', {
    sessionId: input.sessionId,
    groupId: input.groupId,
  });
}

/** After PaymentSheet succeeds, poll until webhook marks registration paid. */
export async function waitForStripePaymentUnlock(input: {
  sessionId: string;
  userId: string;
  attempts?: number;
}): Promise<{ paid: boolean; sessionRoomId: string | null }> {
  const attempts = input.attempts ?? 12;
  for (let i = 0; i < attempts; i++) {
    const { data: reg } = await getSupabaseLoose()
      .from('session_registrations')
      .select('status')
      .eq('session_id', input.sessionId)
      .eq('user_id', input.userId)
      .maybeSingle();
    if (reg?.status === 'paid') {
      const { data: room } = await getSupabaseLoose()
        .from('session_rooms')
        .select('id')
        .eq('session_id', input.sessionId)
        .maybeSingle();
      return { paid: true, sessionRoomId: (room?.id as string | undefined) ?? null };
    }
    await new Promise((r) => setTimeout(r, 700));
  }
  return { paid: false, sessionRoomId: null };
}

export function paymentMethodLabel(method: PaymentMethod) {
  if (method === 'stripe') return 'Card / Apple Pay / Google Pay';
  if (method === 'revolut') return 'Revolut (legacy)';
  if (method === 'bizum') return 'Bizum (legacy)';
  return 'Cash';
}

export function stripePublishableKey() {
  return process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
}

export function stripeMerchantDisplayName() {
  return 'Padel Nerdz';
}

/** Platform URL scheme helper for docs / debugging. */
export function stripeReturnSchemeHint() {
  return Platform.select({
    ios: 'padelnerdz://group/…/payments',
    android: 'padelnerdz://group/…/payments',
    default: 'padelnerdz://group/…/payments',
  });
}
