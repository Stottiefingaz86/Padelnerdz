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
  const data = (await res.json()) as T & { error?: { message?: string; code?: string } };
  if (!res.ok) {
    throw new Error(data.error?.message || `Stripe ${res.status}`);
  }
  return data;
}

function json(data: unknown, status = 200, req?: Request) {
  const origin = req?.headers.get("Origin") ?? "*";
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    },
  });
}

/** Only https (or http localhost in Stripe test). Reject app schemes. */
function isStripeSafeUrl(candidate: string): boolean {
  try {
    const u = new URL(candidate);
    if (u.protocol === "https:") return true;
    if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * HTTPS return/refresh for Account Links.
 * Always use the Supabase `stripe-connect-return` function — it is public HTTPS,
 * deep-links into the app, and does not depend on marketing-site DNS.
 */
function httpsConnectUrl(groupId: string, stripe: "return" | "refresh") {
  const supabaseUrl = (Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
  if (!supabaseUrl || !isStripeSafeUrl(supabaseUrl)) {
    throw new Error("SUPABASE_URL missing or not https — cannot build Connect return URL");
  }
  const u = new URL(`${supabaseUrl}/functions/v1/stripe-connect-return`);
  u.searchParams.set("groupId", groupId);
  u.searchParams.set("stripe", stripe);
  return u.toString();
}

function pickHttpsUrl(candidate: string | undefined, fallback: string) {
  if (candidate && isStripeSafeUrl(candidate)) return candidate;
  return fallback;
}

type Body = {
  groupId: string;
  returnUrl?: string;
  refreshUrl?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": req.headers.get("Origin") ?? "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, req);

  try {
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
    if (!user) return json({ error: "unauthorized" }, 401, req);

    const body = (await req.json()) as Body;
    if (!body.groupId) return json({ error: "groupId required" }, 400, req);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: membership } = await admin
      .from("group_memberships")
      .select("role")
      .eq("group_id", body.groupId)
      .eq("user_id", user.id)
      .maybeSingle();

    const role = membership?.role as string | undefined;
    if (!role || !["owner", "admin", "organiser"].includes(role)) {
      return json({ error: "Only organisers can connect payouts" }, 403, req);
    }

    const { data: settings } = await admin
      .from("group_payment_settings")
      .select("stripe_account_id")
      .eq("group_id", body.groupId)
      .maybeSingle();

    let accountId = settings?.stripe_account_id as string | null | undefined;

    if (!accountId) {
      const { data: profile } = await admin
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();

      const account = await stripeRequest<{ id: string }>("/accounts", {
        method: "POST",
        body: formBody({
          type: "express",
          country: "ES",
          "capabilities[card_payments][requested]": true,
          "capabilities[transfers][requested]": true,
          business_type: "individual",
          "metadata[group_id]": body.groupId,
          "metadata[user_id]": user.id,
          "business_profile[name]":
            (profile?.display_name as string | null)?.trim() || "Padel Nerdz organiser",
          "business_profile[product_description]": "Padel mix-in court fees",
        }),
      });
      accountId = account.id;

      const { error: upsertError } = await admin.from("group_payment_settings").upsert(
        {
          group_id: body.groupId,
          preferred_method: "stripe",
          stripe_enabled: false,
          stripe_account_id: accountId,
          stripe_charges_enabled: false,
          stripe_details_submitted: false,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "group_id" },
      );
      if (upsertError) {
        console.error("group_payment_settings upsert", upsertError.message);
        throw new Error(`Could not save Connect account: ${upsertError.message}`);
      }
    }

    const returnUrl = pickHttpsUrl(body.returnUrl, httpsConnectUrl(body.groupId, "return"));
    const refreshUrl = pickHttpsUrl(body.refreshUrl, httpsConnectUrl(body.groupId, "refresh"));

    if (!isStripeSafeUrl(returnUrl) || !isStripeSafeUrl(refreshUrl)) {
      throw new Error(`Invalid Connect redirect URLs return=${returnUrl} refresh=${refreshUrl}`);
    }

    let link: { url: string };
    try {
      link = await stripeRequest<{ url: string }>("/account_links", {
        method: "POST",
        body: formBody({
          account: accountId,
          refresh_url: refreshUrl,
          return_url: returnUrl,
          type: "account_onboarding",
          "collection_options[fields]": "eventually_due",
        }),
      });
    } catch (linkErr) {
      const msg = linkErr instanceof Error ? linkErr.message : "account_links failed";
      console.error("account_links failed", msg, { returnUrl, refreshUrl, accountId });
      throw new Error(`${msg} (return=${returnUrl})`);
    }

    // Return Stripe's hosted URL directly — do not wrap in a bridge URL
    // (nested query params broke WebBrowser / looked like a "Supabase error").
    return json({ url: link.url, accountId, returnUrl, refreshUrl }, 200, req);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Connect onboarding failed";
    console.error("stripe-connect-onboard", message);
    return json({ error: message }, 500, req);
  }
});
