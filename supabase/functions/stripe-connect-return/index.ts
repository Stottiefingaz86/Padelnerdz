import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Public HTTPS pages for Stripe Connect:
 * - ?mode=bridge&next=…  → branded Padel Nerdz intro, then redirects into Stripe
 * - ?groupId=&stripe=     → return/refresh deep-link back into the app
 */
Deno.serve((req) => {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode");

  if (mode === "bridge") {
    return bridgePage(url);
  }
  return returnPage(url);
});

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function shell(opts: {
  title: string;
  kicker: string;
  body: string;
  primaryHref: string;
  primaryLabel: string;
  autoRedirectMs?: number;
  footer?: string;
}) {
  const auto =
    opts.autoRedirectMs && opts.autoRedirectMs > 0
      ? `<script>
setTimeout(function () {
  window.location.replace(${JSON.stringify(opts.primaryHref)});
}, ${opts.autoRedirectMs});
</script>`
      : opts.autoRedirectMs === 0
        ? ''
        : `<script>window.location.replace(${JSON.stringify(opts.primaryHref)});</script>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(opts.title)}</title>
  <style>
    :root {
      --bg: #0B0D10;
      --elevated: #14171C;
      --green: #C8FF2E;
      --text: #F4F5F7;
      --muted: #9AA0A6;
      --secondary: #B5B5B5;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      background:
        radial-gradient(1200px 600px at 10% -10%, rgba(200,255,46,0.16), transparent 55%),
        radial-gradient(900px 500px at 110% 10%, rgba(103,232,249,0.08), transparent 50%),
        var(--bg);
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 28px 20px;
    }
    .card {
      width: min(420px, 100%);
      background: rgba(20,23,28,0.92);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 24px;
      padding: 28px 24px 24px;
      text-align: center;
      box-shadow: 0 24px 80px rgba(0,0,0,0.45);
    }
    .mark {
      width: 56px; height: 56px; border-radius: 18px;
      margin: 0 auto 18px;
      background: var(--green);
      color: #0B0D10;
      display: grid; place-items: center;
      font-weight: 800; font-size: 22px; letter-spacing: -0.04em;
    }
    .kicker {
      color: var(--green);
      font-size: 11px; font-weight: 700;
      letter-spacing: 0.14em; text-transform: uppercase;
    }
    h1 {
      margin: 10px 0 0;
      font-size: 28px; line-height: 1.15;
      letter-spacing: -0.03em;
    }
    p {
      margin: 14px 0 0;
      color: var(--secondary);
      font-size: 15px; line-height: 1.5;
    }
    .steps {
      margin: 22px 0 0;
      text-align: left;
      display: grid; gap: 10px;
    }
    .step {
      display: flex; gap: 12px; align-items: flex-start;
      padding: 12px 12px;
      border-radius: 14px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.05);
    }
    .n {
      width: 22px; height: 22px; border-radius: 999px;
      background: rgba(200,255,46,0.16); color: var(--green);
      font-size: 12px; font-weight: 700;
      display: grid; place-items: center; flex: none;
    }
    .step span { color: var(--text); font-size: 14px; line-height: 1.35; }
    a.cta {
      display: flex; align-items: center; justify-content: center;
      margin-top: 22px; min-height: 52px;
      border-radius: 16px; background: var(--green);
      color: #0B0D10; font-weight: 800; font-size: 16px;
      text-decoration: none;
    }
    .foot {
      margin-top: 16px;
      color: var(--muted);
      font-size: 12px; line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="mark">PN</div>
    <div class="kicker">${escapeHtml(opts.kicker)}</div>
    <h1>${escapeHtml(opts.title)}</h1>
    <p>${escapeHtml(opts.body)}</p>
    ${opts.footer ? "" : `<div class="steps">
      <div class="step"><div class="n">1</div><span>Confirm your identity</span></div>
      <div class="step"><div class="n">2</div><span>Add the bank account for court fees</span></div>
      <div class="step"><div class="n">3</div><span>Return here — mix-in payouts unlock</span></div>
    </div>`}
    <a class="cta" href="${escapeHtml(opts.primaryHref)}">${escapeHtml(opts.primaryLabel)}</a>
    <div class="foot">${escapeHtml(opts.footer ?? "Identity & bank details are collected securely. Powered by Stripe.")}</div>
  </div>
  ${auto}
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function bridgePage(url: URL) {
  const next = (url.searchParams.get("next") ?? "").trim();
  let safeNext = "";
  try {
    const u = new URL(next);
    if (u.protocol === "https:" && /(^|\.)stripe\.com$/i.test(u.hostname)) {
      safeNext = u.toString();
    }
  } catch {
    /* ignore */
  }

  if (!safeNext) {
    return shell({
      title: "Link expired",
      kicker: "Padel Nerdz",
      body: "Open Payments in the app and tap Set up payouts again.",
      primaryHref: "padelnerdz://",
      primaryLabel: "Open Padel Nerdz",
      footer: "No Stripe session was found for this link.",
      autoRedirectMs: 0,
    });
  }

  return shell({
    title: "Set up mix-in payouts",
    kicker: "Padel Nerdz · Bank setup",
    body: "About two minutes. You’ll confirm who you are and where court fees should land.",
    primaryHref: safeNext,
    primaryLabel: "Continue",
    autoRedirectMs: 1400,
  });
}

function returnPage(url: URL) {
  const groupId = (url.searchParams.get("groupId") ?? "").trim();
  const stripe =
    url.searchParams.get("stripe") === "refresh" ? "refresh" : "return";
  const deepLink = groupId
    ? `padelnerdz://group/${encodeURIComponent(groupId)}/payments?stripe=${stripe}`
    : "padelnerdz://";

  const title =
    stripe === "refresh" ? "Continue payout setup" : "You’re back";
  const body =
    stripe === "refresh"
      ? "Your secure link expired. Open the app to generate a fresh one."
      : "Returning you to Padel Nerdz to finish unlocking payouts.";

  return shell({
    title,
    kicker: "Padel Nerdz",
    body,
    primaryHref: deepLink,
    primaryLabel: "Open Padel Nerdz",
    footer: "If the app doesn’t open, tap the button above.",
    autoRedirectMs: 400,
  });
}
