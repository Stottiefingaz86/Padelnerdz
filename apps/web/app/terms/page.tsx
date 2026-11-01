import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0F1115] px-6 py-12 text-white sm:px-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-[#C8FF2E]">
          ← Padel Nerdz
        </Link>
        <h1 className="mt-8 text-4xl font-bold tracking-[-0.03em]">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-[#7A7A7A]">Last updated: 30 October 2026</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-[#B5B5B5]">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Agreement</h2>
            <p>
              By using Padel Nerdz you agree to these terms. If you do not agree,
              do not use the app. Contact{" "}
              <a className="text-[#C8FF2E]" href="mailto:support@padelnerdz.com">
                support@padelnerdz.com
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">The service</h2>
            <p>
              Padel Nerdz helps padel communities organise groups, chat, mix-ins,
              session rooms, and coordinate payments. During beta, features may
              change and availability is not guaranteed.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Accounts</h2>
            <p>
              You must provide a valid phone number and keep your profile
              accurate. You are responsible for activity on your account. Do not
              share access with others.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Payments</h2>
            <p>
              Mix-in places are paid in-app via Stripe Connect. The player pays
              one total; the organiser’s connected Stripe account receives the
              court share, and Padel Nerdz retains a platform service fee of 8%
              of the event fee plus applicable IVA as an application fee. Payout
              timing follows Stripe’s schedules and organiser onboarding status.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Acceptable use</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>No harassment, hate, or illegal content in chat or media</li>
              <li>No spam, scams, or impersonation</li>
              <li>Respect no-show and reliability rules set by groups</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">
              Liability
            </h2>
            <p>
              Padel play involves physical risk. We are not responsible for
              injuries, venue disputes, or payment disagreements between users.
              The app is provided “as is” during beta.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Privacy</h2>
            <p>
              See our{" "}
              <Link href="/privacy" className="text-[#C8FF2E] underline-offset-2 hover:underline">
                Privacy Policy
              </Link>
              . You can export or delete your account from Profile → Privacy in
              the app.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
