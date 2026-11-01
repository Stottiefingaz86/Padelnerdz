import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Partners",
};

export default function PartnersPage() {
  return (
    <main className="min-h-screen bg-[#0F1115] px-6 py-12 text-white sm:px-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-[#C8FF2E]">
          ← Mixy
        </Link>
        <h1 className="mt-8 text-4xl font-bold tracking-[-0.03em]">Partners</h1>
        <p className="mt-4 leading-relaxed text-[#B5B5B5]">
          Clubs, brands, and organisers — partner with Mixy. More here soon.
        </p>
        <a
          href="mailto:partners@padelnerdz.com"
          className="mt-8 inline-block text-lg font-semibold text-[#C8FF2E]"
        >
          partners@padelnerdz.com
        </a>
      </div>
    </main>
  );
}
