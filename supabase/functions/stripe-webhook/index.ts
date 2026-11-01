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


async function hmacSha256Hex(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
) {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k, v];
    }),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  const age = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (!Number.isFinite(age) || age > 300) return false;
  const expected = await hmacSha256Hex(secret, `${timestamp}.${payload}`);
  return timingSafeEqual(expected, signature);
}

async function unlockPaidPlace(
  admin: ReturnType<typeof createClient>,
  input: {
    sessionId: string;
    groupId: string;
    userId: string;
    paymentIntentId: string;
  },
) {
  const { data: intentRow } = await admin
    .from("session_payment_intents")
    .select("id, status")
    .eq("stripe_payment_intent_id", input.paymentIntentId)
    .maybeSingle();

  if (intentRow?.status === "succeeded") return { ok: true, duplicate: true };

  await admin
    .from("session_payment_intents")
    .update({
      status: "succeeded",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", input.paymentIntentId);

  const verifiedAt = new Date().toISOString();
  await admin
    .from("session_registrations")
    .update({
      status: "paid",
      payment_verified_at: verifiedAt,
    })
    .eq("session_id", input.sessionId)
    .eq("user_id", input.userId)
    .in("status", ["selected", "payment_claimed", "paid"]);

  const { data: session } = await admin
    .from("sessions")
    .select("id, title")
    .eq("id", input.sessionId)
    .maybeSingle();

  let roomId: string | null = null;
  const { data: existingRoom } = await admin
    .from("session_rooms")
    .select("id")
    .eq("session_id", input.sessionId)
    .maybeSingle();
  roomId = (existingRoom?.id as string | undefined) ?? null;

  if (!roomId) {
    const { data: room, error } = await admin
      .from("session_rooms")
      .insert({ session_id: input.sessionId })
      .select("id")
      .single();
    if (error) throw error;
    roomId = room.id as string;
    await admin.from("session_room_messages").insert({
      session_room_id: roomId,
      sender_id: null,
      kind: "system",
      body: `Welcome to ${session?.title ?? "the mix-in"}. Share scores, photos, and plans here.`,
      payload: {},
    });
  }

  await admin.from("session_room_members").upsert(
    { session_room_id: roomId, user_id: input.userId },
    { onConflict: "session_room_id,user_id", ignoreDuplicates: true },
  );

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", input.userId)
    .maybeSingle();
  const name =
    (profile?.display_name as string | null)?.trim() || "Player";

  await admin.from("session_room_messages").insert({
    session_room_id: roomId,
    sender_id: null,
    kind: "system",
    body: `${name} — payment confirmed via Stripe.`,
    payload: {},
  });

  const { error: awardError } = await admin.rpc("award_point_event", {
    p_group_id: input.groupId,
    p_user_id: input.userId,
    p_kind: "paid_place",
    p_session_id: input.sessionId,
  });
  if (awardError) console.warn("award_point_event paid_place", awardError.message);

  return { ok: true, roomId };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const webhookSecret = await resolveAppSecret("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) return json({ error: "Webhook secret missing" }, 500);

  const payload = await req.text();
  const sig = req.headers.get("stripe-signature");
  const valid = await verifyStripeSignature(payload, sig, webhookSecret);
  if (!valid) return json({ error: "Invalid signature" }, 400);

  const event = JSON.parse(payload) as {
    type: string;
    data: { object: Record<string, unknown> };
  };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object;
      const meta = (pi.metadata ?? {}) as Record<string, string>;
      const sessionId = meta.session_id;
      const groupId = meta.group_id;
      const userId = meta.user_id;
      const paymentIntentId = pi.id as string;
      if (sessionId && groupId && userId && paymentIntentId) {
        await unlockPaidPlace(admin, {
          sessionId,
          groupId,
          userId,
          paymentIntentId,
        });
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object;
      const paymentIntentId = pi.id as string;
      if (paymentIntentId) {
        await admin
          .from("session_payment_intents")
          .update({
            status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_payment_intent_id", paymentIntentId);
      }
    }

    if (event.type === "account.updated") {
      const account = event.data.object;
      const accountId = account.id as string;
      const chargesEnabled = Boolean(account.charges_enabled);
      const detailsSubmitted = Boolean(account.details_submitted);
      const ready = chargesEnabled && detailsSubmitted;
      await admin
        .from("group_payment_settings")
        .update({
          stripe_charges_enabled: chargesEnabled,
          stripe_details_submitted: detailsSubmitted,
          stripe_enabled: ready,
          preferred_method: "stripe",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_account_id", accountId);
    }
  } catch (e) {
    console.error("stripe-webhook handler error", e);
    return json(
      { error: e instanceof Error ? e.message : "handler failed" },
      500,
    );
  }

  return json({ received: true });
});