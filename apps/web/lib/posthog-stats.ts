/**
 * Live PostHog product stats for the admin back office.
 * Real Query API only — if the personal key fails, values stay null ("—").
 * Never invent or freeze stale snapshot numbers.
 */

export type PostHogProductStats = {
  activeUsers7d: number | null;
  sessionsCreated7d: number | null;
  groupJoins7d: number | null;
  paymentsConfirmed7d: number | null;
  pageviews7d: number | null;
  source: "live" | "unavailable";
  error?: string;
};

type HogQLResponse = {
  results?: Array<Array<string | number | null>>;
  detail?: string;
};

function empty(error: string): PostHogProductStats {
  return {
    activeUsers7d: null,
    sessionsCreated7d: null,
    groupJoins7d: null,
    paymentsConfirmed7d: null,
    pageviews7d: null,
    source: "unavailable",
    error,
  };
}

async function runHogQL(sql: string): Promise<number> {
  const personalKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_ID ?? "699685";
  const host = (
    process.env.NEXT_PUBLIC_POSTHOG_APP_HOST ?? "https://us.posthog.com"
  ).replace(/\/$/, "");

  if (!personalKey) {
    throw new Error("POSTHOG_PERSONAL_API_KEY not set");
  }

  const res = await fetch(`${host}/api/projects/${projectId}/query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${personalKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: { kind: "HogQLQuery", query: sql },
    }),
    cache: "no-store",
  });

  const json = (await res.json()) as HogQLResponse;
  if (!res.ok) {
    throw new Error(json.detail ?? `PostHog ${res.status}`);
  }

  const cell = json.results?.[0]?.[0];
  if (cell == null) return 0;
  return typeof cell === "number" ? cell : Number(cell) || 0;
}

export async function fetchPostHogProductStats(): Promise<PostHogProductStats> {
  if (!process.env.POSTHOG_PERSONAL_API_KEY) {
    return empty("POSTHOG_PERSONAL_API_KEY not set");
  }

  try {
    const [
      activeUsers7d,
      sessionsCreated7d,
      groupJoins7d,
      paymentsConfirmed7d,
      pageviews7d,
    ] = await Promise.all([
      runHogQL(`
        SELECT count(DISTINCT person_id)
        FROM events
        WHERE timestamp >= now() - INTERVAL 7 DAY
          AND event = '$pageview'
      `),
      runHogQL(`
        SELECT count()
        FROM events
        WHERE event = 'session_created'
          AND timestamp >= now() - INTERVAL 7 DAY
      `),
      runHogQL(`
        SELECT count()
        FROM events
        WHERE event = 'group_joined'
          AND timestamp >= now() - INTERVAL 7 DAY
      `),
      runHogQL(`
        SELECT count()
        FROM events
        WHERE event = 'payment_confirmed'
          AND timestamp >= now() - INTERVAL 7 DAY
      `),
      runHogQL(`
        SELECT count()
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL 7 DAY
      `),
    ]);

    return {
      activeUsers7d,
      sessionsCreated7d,
      groupJoins7d,
      paymentsConfirmed7d,
      pageviews7d,
      source: "live",
    };
  } catch (e) {
    return empty(e instanceof Error ? e.message : "PostHog query failed");
  }
}
