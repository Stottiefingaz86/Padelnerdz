import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Hosted Stripe Checkout Session (Checkout Studio: hosted_mobile_app_0001).
 * Parallel to PaymentSheet / PaymentIntent Connect flow — see STRIPE_INTEGRATION_TODO.md.
 */

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

function formBody(
  params: Record<string, string | number | boolean | undefined | null>,
) {
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

type Body = {
  /** Optional override; default sample Price ID — replace before production. */
  priceId?: string;
  quantity?: number;
  successUrl?: string;
  cancelUrl?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);

  const body = (await req.json().catch(() => ({}))) as Body;

  // sample_only — replace before live (see STRIPE_INTEGRATION_TODO.md)
  const mode = "payment";
  const priceId = body.priceId?.trim() || "price_...";
  const quantity = body.quantity && body.quantity > 0 ? body.quantity : 1;
  const successUrl =
    body.successUrl?.trim() ||
    "padelnerdz://stripe-checkout/success?session_id={CHECKOUT_SESSION_ID}";
  const cancelUrl =
    body.cancelUrl?.trim() || "padelnerdz://stripe-checkout/cancel";

  // fixed_by_ui from Checkout Studio (hosted_mobile_app_0001)
  // ui_mode: hosted_page (REST; no stripe-node SDK version — see TODO)
  // payment_method_collection omitted — only for mode === "subscription"
  try {
    const session = await stripeRequest<{
      id: string;
      url: string | null;
    }>("/checkout/sessions", {
      method: "POST",
      body: formBody({
        ui_mode: "hosted_page",
        mode,
        billing_address_collection: "auto",
        "phone_number_collection[enabled]": false,
        "automatic_tax[enabled]": false,
        allow_promotion_codes: false,
        submit_type: "auto",
        "saved_payment_method_options[payment_method_save]": "enabled",
        integration_identifier: "hosted_mobile_app_0001",
        origin_context: "mobile_app",
        success_url: successUrl,
        cancel_url: cancelUrl,
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": quantity,
        "metadata[user_id]": user.id,
      }),
    });

    if (!session.url) {
      return json({ error: "Checkout Session missing url" }, 500);
    }

    return json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "checkout_session_failed" },
      400,
    );
  }
});
