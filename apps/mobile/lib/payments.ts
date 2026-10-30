import * as Linking from 'expo-linking';
import { Share } from 'react-native';

import {
  getDemoPaymentSettings,
  saveDemoPaymentSettings,
  type DemoPaymentSettings,
} from './demo-store';
import { getSupabaseLoose, isSupabaseConfigured } from './supabase';

export type PaymentMethod = 'revolut' | 'bizum' | 'stripe' | 'cash';

export type GroupPaymentSettings = {
  group_id: string;
  preferred_method: PaymentMethod;
  revolut_me_code: string | null;
  revolut_me_url: string | null;
  bizum_phone: string | null;
  bizum_name: string | null;
  stripe_enabled: boolean;
  payment_note: string | null;
};

function normalizeRevolutCode(raw: string) {
  const trimmed = raw.trim().replace(/^@/, '');
  if (!trimmed) return '';
  if (trimmed.includes('revolut.me/')) {
    const part = trimmed.split('revolut.me/')[1]?.split(/[?#]/)[0] ?? '';
    return part.replace(/\/$/, '');
  }
  return trimmed.replace(/^\//, '');
}

export function revolutMeUrlFromCode(code: string | null | undefined) {
  const c = normalizeRevolutCode(code ?? '');
  if (!c) return null;
  return `https://revolut.me/${c}`;
}

function fromDemo(s: DemoPaymentSettings): GroupPaymentSettings {
  return { ...s };
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
    .select(
      'group_id, preferred_method, revolut_me_code, revolut_me_url, bizum_phone, bizum_name, stripe_enabled, payment_note',
    )
    .eq('group_id', groupId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    return {
      group_id: groupId,
      preferred_method: 'revolut',
      revolut_me_code: null,
      revolut_me_url: null,
      bizum_phone: null,
      bizum_name: null,
      stripe_enabled: false,
      payment_note: null,
    };
  }

  return {
    group_id: data.group_id,
    preferred_method: data.preferred_method as PaymentMethod,
    revolut_me_code: data.revolut_me_code,
    revolut_me_url: data.revolut_me_url ?? revolutMeUrlFromCode(data.revolut_me_code),
    bizum_phone: data.bizum_phone,
    bizum_name: data.bizum_name,
    stripe_enabled: Boolean(data.stripe_enabled),
    payment_note: data.payment_note,
  };
}

export async function saveGroupPaymentSettings(input: {
  groupId: string;
  userId: string;
  isGuest: boolean;
  preferred_method: PaymentMethod;
  revolut_me_code?: string;
  bizum_phone?: string;
  bizum_name?: string;
  payment_note?: string;
}): Promise<GroupPaymentSettings> {
  const code = normalizeRevolutCode(input.revolut_me_code ?? '');
  const url = revolutMeUrlFromCode(code);

  if (input.isGuest || !isSupabaseConfigured || input.groupId.startsWith('demo-')) {
    return fromDemo(
      saveDemoPaymentSettings({
        group_id: input.groupId,
        preferred_method: input.preferred_method,
        revolut_me_code: code || null,
        revolut_me_url: url,
        bizum_phone: input.bizum_phone?.trim() || null,
        bizum_name: input.bizum_name?.trim() || null,
        stripe_enabled: false,
        payment_note: input.payment_note?.trim() || null,
      }),
    );
  }

  const row = {
    group_id: input.groupId,
    preferred_method: input.preferred_method,
    revolut_me_code: code || null,
    revolut_me_url: url,
    bizum_phone: input.bizum_phone?.trim() || null,
    bizum_name: input.bizum_name?.trim() || null,
    stripe_enabled: false,
    payment_note: input.payment_note?.trim() || null,
    updated_by: input.userId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await getSupabaseLoose()
    .from('group_payment_settings')
    .upsert(row, { onConflict: 'group_id' })
    .select(
      'group_id, preferred_method, revolut_me_code, revolut_me_url, bizum_phone, bizum_name, stripe_enabled, payment_note',
    )
    .single();

  if (error) throw error;
  return {
    group_id: data.group_id,
    preferred_method: data.preferred_method as PaymentMethod,
    revolut_me_code: data.revolut_me_code,
    revolut_me_url: data.revolut_me_url,
    bizum_phone: data.bizum_phone,
    bizum_name: data.bizum_name,
    stripe_enabled: Boolean(data.stripe_enabled),
    payment_note: data.payment_note,
  };
}

export function paymentMethodLabel(method: PaymentMethod) {
  if (method === 'revolut') return 'Revolut';
  if (method === 'bizum') return 'Bizum';
  if (method === 'stripe') return 'Stripe';
  return 'Cash';
}

/** Open the organiser's preferred pay destination. */
export async function openPaymentDestination(
  settings: GroupPaymentSettings,
  amountLabel?: string,
): Promise<'opened' | 'shared' | 'missing'> {
  const method = settings.preferred_method;

  if (method === 'revolut') {
    const url = settings.revolut_me_url || revolutMeUrlFromCode(settings.revolut_me_code);
    if (!url) return 'missing';
    // Always try openURL first — canOpenURL is unreliable for https on iOS
    try {
      await Linking.openURL(url);
      return 'opened';
    } catch {
      await Share.share({
        message: `Pay${amountLabel ? ` ${amountLabel}` : ''} via Revolut: ${url}`,
        url,
      });
      return 'shared';
    }
  }

  if (method === 'bizum') {
    if (!settings.bizum_phone) return 'missing';
    const name = settings.bizum_name ? ` (${settings.bizum_name})` : '';
    await Share.share({
      message: `Bizum${amountLabel ? ` ${amountLabel}` : ''} to ${settings.bizum_phone}${name}. Open your banking app → Bizum → send to this number.`,
    });
    return 'shared';
  }

  if (method === 'cash') {
    await Share.share({
      message: `Pay${amountLabel ? ` ${amountLabel}` : ''} in cash to the organiser at the courts.`,
    });
    return 'shared';
  }

  if (method === 'stripe') {
    return 'missing';
  }

  return 'missing';
}
