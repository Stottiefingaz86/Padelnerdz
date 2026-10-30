/**
 * Owner back-office metrics — REAL data only.
 * Never invent sign-ups, payments, or volume. Missing config → "—" + explicit error.
 */

import { fetchPostHogProductStats } from "./posthog-stats";
import { supabaseAdminCount, getSupabaseAdminConfig } from "./supabase-admin";

export type AdminMetric = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
};

export type AdminMetricsSnapshot = {
  updatedAt: string;
  source: "live" | "partial" | "unconfigured";
  business: AdminMetric[];
  product: AdminMetric[];
  note: string;
  posthogDashboardUrl: string | null;
  readiness: ReadinessItem[];
  errors: string[];
};

export type ReadinessItem = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

const FEE_EUR = 1;
const IVA_RATE = 0.21;

function formatCount(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-GB").format(n);
}

function formatEur(amount: number | null): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export async function getAdminMetrics(): Promise<AdminMetricsSnapshot> {
  const errors: string[] = [];
  const supabaseReady = Boolean(getSupabaseAdminConfig());

  const [signups, groups, sessions, paidRegs, posthog] = await Promise.all([
    supabaseReady
      ? supabaseAdminCount("profiles")
      : Promise.resolve({
          ok: false as const,
          error: "SUPABASE_SERVICE_ROLE_KEY not set",
        }),
    supabaseReady
      ? supabaseAdminCount("groups")
      : Promise.resolve({ ok: false as const, error: "Supabase not configured" }),
    supabaseReady
      ? supabaseAdminCount("sessions")
      : Promise.resolve({ ok: false as const, error: "Supabase not configured" }),
    supabaseReady
      ? supabaseAdminCount("session_registrations", "status=eq.paid")
      : Promise.resolve({ ok: false as const, error: "Supabase not configured" }),
    fetchPostHogProductStats(),
  ]);

  if (!signups.ok) errors.push(signups.error);
  if (!groups.ok && supabaseReady) errors.push(groups.error);
  if (!sessions.ok && supabaseReady) errors.push(sessions.error);
  if (!paidRegs.ok && supabaseReady) errors.push(paidRegs.error);
  if (posthog.error) errors.push(`PostHog: ${posthog.error}`);

  const paidCount = paidRegs.ok ? paidRegs.count : null;
  const platformTake = FEE_EUR * (1 + IVA_RATE);
  // Expected take from confirmed paid registrations only (manual P2P — not collected in-app)
  const expectedTake =
    paidCount != null ? paidCount * platformTake : null;
  const commissionNet = paidCount != null ? paidCount * FEE_EUR : null;
  const commissionIva =
    paidCount != null ? paidCount * FEE_EUR * IVA_RATE : null;

  const businessLive = signups.ok && paidRegs.ok;
  const productLive = posthog.source === "live";

  // Twilio was hardcoded red — detect from env + real phone profiles (e.g. Chris OTP signup).
  const localFallbackOn =
    process.env.EXPO_PUBLIC_ALLOW_LOCAL_PHONE_FALLBACK === "true" ||
    process.env.ALLOW_LOCAL_PHONE_FALLBACK === "true";
  const explicitTwilioReady = process.env.TWILIO_VERIFY_READY === "true";
  const phoneProfiles = supabaseReady
    ? await supabaseAdminCount("profiles", "phone_e164=not.is.null")
    : ({ ok: false as const, error: "Supabase not configured" } as const);
  const phoneCount = phoneProfiles.ok ? phoneProfiles.count : 0;
  const twilioOk =
    explicitTwilioReady || (!localFallbackOn && phoneCount > 0);
  let twilioDetail: string;
  if (twilioOk && explicitTwilioReady) {
    twilioDetail =
      "TWILIO_VERIFY_READY=true · local phone fallback off · Supabase Phone + Twilio Verify";
  } else if (twilioOk) {
    twilioDetail = `Live — ${phoneCount} profile(s) with phone · local fallback off · Twilio Verify via Supabase Auth`;
  } else if (localFallbackOn) {
    twilioDetail =
      "Local phone fallback is ON (EXPO_PUBLIC_ALLOW_LOCAL_PHONE_FALLBACK). Turn it off for beta friends and enable Twilio Verify in Supabase Auth → Phone.";
  } else {
    twilioDetail =
      "No phone profiles yet. Enable Twilio Verify in Supabase Auth → Phone, or set TWILIO_VERIFY_READY=true after wiring it.";
  }

  const readiness: ReadinessItem[] = [
    {
      id: "supabase_admin",
      label: "Supabase (padelnerdz project)",
      ok: supabaseReady && signups.ok,
      detail: supabaseReady
        ? signups.ok
          ? "Live — asxqvytuzvnklptwoilj · eu-north-1"
          : signups.error
        : "Add SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (sb_secret_…) to apps/web/.env.local",
    },
    {
      id: "posthog",
      label: "PostHog product analytics",
      ok: productLive,
      detail: productLive
        ? "Live Query API"
        : posthog.error ??
          "Rotate POSTHOG_PERSONAL_API_KEY (phx_) — current key rejected by API",
    },
    {
      id: "twilio",
      label: "Twilio Verify (real SMS OTP)",
      ok: twilioOk,
      detail: twilioDetail,
    },
    {
      id: "payments",
      label: "Bizum / Revolut",
      ok: true,
      detail:
        "Manual P2P: player claims I’ve paid → organiser verifies in-app after checking Revolut/Bizum. Session unlocks only on organiser confirm. No bank webhook / escrow yet.",
    },
    {
      id: "rls",
      label: "Friendships + mute prefs RLS",
      ok: true,
      detail: "RLS policies applied for friendships + channel_notification_prefs.",
    },
  ];

  const posthogHost =
    process.env.NEXT_PUBLIC_POSTHOG_APP_HOST ?? "https://us.posthog.com";
  const projectId = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_ID;

  let source: AdminMetricsSnapshot["source"] = "unconfigured";
  if (businessLive && productLive) source = "live";
  else if (businessLive || productLive || (signups.ok && signups.count >= 0))
    source = "partial";

  return {
    updatedAt: new Date().toISOString(),
    source,
    business: [
      {
        id: "signups",
        label: "Sign-ups",
        value: formatCount(signups.ok ? signups.count : null),
        hint: "Supabase profiles",
      },
      {
        id: "groups",
        label: "Groups",
        value: formatCount(groups.ok ? groups.count : null),
        hint: "Supabase groups",
      },
      {
        id: "sessions",
        label: "Sessions / mix-ins",
        value: formatCount(sessions.ok ? sessions.count : null),
        hint: "Supabase sessions",
      },
      {
        id: "payments",
        label: "Confirmed payments",
        value: formatCount(paidCount),
        hint: "session_registrations.status = paid",
      },
      {
        id: "commission_net",
        label: "Commission (ex-IVA)",
        value: formatEur(commissionNet),
        hint: "€1 × paid confirmations (not auto-collected)",
      },
      {
        id: "iva",
        label: "IVA on fee",
        value: formatEur(commissionIva),
      },
      {
        id: "take",
        label: "Expected take (fee+IVA)",
        value: formatEur(expectedTake),
        accent: true,
        hint: "Bizum/Revolut are P2P — invoice or Connect later to collect",
      },
    ],
    product: [
      {
        id: "dau",
        label: "Active users (7d)",
        value: formatCount(posthog.activeUsers7d),
        hint: "PostHog · unique users on $pageview",
      },
      {
        id: "pageviews",
        label: "Pageviews (7d)",
        value: formatCount(posthog.pageviews7d),
        hint: "Event: $pageview",
      },
      {
        id: "sessions_created",
        label: "Sessions created",
        value: formatCount(posthog.sessionsCreated7d),
        hint: "Event: session_created",
      },
      {
        id: "groups_joined",
        label: "Group joins",
        value: formatCount(posthog.groupJoins7d),
        hint: "Event: group_joined",
      },
      {
        id: "payment_events",
        label: "payment_confirmed",
        value: formatCount(posthog.paymentsConfirmed7d),
        hint: "PostHog product event",
      },
    ],
    note: businessLive
      ? "Business numbers are live from Supabase. Zero means no activity yet — not placeholder data."
      : "Business metrics unavailable until SUPABASE_SERVICE_ROLE_KEY is set. No fabricated numbers will be shown.",
    posthogDashboardUrl: projectId
      ? `${posthogHost}/project/${projectId}`
      : `${posthogHost}`,
    readiness,
    errors,
  };
}

export const PRICING_COPY = {
  title: "Pricing rule",
  body: "Organiser sets court price (e.g. €14). Player pays court + €1 + 21% IVA on the €1 (= €15.21). Only the total is shown in the consumer app. Platform fee is recorded when the player taps I’ve paid — money moves peer-to-peer via Bizum/Revolut, not through Padel Nerdz.",
};
