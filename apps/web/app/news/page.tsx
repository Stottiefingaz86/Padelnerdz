import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "News",
};

export default function NewsPage() {
  return (
    <main className="min-h-screen bg-[#0F1115] px-6 py-12 text-white sm:px-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-[#C8FF2E]">
          ← Padel Nerdz
        </Link>
        <h1 className="mt-8 text-4xl font-bold tracking-[-0.03em]">News</h1>
        <p className="mt-4 leading-relaxed text-[#B5B5B5]">
          Product updates and community stories. First posts landing soon.
        </p>
      </div>
    </main>
  );
}
