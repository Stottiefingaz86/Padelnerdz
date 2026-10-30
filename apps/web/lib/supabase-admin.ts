/**
 * Server-only Supabase access for the owner back office.
 * Requires SUPABASE_SERVICE_ROLE_KEY — never expose this to the client.
 */

export function getSupabaseAdminConfig(): {
  url: string;
  serviceRoleKey: string;
} | null {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !serviceRoleKey) return null;
  return { url: url.replace(/\/$/, ""), serviceRoleKey };
}

export async function supabaseAdminGet<T>(
  path: string,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const cfg = getSupabaseAdminConfig();
  if (!cfg) {
    return {
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY (and URL) not set on the web app",
    };
  }

  try {
    const res = await fetch(`${cfg.url}/rest/v1/${path}`, {
      headers: {
        apikey: cfg.serviceRoleKey,
        Authorization: `Bearer ${cfg.serviceRoleKey}`,
        Prefer: "count=exact",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Supabase ${res.status}: ${text.slice(0, 160)}` };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Supabase request failed",
    };
  }
}

/** HEAD-style count via Prefer: count=exact */
export async function supabaseAdminCount(
  table: string,
  query = "",
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const cfg = getSupabaseAdminConfig();
  if (!cfg) {
    return {
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY (and URL) not set on the web app",
    };
  }

  const qs = query ? (query.startsWith("?") ? query : `?${query}`) : "";
  try {
    const res = await fetch(`${cfg.url}/rest/v1/${table}${qs}`, {
      method: "HEAD",
      headers: {
        apikey: cfg.serviceRoleKey,
        Authorization: `Bearer ${cfg.serviceRoleKey}`,
        Prefer: "count=exact",
      },
      cache: "no-store",
    });
    const range = res.headers.get("content-range");
    // content-range: 0-24/25 or */0
    const total = range?.split("/")[1];
    if (total == null) {
      return { ok: false, error: "Missing Content-Range from Supabase" };
    }
    return { ok: true, count: Number(total) || 0 };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Supabase count failed",
    };
  }
}
