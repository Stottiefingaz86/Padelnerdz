import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Shop",
};

export default function ShopPage() {
  return (
    <main className="min-h-screen bg-[#0F1115] px-6 py-12 text-white sm:px-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-[#C8FF2E]">
          ← Mixy
        </Link>
        <p className="mt-8 text-xs font-semibold tracking-[0.16em] text-[#C8FF2E]">
          COMING SOON
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-[-0.03em]">Shop</h1>
        <p className="mt-4 leading-relaxed text-[#B5B5B5]">
          Merch and gear for the circuit — not open yet.
        </p>
      </div>
    </main>
  );
}
