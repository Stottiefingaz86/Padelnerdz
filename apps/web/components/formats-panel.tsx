"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";

const FORMATS = [
  {
    id: "kq",
    label: "Kings & Queens",
    popular: true,
    blurb: "Most popular. Rotating courts each round.",
    rules: [
      "Best for regular mix-ins (8 / 12 / 16 players).",
      "After each match, winners move up a court and losers move down.",
      "Top court is Kings & Queens. Win there and you stay.",
      "Partners split every round. You don’t stay with the same teammate.",
      "The next round builds automatically from those results.",
    ],
  },
  {
    id: "tournament",
    label: "Tournament by wins",
    popular: false,
    blurb: "Fixed doubles teams. Groups, then knockout.",
    rules: [
      "Seed teams into skill bands, then into groups.",
      "Group stage: every team plays the others. Best of 9 games. Every game won is a table point.",
      "Top 2 from each group go through.",
      "Knockout: cross semis, 3rd/4th place, then the final.",
      "Needs enough courts and paid players to fill the draw.",
    ],
  },
  {
    id: "custom",
    label: "Custom (open play)",
    popular: false,
    blurb: "Paid session room. You run the courts.",
    rules: [
      "No auto Kings & Queens or tournament fixtures.",
      "Players still register, pay, and unlock session chat.",
      "You organise courts and scores yourself, or skip fixtures.",
      "Same ticket, check-in, and wrap when you close the night.",
    ],
  },
] as const;

export function FormatsPanel() {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="bg-[#0F1115] px-6 py-20 sm:px-10 sm:py-24">
      <Image
        src="/brand-crown.png"
        alt=""
        width={96}
        height={96}
        className="mb-5 h-12 w-12 object-contain mix-blend-screen"
        aria-hidden
      />

      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold tracking-[0.18em] text-[#C8FF2E]">
          FORMATS
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#C8FF2E]/55 text-[#C8FF2E] transition hover:bg-[#C8FF2E]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8FF2E]"
          aria-label="What each format means"
          title="What each format means"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <path
              d="M12 10.5v6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="12" cy="7.5" r="1.1" fill="currentColor" />
          </svg>
        </button>
      </div>

      <h2 className="land-display mt-3 text-3xl font-bold tracking-[-0.035em] text-white sm:text-4xl">
        Pick how the night runs.
      </h2>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#B5B5B5]">
        Three live formats in the app. Same payments, ticket, check-in, and wrap.
      </p>

      <ul className="mt-10 space-y-4">
        {FORMATS.map((f) => (
          <li
            key={f.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="land-display text-lg font-bold tracking-[-0.02em] text-white">
                {f.label}
              </h3>
              {f.popular ? (
                <span className="rounded-full bg-[#C8FF2E]/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#C8FF2E]">
                  POPULAR
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#B5B5B5]">
              {f.blurb}
            </p>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-8 text-sm font-semibold text-[#C8FF2E] underline-offset-4 transition hover:underline"
      >
        Full rules for each format
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-white/10 bg-[#141414] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.65)] sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-[#C8FF2E]">
                  FORMATS
                </p>
                <h3
                  id={titleId}
                  className="land-display mt-2 text-2xl font-bold tracking-[-0.03em] text-white"
                >
                  How each one works
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/15 px-3 py-1.5 text-sm font-semibold text-white/80 transition hover:border-white/35 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-8 space-y-8">
              {FORMATS.map((f) => (
                <div key={f.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="land-display text-lg font-bold text-white">
                      {f.label}
                    </p>
                    {f.popular ? (
                      <span className="rounded-full bg-[#C8FF2E]/15 px-2 py-0.5 text-[10px] font-bold text-[#C8FF2E]">
                        POPULAR
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-[#B5B5B5]">{f.blurb}</p>
                  <ul className="mt-3 space-y-2">
                    {f.rules.map((rule) => (
                      <li
                        key={rule}
                        className="flex gap-2 text-[14px] leading-relaxed text-[#CFCFCF]"
                      >
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C8FF2E]" />
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
