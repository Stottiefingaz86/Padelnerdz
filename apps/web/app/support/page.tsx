import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support",
};

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-[#0F1115] px-6 py-12 text-white sm:px-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-[#C8FF2E]">
          ← Mixy
        </Link>
        <h1 className="mt-8 text-4xl font-bold tracking-[-0.03em]">Support</h1>
        <p className="mt-4 text-[#B5B5B5] leading-relaxed">
          Need help with groups, sessions, or payments? We’re here.
        </p>

        <div className="mt-10 space-y-6 rounded-2xl border border-[#2E2E2E] bg-[#141414] p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#7A7A7A]">
              Email
            </p>
            <a
              href="mailto:support@padelnerdz.com"
              className="mt-2 inline-block text-lg font-semibold text-[#C8FF2E]"
            >
              support@padelnerdz.com
            </a>
          </div>
          <p className="text-sm leading-relaxed text-[#B5B5B5]">
            Include your phone number used to sign up and a short description of
            the issue. We aim to reply within 2 business days.
          </p>
        </div>

        <div className="mt-10 space-y-4 text-[15px] text-[#B5B5B5]">
          <h2 className="text-lg font-semibold text-white">Common topics</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Joining or leaving a group</li>
            <li>Session payments (Bizum / Revolut)</li>
            <li>Can’t-make-it and reserve spots</li>
            <li>Account or profile updates</li>
            <li>Delete my account / data</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
