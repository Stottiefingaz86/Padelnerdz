import Image from "next/image";
import type { ReactNode } from "react";

const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL ?? "#download";
/** Android → preview APK download (same-origin redirect to EAS artifact). */
const ANDROID_APK_URL =
  process.env.NEXT_PUBLIC_ANDROID_APK_URL ?? "/download/android";

const OCTOGANO_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent(
    'Padel Tennis Club "The Octagon" Sotogrande, s/n, P.º del Río, 11310 Sotogrande San Roque, Cádiz',
  );

/** Official-style black App Store badge. */
export function AppStoreBadge({ className = "" }: { className?: string }) {
  return (
    <a
      href={APP_STORE_URL}
      className={`inline-flex h-[48px] min-w-[148px] items-center gap-2.5 rounded-[8px] border border-white/25 bg-black px-3.5 text-white transition hover:border-white/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8FF2E] ${className}`}
      aria-label="Download on the App Store"
    >
      <svg width="22" height="26" viewBox="0 0 814 1000" aria-hidden fill="currentColor">
        <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127.1C46.7 790.7 0 663 0 541.8c0-194.3 126.4-297.4 250.8-297.4 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.1zm-234-156.7c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
      </svg>
      <span className="flex flex-col items-start leading-none">
        <span className="text-[10px] font-medium tracking-wide text-white/80">
          Download on the
        </span>
        <span className="mt-0.5 text-[17px] font-semibold tracking-tight">
          App Store
        </span>
      </span>
    </a>
  );
}

/** Official-style black Google Play badge, downloads the Android preview APK. */
export function GooglePlayBadge({ className = "" }: { className?: string }) {
  return (
    <a
      href={ANDROID_APK_URL}
      download="padel-nerdz.apk"
      className={`inline-flex h-[48px] min-w-[158px] items-center gap-2.5 rounded-[8px] border border-white/25 bg-black px-3.5 text-white transition hover:border-white/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8FF2E] ${className}`}
      aria-label="Download Android APK"
    >
      <svg width="24" height="26" viewBox="0 0 32 35" aria-hidden>
        <path fill="#00F076" d="M1 1.5v32L18.5 17.5 1 1.5z" />
        <path fill="#FFD400" d="M18.5 17.5 24 14.3 18.5 11v6.5z" />
        <path
          fill="#FF3A44"
          d="M1 1.5 18.5 11l5.5-3.2L4.2.4C3.3-.1 2.2.1 1.5.8L1 1.5z"
        />
        <path
          fill="#00D0FF"
          d="M1 33.5 18.5 24l5.5 3.2-15.8 9.4c-.9.5-2 .3-2.7-.4L1 33.5z"
        />
      </svg>
      <span className="flex flex-col items-start leading-none">
        <span className="text-[9px] font-medium tracking-[0.08em] text-white/80">
          GET IT ON
        </span>
        <span className="mt-0.5 text-[17px] font-semibold tracking-tight">
          Google Play
        </span>
      </span>
    </a>
  );
}

export function StoreButtons() {
  return (
    <div className="flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:max-w-none sm:w-auto sm:flex-row sm:items-center sm:flex-wrap">
      <AppStoreBadge className="w-full justify-center sm:w-auto" />
      <GooglePlayBadge className="w-full justify-center sm:w-auto" />
    </div>
  );
}

export function SectionCrown({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/brand-crown.png"
      alt=""
      width={112}
      height={112}
      className={`mx-auto mb-4 h-11 w-11 object-contain mix-blend-screen sm:h-12 sm:w-12 ${className}`}
      aria-hidden
    />
  );
}

