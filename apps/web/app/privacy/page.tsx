import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0F1115] px-6 py-12 text-white sm:px-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-[#C8FF2E]">
          ← Mixy
        </Link>
        <h1 className="mt-8 text-4xl font-bold tracking-[-0.03em]">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[#7A7A7A]">Last updated: 30 October 2026</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-[#B5B5B5]">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Who we are</h2>
            <p>
              Mixy (“we”, “us”) provides a mobile app for padel groups,
              session rooms, chat, and payment coordination. Contact:{" "}
              <a className="text-[#C8FF2E]" href="mailto:support@padelnerdz.com">
                support@padelnerdz.com
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">What we collect</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Account details such as phone number and display name</li>
              <li>Group membership, session participation, and chat messages you send</li>
              <li>Media you choose to upload in chats or for your avatar</li>
              <li>Payment confirmation status when you mark a session as paid (we do not process card payments in the current version)</li>
              <li>
                Product analytics events (e.g. sign-up, join group, payment confirmed)
                via PostHog, when enabled, used to improve the product
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">How we use data</h2>
            <p>
              To operate the app, deliver notifications, show session rooms and
              chats, coordinate payments between players and organisers, and
              understand product usage. We do not sell your personal data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Sharing</h2>
            <p>
              Messages and session details are visible to members of the relevant
              group or session. Infrastructure providers (e.g. hosting, analytics)
              process data on our behalf under contractual safeguards.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Retention</h2>
            <p>
              We keep account and group data while your account is active. You can
              request deletion by emailing support. Chat media retention follows
              group settings and legal obligations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Your rights</h2>
            <p>
              Depending on your location you may have rights to access, correct,
              delete, or export your data, and to object to certain processing.
              Contact us to exercise these rights.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Children</h2>
            <p>
              Mixy is not directed at children under 16. If you believe a
              minor has created an account, contact us and we will remove it.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
