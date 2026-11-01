/** Minimal Stripe REST helpers for Edge Functions (no npm stripe SDK). */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const STRIPE_API = 'https://api.stripe.com/v1';

let secretCache: Record<string, string> = {};

function adminClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key);
}

/** Resolve a platform secret from Edge env, then Vault via public.app_secret. */
export async function resolveAppSecret(name: string): Promise<string | null> {
  const fromEnv = Deno.env.get(name)?.trim();
  if (fromEnv) return fromEnv;
  if (secretCache[name]) return secretCache[name];
  const admin = adminClient();
  if (!admin) return null;
  const { data, error } = await admin.rpc('app_secret', { secret_name: name });
  if (error || typeof data !== 'string' || !data) return null;
  secretCache[name] = data;
  return data;
}

export async function stripeSecret(): Promise<string> {
  const key = await resolveAppSecret('STRIPE_SECRET_KEY');
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set (env or vault)');
  return key;
}

export function formBody(
  params: Record<string, string | number | boolean | undefined | null>,
) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    body.append(k, String(v));
  }
  return body;
}

export async function stripeRequest<T = Record<string, unknown>>(
  path: string,
  init?: { method?: string; body?: URLSearchParams },
): Promise<T> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${await stripeSecret()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: init?.body,
  });
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(data.error?.message || `Stripe ${res.status}`);
  }
  return data;
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, stripe-signature',
  };
}