export function SectionHeading({
  eyebrow,
  title,
  children,
  align = "left",
  crown = true,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  align?: "left" | "center";
  /** Show the brand crown above the heading. Default true. */
  crown?: boolean;
}) {
  const center = align === "center";
  return (
    <div className={center ? "text-center" : ""}>
      {crown ? <SectionCrown /> : null}
      {eyebrow ? (
        <p
          className={`text-xs font-semibold tracking-[0.18em] text-[#C8FF2E] ${
            center ? "" : "text-left"
          }`}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={`land-display mt-3 max-w-3xl text-3xl font-bold tracking-[-0.035em] sm:text-4xl md:text-[2.65rem] ${
          center ? "mx-auto" : ""
        }`}
      >
        {title}
      </h2>
      {children ? (
        <div
          className={`mt-5 max-w-2xl text-base leading-relaxed text-[#B5B5B5] ${
            center ? "mx-auto" : ""
          }`}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** Session ticket mock matching the in-app SessionTicketCard. */
export function TicketMock({ className = "" }: { className?: string }) {
  const qr =
    "https://api.qrserver.com/v1/create-qr-code/?size=280x280&bgcolor=0B0D10&color=C8FF2E&data=" +
    encodeURIComponent("padelnerdz://checkin/demo-session/demo-player/A1B2C3");

  return (
    <div
      className={`land-float overflow-hidden rounded-[28px] border border-white/10 bg-[#141414] shadow-[0_28px_60px_rgba(0,0,0,0.55)] ${className}`}
    >
      <div className="rounded-b-[4px] bg-[#C8FF2E] px-5 py-4 text-[#0F1115]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-[0.16em]">MIXY</span>
          <span className="rounded-full bg-[#0F1115] px-2.5 py-1 text-[10px] font-bold text-[#C8FF2E]">
            SESSION
          </span>
        </div>
        <p className="land-display mt-2.5 text-xl font-extrabold tracking-[-0.02em]">
          Weekday Kings & Queens
        </p>
        <p className="mt-1 text-xs font-medium opacity-70">Kings & Queens · 3 courts</p>
      </div>
      <div className="flex gap-1.5 px-4 py-2">
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} className="h-0.5 flex-1 rounded-full bg-[#2A2A2A]" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 px-5 pb-2 pt-1">
        {[
          { l: "DATE", v: "Wed 12 Nov" },
          { l: "TIME", v: "19:30" },
          { l: "PLAYERS", v: "12/12" },
        ].map((c) => (
          <div key={c.l}>
            <p className="text-[10px] font-semibold tracking-wider text-[#7A7A7A]">{c.l}</p>
            <p className="mt-0.5 text-sm font-semibold text-white">{c.v}</p>
          </div>
        ))}
      </div>
      <div className="px-5 pb-3">
        <p className="text-[10px] font-semibold tracking-wider text-[#7A7A7A]">LOCATION</p>
        <a
          href={OCTOGANO_MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 inline-flex max-w-full items-center gap-1.5 text-sm font-semibold text-white transition hover:text-[#C8FF2E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8FF2E]"
          aria-label="Open Octogano Sotogrande in Google Maps"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="shrink-0 text-[#C8FF2E]"
          >
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="truncate">Octogano Sotogrande</span>
        </a>
      </div>
      <div className="mx-4 mb-4 flex flex-col items-center gap-2 rounded-[22px] border border-[#C8FF2E]/25 bg-[#0F1115] px-4 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qr}
          alt="Check-in QR"
          width={148}
          height={148}
          className="h-[148px] w-[148px] rounded-2xl"
        />
        <p className="text-[11px] font-semibold tracking-[0.12em] text-[#C8FF2E]">
          CHECK-IN CODE A1B2C3
        </p>
        <p className="max-w-[220px] text-center text-[11px] leading-relaxed text-[#7A7A7A]">
          Show this at the gate. Organiser scans or types the code.
        </p>
      </div>
    </div>
  );
}

export function StripeMark({ className = "" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brands/stripe.svg"
      alt="Stripe"
      width={110}
      height={46}
      className={`h-9 w-auto ${className}`}
    />
  );
}

export function ApplePayMark({ className = "" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brands/apple-pay.svg"
      alt="Apple Pay"
      width={80}
      height={33}
      className={`h-8 w-auto ${className}`}
    />
  );
}

export function GooglePayMark({ className = "" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brands/google-pay.svg"
      alt="Google Pay"
      width={96}
      height={36}
      className={`h-8 w-auto ${className}`}
    />
  );
}
