import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0F1115] px-6 text-white">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#C8FF2E]">
        Padel Nerdz
      </p>
      <h1 className="mt-3 text-3xl font-bold">Page not found</h1>
      <Link href="/" className="mt-8 text-sm text-[#C8FF2E]">
        Back home
      </Link>
    </main>
  );
}
