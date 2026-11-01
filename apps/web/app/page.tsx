import Image from "next/image";
import Link from "next/link";

import {
  ApplePayMark,
  GooglePayMark,
  SectionCrown,
  SectionHeading,
  StoreButtons,
  StripeMark,
  TicketMock,
} from "@/components/landing";
import { FormatsPanel } from "@/components/formats-panel";
import { KqDemo } from "@/components/kq-demo";
import { BrandSection } from "@/components/pattern-band";
import { WrapStoryCluster } from "@/components/wrap-story";

const MISSIONS = [
  {
    src: "/missions/first_mixin.png",
    title: "First mix-in",
    body: "Lock your first paid place.",
  },
  {
    src: "/missions/first_pay.png",
    title: "Paid in",
    body: "Confirm with Stripe.",
  },
  {
    src: "/missions/mixins_10.png",
    title: "Circuit regular",
    body: "Ten sessions deep.",
  },
  {
    src: "/missions/wins_3.png",
    title: "On a run",
    body: "Stack match wins.",
  },
  {
    src: "/missions/podium_5.png",
    title: "Podium hunter",
    body: "Finish top three.",
  },
  {
    src: "/missions/mixin_winner.png",
    title: "Session king",
    body: "Take the mix-in.",
  },
] as const;

const SESSION_BEATS = [
  {
    n: "01",
    label: "Ticket + check-in",
    title: "QR at the gate.",
    body: "Paid players get a session ticket. Organisers scan or type the code. No-shows get marked. Reliability sticks.",
    beat: "Ticket QR  ·  Scan  ·  Checked in",
  },
  {
    n: "02",
    label: "Fixtures",
    title: "The board rebuilds itself.",
    body: "Score a Kings & Queens match. Winners move up, losers drop, partners split. Next round is ready before you’re off court.",
    beat: "Alex / Sam  vs  Mia / Jordan",
  },
  {
    n: "03",
    label: "Wraps",
    title: "Wrap after the night.",
    body: "Spotify Wrapped energy for the mix-in. Hours on court, who showed, reliability, final board.",
    beat: "12 played  ·  0 no-shows  ·  MVP",
  },
] as const;

