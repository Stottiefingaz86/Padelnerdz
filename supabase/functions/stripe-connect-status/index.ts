import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const STRIPE_API = "https://api.stripe.com/v1";

let secretCache: Record<string, string> = {};

async function resolveAppSecret(name: string): Promise<string | null> {
  const fromEnv = Deno.env.get(name)?.trim();
  if (fromEnv) return fromEnv;
  if (secretCache[name]) return secretCache[name];
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  const admin = createClient(url, key);
  const { data, error } = await admin.rpc("app_secret", { secret_name: name });
  if (error || typeof data !== "string" || !data) return null;
  secretCache[name] = data;
  return data;
}

async function stripeSecret(): Promise<string> {
  const key = await resolveAppSecret("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set (env or vault)");
  return key;
}

function formBody(params: Record<string, string | number | boolean | undefined | null>) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    body.append(k, String(v));
  }
  return body;
}

async function stripeRequest<T = Record<string, unknown>>(
  path: string,
  init?: { method?: string; body?: URLSearchParams },
): Promise<T> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${await stripeSecret()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: init?.body,
  });
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(data.error?.message || `Stripe ${res.status}`);
  }
  return data;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, stripe-signature",
  };
}


type Body = { groupId: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);

  const body = (await req.json()) as Body;
  if (!body.groupId) return json({ error: "groupId required" }, 400);

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: membership } = await admin
    .from("group_memberships")
    .select("role")
    .eq("group_id", body.groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return json({ error: "Not a group member" }, 403);

  const { data: settings } = await admin
    .from("group_payment_settings")
    .select(
      "stripe_account_id, stripe_charges_enabled, stripe_details_submitted, stripe_enabled, preferred_method",
    )
    .eq("group_id", body.groupId)
    .maybeSingle();

  const accountId = settings?.stripe_account_id as string | null | undefined;
  if (!accountId) {
    return json({
      ready: false,
      status: "not_connected",
      stripe_account_id: null,
      stripe_charges_enabled: false,
      stripe_details_submitted: false,
    });
  }

  const account = await stripeRequest<{
    charges_enabled: boolean;
    details_submitted: boolean;
    payouts_enabled: boolean;
  }>(`/accounts/${accountId}`);

  const ready = Boolean(account.charges_enabled && account.details_submitted);

  await admin.from("group_payment_settings").upsert(
    {
      group_id: body.groupId,
      preferred_method: "stripe",
      stripe_account_id: accountId,
      stripe_charges_enabled: account.charges_enabled,
      stripe_details_submitted: account.details_submitted,
      stripe_enabled: ready,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "group_id" },
  );

  return json({
    ready,
    status: ready ? "ready" : account.details_submitted ? "pending" : "onboarding",
    stripe_account_id: accountId,
    stripe_charges_enabled: account.charges_enabled,
    stripe_details_submitted: account.details_submitted,
    payouts_enabled: account.payouts_enabled,
  });
});