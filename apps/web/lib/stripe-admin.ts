/**
 * Server-only Stripe reads for the owner back office.
 * Uses STRIPE_SECRET_KEY, never expose to the client.
 */

export type StripePlatformStatus = {
  configured: boolean;
  mode: "live" | "test" | "unknown";
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  country: string | null;
  defaultCurrency: string | null;
  connectedAccounts: number | null;
  balanceAvailableEur: number | null;
  dashboardUrl: string | null;
  error: string | null;
};

function stripeSecret(): string | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  return key || null;
}

function inferMode(key: string): "live" | "test" | "unknown" {
  if (key.startsWith("sk_live_") || key.startsWith("rk_live_")) return "live";
  if (key.startsWith("sk_test_") || key.startsWith("rk_test_")) return "test";
  return "unknown";
}

async function stripeGet<T>(
  path: string,
  key: string,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`https://api.stripe.com/v1/${path}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    const data = (await res.json()) as T & { error?: { message?: string } };
    if (!res.ok) {
      return {
        ok: false,
        error: data.error?.message ?? `Stripe ${res.status}`,
      };
    }
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Stripe request failed",
    };
  }
}

export async function fetchStripePlatformStatus(): Promise<StripePlatformStatus> {
  const key = stripeSecret();
  if (!key) {
    return {
      configured: false,
      mode: "unknown",
      accountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      country: null,
      defaultCurrency: null,
      connectedAccounts: null,
      balanceAvailableEur: null,
      dashboardUrl: null,
      error: "STRIPE_SECRET_KEY not set on apps/web/.env.local",
    };
  }

  const mode = inferMode(key);
  const [account, balance, accounts] = await Promise.all([
    stripeGet<{
      id: string;
      charges_enabled: boolean;
      payouts_enabled: boolean;
      details_submitted: boolean;
      country: string;
      default_currency: string;
    }>("account", key),
    stripeGet<{
      available: Array<{ amount: number; currency: string }>;
    }>("balance", key),
    stripeGet<{ data: unknown[] }>("accounts?limit=100", key),
  ]);

  if (!account.ok) {
    return {
      configured: true,
      mode,
      accountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      country: null,
      defaultCurrency: null,
      connectedAccounts: null,
      balanceAvailableEur: null,
      dashboardUrl: "https://dashboard.stripe.com",
      error: account.error,
    };
  }

  const eur =
    balance.ok
      ? (balance.data.available.find((b) => b.currency === "eur")?.amount ??
          0) / 100
      : null;

  return {
    configured: true,
    mode,
    accountId: account.data.id,
    chargesEnabled: account.data.charges_enabled,
    payoutsEnabled: account.data.payouts_enabled,
    detailsSubmitted: account.data.details_submitted,
    country: account.data.country,
    defaultCurrency: account.data.default_currency,
    connectedAccounts: accounts.ok ? accounts.data.data.length : null,
    balanceAvailableEur: eur,
    dashboardUrl:
      mode === "live"
        ? "https://dashboard.stripe.com"
        : "https://dashboard.stripe.com/test",
    error: balance.ok
      ? null
      : balance.error
        ? `Balance: ${balance.error}`
        : accounts.ok
          ? null
          : accounts.error
            ? `Connected accounts: ${accounts.error}`
            : null,
  };
}