export default function HomePage() {
  return (
    <main className="overflow-x-hidden bg-[#0F1115] text-white">
      {/* Hero — one composition: brand, headline, line, CTAs, full-bleed court */}
      <section className="relative flex min-h-[100svh] flex-col">
        <Image
          src="/landing-hero.jpg"
          alt="Floodlit padel court at night"
          fill
          priority
          className="object-cover object-center land-fade"
          sizes="100vw"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 85% 70% at 50% 45%, rgba(15,17,21,0.28) 0%, rgba(15,17,21,0.58) 55%, rgba(15,17,21,0.94) 100%), linear-gradient(180deg, rgba(15,17,21,0.55) 0%, transparent 28%, transparent 55%, #0F1115 100%)",
          }}
        />

        <header className="relative z-10 flex items-center justify-between px-6 pt-6 sm:px-10">
          <Image
            src="/logo-wordmark.png"
            alt="Padel Nerdz"
            width={120}
            height={114}
            className="h-9 w-auto opacity-90 sm:h-10"
            priority
          />
          <nav className="flex items-center gap-5 text-sm font-medium text-[#B5B5B5]">
            <Link href="/support" className="transition hover:text-white">
              Support
            </Link>
            <Link href="/privacy" className="transition hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-white">
              Terms
            </Link>
          </nav>
        </header>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-10 text-center sm:px-10">
          <div className="land-rise land-glitch mx-auto w-[min(72vw,280px)] sm:w-[320px] md:w-[360px]">
            <Image
              src="/logo-wordmark.png"
              alt="Padel Nerdz"
              width={480}
              height={458}
              priority
              className="land-glitch__img"
            />
          </div>
          <h1 className="land-rise land-rise-delay-1 land-display mx-auto mt-8 max-w-3xl text-[2.35rem] font-extrabold leading-[1.05] tracking-[-0.045em] sm:text-5xl md:text-[3.35rem]">
            From group chat to game on.
          </h1>
          <p className="land-rise land-rise-delay-2 mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#B5B5B5] sm:text-lg">
            Your crew, your mix-ins, your competition. Organise games, fill
            courts, track results and celebrate every win. All in one place.
          </p>
          <div className="land-rise land-rise-delay-3 mt-9">
            <StoreButtons />
          </div>
        </div>

        <a
          href="#why"
          className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2.5 text-[#C8FF2E] transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C8FF2E]"
          aria-label="Scroll to next section"
        >
          <span
            className="land-mouse relative block h-9 w-[22px] rounded-full border-2 border-current"
            aria-hidden
          >
            <span className="land-mouse__wheel absolute left-1/2 top-1.5 h-1.5 w-1 -translate-x-1/2 rounded-full bg-current" />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">
            Scroll
          </span>
        </a>
      </section>

      {/* Why — lime manifesto, not another crown heading */}
      <section
        id="why"
        className="border-y border-[#222] bg-[#C8FF2E] px-6 py-20 text-[#0F1115] sm:px-10 sm:py-24"
      >
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end lg:gap-16">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#0F1115]/65">
              WHY THIS EXISTS
            </p>
            <h2 className="land-display mt-4 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl md:text-[2.75rem] md:leading-[1.05]">
              WhatsApp polls reward the fastest thumb.
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-[#0F1115]/78 sm:text-base">
              You play every week. You always turn up. Then a poll goes up while
              you’re driving or busy, someone else grabs the spot, and half of
              them ghost the court.
            </p>
          </div>
          <div className="rounded-[28px] border border-[#0F1115]/15 bg-[#0F1115] p-6 text-white sm:p-7">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#C8FF2E]">
              THE FIX
            </p>
            <p className="land-display mt-3 text-xl font-bold tracking-[-0.02em] sm:text-2xl">
              Reliability beats first tap.
            </p>
            <p className="mt-3 text-[14px] leading-relaxed text-[#B5B5B5]">
              Interest, pay, check-in, and a track record organisers can trust
              when they lock the lineup.
            </p>
            <ul className="mt-5 grid grid-cols-2 gap-2 text-[12px] font-semibold text-[#C8FF2E] sm:text-[13px]">
              {["Show interest", "Pay to lock", "Check in", "Build record"].map(
                (label) => (
                  <li
                    key={label}
                    className="rounded-full border border-[#C8FF2E]/35 px-3 py-1.5 text-center"
                  >
                    {label}
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* Who — audience cards, no twin crown block */}
      <section className="border-b border-[#222] bg-[#0F1115] px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-[#C8FF2E]">
                WHO IT’S FOR
              </p>
              <h2 className="land-display mt-3 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
                Clubs and private groups.
              </h2>
            </div>
            <p className="max-w-sm text-[15px] leading-relaxed text-[#B5B5B5] sm:text-right">
              All levels. Girls’ groups, guys’ groups, mixed. Same tools. You
              choose who gets in.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            <div className="land-float rounded-[28px] border border-[#C8FF2E]/35 bg-[#141414] p-7 shadow-[0_22px_50px_rgba(0,0,0,0.45)]">
              <div className="mb-4 h-1.5 w-12 rounded-full bg-[#C8FF2E]" />
              <h3 className="land-display text-2xl font-bold tracking-[-0.02em] text-white">
                Club owners
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[#B5B5B5]">
                Post sessions, take court fees on Stripe, check people in, and
                run Kings & Queens without a whiteboard.
              </p>
            </div>
            <div className="land-float land-float-delay-1 rounded-[28px] border border-white/12 bg-[#141414] p-7 shadow-[0_22px_50px_rgba(0,0,0,0.45)]">
              <div className="mb-4 h-1.5 w-12 rounded-full bg-[#C8FF2E]" />
              <h3 className="land-display text-2xl font-bold tracking-[-0.02em] text-white">
                Friends & private crews
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[#B5B5B5]">
                Invite-only groups, lineup by who actually shows, fair splits,
                wrap with scores and photos when you’re done.
              </p>
            </div>
          </div>
        </div>
      </section>

      <BrandSection id="how">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:px-10">
          <SectionHeading align="center" eyebrow="HOW IT WORKS" title="Join. Book. Play.">
            Not a WhatsApp poll. Not first-come chaos.
          </SectionHeading>
          <div className="land-section-rule mx-auto mt-10 mb-12 max-w-xl" />
          <ol className="grid gap-5 md:grid-cols-3">
            {[
              {
                n: "01",
                title: "Create or join a group",
                body: "Club circle or private friends. Levels, town, and who’s allowed in. Your call.",
              },
              {
                n: "02",
                title: "Post a mix-in or tournament",
                body: "Courts, format, fee, and time. Players show interest. You lock the lineup with reliability in mind, not who tapped first.",
              },
              {
                n: "03",
                title: "Pay, check in, play",
                body: "Pay locks the place. Ticket QR for check-in. No-shows get marked. People who turn up keep their reputation.",
              },
            ].map((step, i) => (
              <li
                key={step.n}
                className={`land-float rounded-[28px] border border-white/12 bg-[#0F1115]/78 p-6 shadow-[0_22px_50px_rgba(0,0,0,0.45)] backdrop-blur-[2px] ${
                  i === 1 ? "land-float-delay-1" : i === 2 ? "land-float-delay-2" : ""
                }`}
              >
                <span className="land-display text-sm font-bold tracking-[0.14em] text-[#C8FF2E]">
                  {step.n}
                </span>
                <h3 className="land-display mt-3 text-xl font-bold tracking-[-0.02em] text-white sm:text-2xl">
                  {step.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[#B5B5B5]">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </BrandSection>

      {/* Interactive Kings & Queens organiser demo */}
      <section id="demo" className="border-y border-[#222] bg-[#0F1115] px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            align="center"
            eyebrow="AUTO FIXTURES"
            title="Watch the board rebuild itself."
          >
            Pretend you’re the organiser. Type real scores on each court. After
            every round, winners move up toward Kings & Queens, losers drop,
            partners split. Win on Kings & Queens and you stay. Six rounds,
            twenty minutes each. After two hours, the winners on that top court
            own the night.
          </SectionHeading>
          <div className="mt-12">
            <KqDemo />
          </div>
        </div>
      </section>

      {/* Formats + wrap story */}
      <section id="formats" className="border-y border-[#222]">
        <div className="grid lg:grid-cols-2">
          <FormatsPanel />

          <div className="bg-[#C8FF2E] px-6 py-20 text-[#0F1115] sm:px-10 sm:py-24">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#0F1115]/70">
              SESSION WRAP
            </p>
            <h2 className="land-display mt-3 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
              Wrap after the night.
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#0F1115]/75">
              That night only. Who played, King & Queen, MVP, every score.
              Auto-plays through.
            </p>
            <WrapStoryCluster />
          </div>
        </div>
      </section>

      {/* Real app surfaces */}
      <section className="border-y border-[#222] bg-[#0F1115] px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            align="center"
            eyebrow="IN THE APP"
            title="Ticket, discovery, check-in."
          >
            Same assets and flows from the product. Not mock marketing chrome.
          </SectionHeading>

          <div className="mt-14 grid items-start gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14">
            <TicketMock className="mx-auto w-full max-w-[360px] lg:mx-0" />
            <div className="grid gap-5 sm:grid-cols-2">
              <figure className="land-float land-float-delay-1 overflow-hidden rounded-[28px] border border-white/10 bg-[#141414] shadow-[0_22px_50px_rgba(0,0,0,0.4)]">
                <Image
                  src="/app-discover.jpg"
                  alt="Discover groups near you"
                  width={720}
                  height={480}
                  className="aspect-[4/3] w-full object-cover"
                />
                <figcaption className="px-4 py-3.5">
                  <p className="land-display text-sm font-bold text-white">Discover</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#7A7A7A]">
                    Find public and approval groups by area and level.
                  </p>
                </figcaption>
              </figure>
              <figure className="land-float land-float-delay-2 overflow-hidden rounded-[28px] border border-white/10 bg-[#141414] shadow-[0_22px_50px_rgba(0,0,0,0.4)]">
                <Image
                  src="/app-play.jpg"
                  alt="My Games and session tickets"
                  width={720}
                  height={480}
                  className="aspect-[4/3] w-full object-cover"
                />
                <figcaption className="px-4 py-3.5">
                  <p className="land-display text-sm font-bold text-white">My Games</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#7A7A7A]">
                    Upcoming mix-ins, ticket QR, add to calendar.
                  </p>
                </figcaption>
              </figure>
              <div className="land-float land-float-delay-3 rounded-[28px] border border-[#C8FF2E]/45 bg-[#C8FF2E]/12 px-5 py-6 shadow-[0_18px_40px_rgba(200,255,46,0.08)] sm:col-span-2">
                <p className="text-xs font-semibold tracking-[0.16em] text-[#C8FF2E]">
                  CHECK-IN
                </p>
                <p className="land-display mt-2 text-xl font-bold tracking-[-0.02em] text-white sm:text-2xl">
                  Show up. Get marked. Build reliability.
                </p>
                <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[#B5B5B5]">
                  Camera scan or 6-character code. Arrived sticks. No-shows
                  stick too. Organisers see who turns up every week when the
                  next lineup goes out.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Session beats */}
      <section className="px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            align="center"
            eyebrow="IN THE SESSION"
            title="What a night looks like."
          >
            Check in. Play. Wrap. Progress you can see.
          </SectionHeading>

          <div className="mt-16 space-y-0">
            {SESSION_BEATS.map((item, i) => (
              <article
                key={item.n}
                className={`grid gap-6 border-t border-[#2A2A2A] py-12 md:grid-cols-[7rem_minmax(0,1fr)] md:gap-10 md:py-14 ${
                  i === SESSION_BEATS.length - 1 ? "border-b" : ""
                }`}
              >
                <div className="flex items-baseline gap-3 md:flex-col md:gap-2">
                  <span className="land-display text-4xl font-extrabold tracking-[-0.04em] text-[#C8FF2E] sm:text-5xl">
                    {item.n}
                  </span>
                  <span className="text-xs font-semibold tracking-[0.18em] text-[#7A7A7A] uppercase">
                    {item.label}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="land-display text-2xl font-bold tracking-[-0.03em] sm:text-3xl md:text-[2.1rem]">
                    {item.title}
                  </h3>
                  <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[#B5B5B5] sm:text-base">
                    {item.body}
                  </p>
                  <p className="mt-6 font-mono text-[13px] tracking-wide text-[#C8FF2E]/90 sm:text-sm">
                    {item.beat}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Missions */}
      <section className="border-y border-[#222] bg-[#0F1115] px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            align="center"
            eyebrow="MISSIONS"
            title="Medals for the people who show up."
          >
            The ones who pay, win, host, and never ghost. Reliability is the
            point, not a side badge.
          </SectionHeading>

          <ul className="mt-14 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {MISSIONS.map((m) => (
              <li key={m.title} className="flex flex-col items-center text-center">
                <Image
                  src={m.src}
                  alt={m.title}
                  width={160}
                  height={160}
                  className="land-medal h-24 w-24 object-contain sm:h-28 sm:w-28"
                />
                <p className="mt-3 land-display text-sm font-bold tracking-[-0.01em]">
                  {m.title}
                </p>
                <p className="mt-1 text-xs text-[#7A7A7A]">{m.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Payments */}
      <section className="px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            eyebrow="PAYMENTS"
            title="Real money. Real payouts. No honour system."
          >
            Organisers connect once with Stripe. Players pay the session fee
            in-app. Court share lands in the organiser’s bank. Platform fee
            handled automatically.
          </SectionHeading>

          <div className="mt-12 flex flex-wrap items-center gap-10 sm:gap-14">
            <StripeMark />
            <ApplePayMark />
            <GooglePayMark />
          </div>

          <ul className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              {
                title: "Stripe Connect",
                body: "Organisers onboard their bank in Admin → Payments. Payouts go live when Stripe says ready.",
              },
              {
                title: "Apple Pay & Google Pay",
                body: "Players check out in seconds with wallets or card inside the session pay sheet.",
              },
              {
                title: "Session unlock",
                body: "Paid players open the room, ticket QR for check-in, fixtures, and chat. Unpaid stays outside.",
              },
            ].map((item) => (
              <li key={item.title} className="border-t border-[#2A2A2A] pt-5">
                <h3 className="land-display text-lg font-bold tracking-[-0.02em]">
                  {item.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#B5B5B5]">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Download — tiled brand pattern fills the whole section (no mid cut-off) */}
      <section
        id="download"
        className="relative overflow-hidden bg-[#0F1115] px-6 py-28 sm:px-10"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            backgroundColor: "#0F1115",
            backgroundImage: "url(/brand-pattern.png)",
            backgroundRepeat: "repeat",
            backgroundPosition: "center top",
            // Fixed width keeps logos sharp; height follows 1024×448 aspect
            backgroundSize: "280px auto",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 42%, rgba(15,17,21,0.82) 0%, rgba(15,17,21,0.4) 55%, rgba(15,17,21,0.7) 100%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(200,255,46,0.5), transparent)",
          }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <SectionCrown className="mx-auto" />
          <h2 className="land-display text-3xl font-bold tracking-[-0.035em] sm:text-5xl">
            Get the app.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-[#B5B5B5]">
            iOS and Android. Questions → support.
          </p>
          <div className="mt-10 flex flex-col items-center gap-5">
            <StoreButtons />
            <Link
              href="/support"
              className="text-sm font-semibold text-[#B5B5B5] underline-offset-4 transition hover:text-[#C8FF2E] hover:underline"
            >
              Contact support
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#222] px-6 py-10 text-sm text-[#7A7A7A] sm:px-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/logo-wordmark.png"
              alt="Padel Nerdz"
              width={96}
              height={92}
              className="h-10 w-auto opacity-80"
            />
            <span>© {new Date().getFullYear()} Padel Nerdz</span>
          </div>
          <div className="flex flex-wrap gap-6">
            <Link href="/privacy" className="transition hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-white">
              Terms
            </Link>
            <Link href="/support" className="transition hover:text-white">
              Support
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
