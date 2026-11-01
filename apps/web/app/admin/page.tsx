import Link from "next/link";
import { redirect } from "next/navigation";

import { isAdminAuthed } from "@/lib/admin-auth";
import { getAdminMetrics, PRICING_COPY } from "@/lib/metrics";
import { LogoutButton } from "./logout-button";

export const metadata = { title: "Admin · Metrics" };

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  if (!(await isAdminAuthed())) {
    redirect("/admin/login");
  }

  const metrics = await getAdminMetrics();
  const posthogLive = metrics.posthogDashboardUrl != null;

  return (
    <main className="min-h-screen bg-[#0F1115] px-6 py-10 text-white sm:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#C8FF2E]">
              Padel Nerdz · Owner
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
              Back office
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[#B5B5B5]">
              Live operational numbers only. Empty or — means no real activity /
              not connected — never placeholder data.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/users"
              className="rounded-full border border-[#2E2E2E] px-4 py-2 text-sm text-[#B5B5B5] hover:text-white"
            >
              Users
            </Link>
            <Link
              href="/"
              className="rounded-full border border-[#2E2E2E] px-4 py-2 text-sm text-[#B5B5B5] hover:text-white"
            >
              Marketing site
            </Link>
            <LogoutButton />
          </div>
        </div>

        <p className="mt-6 text-xs text-[#7A7A7A]">
          Snapshot · {metrics.source} ·{" "}
          {new Date(metrics.updatedAt).toLocaleString()}
        </p>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Beta readiness</h2>
          <p className="mt-1 text-sm text-[#B5B5B5]">
            Real users / App Store — do not invite friends until Twilio OTP is
            green and local phone fallback is off.
          </p>
          <ul className="mt-4 space-y-2">
            {metrics.readiness.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-[#2E2E2E] bg-[#141414] px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      r.ok ? "bg-[#C8FF2E]" : "bg-[#FF6E6E]"
                    }`}
                  />
                  <span className="text-sm font-medium">{r.label}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[#7A7A7A]">
                  {r.detail}
                </p>
              </li>
            ))}
          </ul>
          {metrics.errors.length > 0 ? (
            <div className="mt-3 rounded-xl border border-[#FF6E6E]/35 bg-[#FF6E6E]/10 px-4 py-3 text-xs text-[#FFB4B4]">
              {metrics.errors.map((e) => (
                <p key={e}>{e}</p>
              ))}
            </div>
          ) : null}
        </section>

        <h2 className="mt-12 text-lg font-semibold">Business metrics</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.business.map((m) => (
            <div
              key={m.id}
              className="rounded-2xl border border-[#2E2E2E] bg-[#141414] p-4"
            >
              <p
                className={`text-2xl font-bold tracking-[-0.02em] ${
                  m.accent ? "text-[#C8FF2E]" : "text-white"
                }`}
              >
                {m.value}
              </p>
              <p className="mt-1 text-sm font-medium text-[#B5B5B5]">{m.label}</p>
              {m.hint ? (
                <p className="mt-2 text-xs leading-relaxed text-[#7A7A7A]">{m.hint}</p>
              ) : null}
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-lg font-semibold">Stripe Connect</h2>
        <p className="mt-2 max-w-2xl text-sm text-[#B5B5B5]">
          Live platform account + Supabase Connect counters. Platform must have
          charges enabled before real player payments settle.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {metrics.stripe.map((m) => (
            <div
              key={m.id}
              className="rounded-2xl border border-[#2E2E2E] bg-[#141414] p-4"
            >
              <p
                className={`text-2xl font-bold tracking-[-0.02em] ${
                  m.accent ? "text-[#C8FF2E]" : "text-white"
                }`}
              >
                {m.value}
              </p>
              <p className="mt-1 text-sm font-medium text-[#B5B5B5]">{m.label}</p>
              {m.hint ? (
                <p className="mt-2 text-xs leading-relaxed text-[#7A7A7A]">{m.hint}</p>
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={metrics.stripeDashboardUrl ?? "https://dashboard.stripe.com"}
            target="_blank"
            rel="noopener noreferrer"
            className="cta-lime inline-flex h-11 items-center rounded-full px-5 text-sm font-semibold"
            style={{ color: "#0F1115" }}
          >
            Open Stripe Dashboard
          </a>
          <a
            href="https://dashboard.stripe.com/settings/connect"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center rounded-full border border-[#2E2E2E] px-4 text-sm text-[#B5B5B5] hover:text-white"
          >
            Connect settings
          </a>
          <span
            className={`inline-flex h-11 items-center rounded-full border px-4 text-sm ${
              metrics.stripeStatus.chargesEnabled
                ? "border-[#C8FF2E]/40 text-[#C8FF2E]"
                : "border-[#FF6E6E]/40 text-[#FFB4B4]"
            }`}
          >
            {metrics.stripeStatus.chargesEnabled
              ? "Platform can take payments"
              : "Finish Stripe onboarding (individual OK)"}
          </span>
        </div>

        <h2 className="mt-12 text-lg font-semibold">PostHog · product</h2>
        <p className="mt-2 max-w-2xl text-sm text-[#B5B5B5]">
          Last-7-day totals from PostHog Query API only. If a card shows —, the
          personal API key is missing/invalid — not a fake zero.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {metrics.product.map((m) => (
            <div
              key={m.id}
              className="rounded-2xl border border-[#2E2E2E] bg-[#141414] p-4"
            >
              <p className="text-2xl font-bold text-white">{m.value}</p>
              <p className="mt-1 text-sm text-[#B5B5B5]">{m.label}</p>
              {m.hint ? (
                <p className="mt-2 text-xs text-[#7A7A7A]">{m.hint}</p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={metrics.posthogDashboardUrl ?? "https://us.posthog.com"}
            target="_blank"
            rel="noopener noreferrer"
            className="cta-lime inline-flex h-11 items-center rounded-full px-5 text-sm font-semibold"
            style={{ color: "#0F1115" }}
          >
            Open PostHog
          </a>
          <span
            className={`inline-flex h-11 items-center rounded-full border px-4 text-sm ${
              posthogLive
                ? "border-[#C8FF2E]/40 text-[#C8FF2E]"
                : "border-[#2E2E2E] text-[#7A7A7A]"
            }`}
          >
            {metrics.source === "live" || metrics.source === "partial"
              ? `Data: ${metrics.source}`
              : "Not connected"}
          </span>
        </div>

        <div className="mt-12 rounded-2xl border border-[#2E2E2E] bg-[#141414] p-5">
          <h2 className="text-lg font-semibold">{PRICING_COPY.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#B5B5B5]">
            {PRICING_COPY.body}
          </p>
        </div>

        <p className="mt-8 max-w-2xl text-xs leading-relaxed text-[#7A7A7A]">
          {metrics.note}
        </p>
      </div>
    </main>
  );
}
