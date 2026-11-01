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


/** 8% of event (court) fee + 21% IVA on that fee */
const PLATFORM_FEE_RATE = 0.08;
const PLATFORM_IVA_RATE = 0.21;

function priceBreakdown(courtCents: number) {
  const court = Math.max(0, courtCents);
  const fee = Math.round(court * PLATFORM_FEE_RATE);
  const ivaCents = Math.round(fee * PLATFORM_IVA_RATE);
  const platformTakeCents = fee + ivaCents;
  return {
    courtCents: court,
    feeCents: fee,
    platformTakeCents,
    playerTotalCents: court + platformTakeCents,
  };
}

type Body = { sessionId: string; groupId: string };

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
  if (!body.sessionId || !body.groupId) {
    return json({ error: "sessionId and groupId required" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: session } = await admin
    .from("sessions")
    .select("id, group_id, title, price_cents, commission_cents")
    .eq("id", body.sessionId)
    .maybeSingle();
  if (!session || session.group_id !== body.groupId) {
    return json({ error: "Session not found" }, 404);
  }

  const { data: reg } = await admin
    .from("session_registrations")
    .select("id, status")
    .eq("session_id", body.sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!reg) return json({ error: "You are not registered for this mix-in" }, 400);
  const status = reg.status as string;
  if (status === "paid") {
    return json({ error: "Already paid", alreadyPaid: true }, 400);
  }
  if (!["selected", "payment_claimed"].includes(status)) {
    return json({ error: "You need to be selected by the organiser first" }, 400);
  }

  const { data: pay } = await admin
    .from("group_payment_settings")
    .select("stripe_account_id, stripe_charges_enabled, stripe_enabled")
    .eq("group_id", body.groupId)
    .maybeSingle();

  const accountId = pay?.stripe_account_id as string | null | undefined;
  if (!accountId || !pay?.stripe_charges_enabled) {
    return json(
      {
        error:
          "Organiser hasn’t finished payout setup. Ask them to connect their bank in Admin → Payments.",
      },
      400,
    );
  }

  const breakdown = priceBreakdown((session.price_cents as number | null) ?? 0);
  if (breakdown.playerTotalCents < 50) {
    return json({ error: "Amount too low for card payment" }, 400);
  }

  // Reuse open intent if still unpaid
  const { data: existing } = await admin
    .from("session_payment_intents")
    .select("stripe_payment_intent_id, status, amount_cents")
    .eq("session_id", body.sessionId)
    .eq("user_id", user.id)
    .eq("status", "requires_payment")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.stripe_payment_intent_id) {
    try {
      const pi = await stripeRequest<{
        id: string;
        client_secret: string | null;
        status: string;
      }>(`/payment_intents/${existing.stripe_payment_intent_id}`);
      if (
        pi.client_secret &&
        ["requires_payment_method", "requires_confirmation", "requires_action"].includes(
          pi.status,
        )
      ) {
        return json({
          clientSecret: pi.client_secret,
          paymentIntentId: pi.id,
          amountCents: breakdown.playerTotalCents,
          applicationFeeCents: breakdown.platformTakeCents,
        });
      }
    } catch {
      // create a fresh intent below
    }
  }

  const intent = await stripeRequest<{
    id: string;
    client_secret: string;
  }>("/payment_intents", {
    method: "POST",
    body: formBody({
      amount: breakdown.playerTotalCents,
      currency: "eur",
      "automatic_payment_methods[enabled]": true,
      application_fee_amount: breakdown.platformTakeCents,
      "transfer_data[destination]": accountId,
      "metadata[session_id]": body.sessionId,
      "metadata[group_id]": body.groupId,
      "metadata[user_id]": user.id,
      "metadata[session_title]": String(session.title ?? "Mix-in").slice(0, 100),
      description: `Padel Nerdz · ${String(session.title ?? "Mix-in").slice(0, 80)}`,
    }),
  });

  await admin.from("session_payment_intents").insert({
    session_id: body.sessionId,
    group_id: body.groupId,
    user_id: user.id,
    stripe_payment_intent_id: intent.id,
    amount_cents: breakdown.playerTotalCents,
    application_fee_cents: breakdown.platformTakeCents,
    currency: "eur",
    status: "requires_payment",
  });

  return json({
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    amountCents: breakdown.playerTotalCents,
    applicationFeeCents: breakdown.platformTakeCents,
  });
});