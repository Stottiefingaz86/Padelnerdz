import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0B0D10] text-white">
      <section className="relative flex min-h-[100svh] flex-col">
        <Image
          src="/landing-hero.jpg"
          alt="Padel court at dusk"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(11,13,16,0.55) 0%, rgba(11,13,16,0.35) 40%, rgba(11,13,16,0.92) 100%)",
          }}
        />

        <header className="relative z-10 flex items-center justify-between px-6 pt-6 sm:px-10">
          <Image
            src="/logo-white.png"
            alt="Padel Nerdz"
            width={160}
            height={36}
            className="h-8 w-auto sm:h-9"
            priority
          />
          <nav className="flex items-center gap-5 text-sm text-[#B5B5B5]">
            <Link href="/terms" className="transition hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="transition hover:text-white">
              Privacy
            </Link>
            <Link href="/support" className="transition hover:text-white">
              Support
            </Link>
          </nav>
        </header>

        <div className="relative z-10 mt-auto flex max-w-xl flex-col gap-5 px-6 pb-16 pt-24 sm:px-10 sm:pb-20">
          <h1
            className="text-[2.6rem] font-bold leading-[1.05] tracking-[-0.04em] sm:text-6xl"
            style={{ fontFamily: "var(--font-jakarta), system-ui" }}
          >
            Your padel crew, organised.
          </h1>
          <p className="max-w-md text-base leading-relaxed text-[#B5B5B5] sm:text-lg">
            Groups, session rooms, and simple payments — built for clubs and
            friends who play every week.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href="#download"
              className="cta-lime inline-flex h-12 items-center justify-center rounded-full px-7 text-sm font-semibold transition hover:brightness-110"
              style={{ color: "#0B0D10" }}
            >
              Get the app
            </a>
            <Link
              href="/support"
              className="inline-flex h-12 items-center justify-center rounded-full border border-[#2E2E2E] px-6 text-sm font-medium text-white transition hover:border-[#C8FF2E]/40"
            >
              Contact
            </Link>
          </div>
        </div>
      </section>

      <section
        id="download"
        className="border-t border-[#222] px-6 py-20 sm:px-10"
      >
        <div className="mx-auto max-w-3xl">
          <h2
            className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl"
            style={{ fontFamily: "var(--font-jakarta), system-ui" }}
          >
            Coming to the App Store
          </h2>
          <p className="mt-4 max-w-xl text-[#B5B5B5] leading-relaxed">
            Join groups, book sessions, chat in the room, and settle court fees
            with Bizum or Revolut — without cluttering your chats.
          </p>
          <p className="mt-8 text-sm text-[#7A7A7A]">
            App Store and Google Play links will land here when the build is
            live. For App Review:{" "}
            <Link href="/support" className="text-[#C8FF2E] underline-offset-2 hover:underline">
              support
            </Link>{" "}
            ·{" "}
            <Link href="/privacy" className="text-[#C8FF2E] underline-offset-2 hover:underline">
              privacy policy
            </Link>
            .
          </p>
        </div>
      </section>

      <footer className="border-t border-[#222] px-6 py-8 text-sm text-[#7A7A7A] sm:px-10">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4">
          <span>© {new Date().getFullYear()} Padel Nerdz</span>
          <div className="flex gap-5">
            <Link href="/privacy">Privacy</Link>
            <Link href="/support">Support</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
