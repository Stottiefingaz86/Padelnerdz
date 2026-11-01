"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORY_MS = 4200;
const ink = "#0F1115";
const volt = "#C8FF2E";

type StoryId = "cover" | "time" | "squad" | "awards" | "finale";

type SlideTheme = {
  bg: string;
  fg: string;
  muted: string;
  barTrack: string;
  barFill: string;
};

const STORIES: StoryId[] = ["cover", "time", "squad", "awards", "finale"];

/** Demo night — 12 locked, full board. */
const SQUAD = [
  "Alex",
  "Mia",
  "Sam",
  "Jordan",
  "Chris",
  "Lucia",
  "Tom",
  "Elena",
  "Ravi",
  "Noah",
  "Sofia",
  "Ben",
];

const THEMES: Record<StoryId, SlideTheme> = {
  cover: {
    bg: volt,
    fg: ink,
    muted: "rgba(15,17,21,0.62)",
    barTrack: "rgba(15,17,21,0.22)",
    barFill: ink,
  },
  time: {
    bg: ink,
    fg: "#fff",
    muted: "#B5B5B5",
    barTrack: "rgba(255,255,255,0.22)",
    barFill: "#fff",
  },
  squad: {
    bg: "#141414",
    fg: "#fff",
    muted: "#B5B5B5",
    barTrack: "rgba(255,255,255,0.22)",
    barFill: "#fff",
  },
  awards: {
    bg: volt,
    fg: ink,
    muted: "rgba(15,17,21,0.62)",
    barTrack: "rgba(15,17,21,0.22)",
    barFill: ink,
  },
  finale: {
    bg: ink,
    fg: "#fff",
    muted: "#B5B5B5",
    barTrack: "rgba(255,255,255,0.22)",
    barFill: "#fff",
  },
};

function StoryBody({ id, theme }: { id: StoryId; theme: SlideTheme }) {
  if (id === "cover") {
    return (
      <div className="flex flex-1 flex-col justify-between pt-2">
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.2em]"
            style={{ color: theme.muted }}
          >
            Tonight’s wrap
          </p>
          <p
            className="land-display mt-4 text-[2.35rem] font-extrabold leading-[0.95] tracking-[-0.05em]"
            style={{ color: theme.fg }}
          >
            One mix-in.
            <br />
            One night.
          </p>
        </div>
        <div>
          <p className="text-[13px] font-semibold" style={{ color: theme.fg }}>
            Wed 12 Nov · 19:30
          </p>
          <p className="mt-1 text-[12px] font-medium" style={{ color: theme.muted }}>
            Kings & Queens · Manilva
          </p>
          <div
            className="mt-5 inline-flex rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]"
            style={{ background: ink, color: volt }}
          >
            3 courts · 12 players
          </div>
        </div>
      </div>
    );
  }

  if (id === "time") {
    return (
      <div className="flex flex-1 flex-col justify-center">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.2em]"
          style={{ color: volt }}
        >
          Tonight
        </p>
        <p
          className="land-display mt-3 text-[5.5rem] font-extrabold leading-none tracking-[-0.07em]"
          style={{ color: theme.fg }}
        >
          9
        </p>
        <p
          className="land-display mt-1 text-[1.75rem] font-extrabold tracking-[-0.03em]"
          style={{ color: volt }}
        >
          matches played
        </p>
        <p className="mt-5 max-w-[14rem] text-[13px] leading-snug" style={{ color: theme.muted }}>
          2.5 hours on court. Every score locked in the session room.
        </p>
      </div>
    );
  }

  if (id === "squad") {
    return (
      <div className="flex flex-1 flex-col pt-1">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.2em]"
          style={{ color: volt }}
        >
          The squad
        </p>
        <p
          className="land-display mt-2 text-[1.45rem] font-extrabold leading-tight tracking-[-0.04em]"
          style={{ color: theme.fg }}
        >
          12 locked in. 12 showed.
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-0">
          {SQUAD.map((name, i) => (
            <li
              key={name}
              className="flex items-baseline justify-between border-b border-white/10 py-1.5"
            >
              <span
                className="land-display text-[13px] font-extrabold tracking-[-0.02em]"
                style={{ color: i % 2 === 0 ? volt : theme.fg }}
              >
                {name}
              </span>
              <span className="text-[9px] font-semibold" style={{ color: theme.muted }}>
                in
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (id === "awards") {
    return (
      <div className="flex flex-1 flex-col justify-between pt-1">
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.2em]"
            style={{ color: theme.muted }}
          >
            Night awards
          </p>
          <p
            className="land-display mt-3 text-[1.85rem] font-extrabold leading-[1.02] tracking-[-0.045em]"
            style={{ color: theme.fg }}
          >
            King & Queen
            <br />
            of the night.
          </p>
        </div>
        <div className="space-y-2.5">
          <div
            className="rounded-2xl px-3.5 py-3"
            style={{ background: ink, color: volt }}
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#C8FF2E]/70">
              King
            </p>
            <p className="land-display mt-1 text-[1.35rem] font-extrabold tracking-[-0.03em]">
              Alex
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-white/70">
              Top court · 3 wins
            </p>
          </div>
          <div
            className="rounded-2xl px-3.5 py-3"
            style={{ background: "rgba(15,17,21,0.12)", border: "1px solid rgba(15,17,21,0.2)" }}
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.muted }}>
              Queen
            </p>
            <p
              className="land-display mt-1 text-[1.35rem] font-extrabold tracking-[-0.03em]"
              style={{ color: theme.fg }}
            >
              Mia
            </p>
            <p className="mt-0.5 text-[11px] font-medium" style={{ color: theme.muted }}>
              Top court · 3 wins
            </p>
          </div>
          <div
            className="rounded-2xl px-3.5 py-2.5"
            style={{ background: "rgba(15,17,21,0.08)", border: "1px solid rgba(15,17,21,0.16)" }}
          >
            <p className="text-[10px] font-bold" style={{ color: theme.fg }}>
              MVP Chris · most improved Sam
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col justify-between pt-1">
      <div>
        <p
          className="text-[11px] font-bold uppercase tracking-[0.2em]"
          style={{ color: volt }}
        >
          Final board
        </p>
        <p
          className="land-display mt-2 text-[1.55rem] font-extrabold leading-tight tracking-[-0.04em]"
          style={{ color: theme.fg }}
        >
          Scores from tonight.
        </p>
        <ul className="mt-4 space-y-2">
          {[
            { court: "Court 1", a: "Alex / Sam", b: "Mia / Jordan", score: "6-4" },
            { court: "Court 2", a: "Chris / Lucia", b: "Tom / Elena", score: "6-3" },
            { court: "Court 3", a: "Ravi / Noah", b: "Sofia / Ben", score: "7-5" },
          ].map((m) => (
            <li
              key={m.court}
              className="rounded-xl px-3 py-2"
              style={{
                background: "rgba(200,255,46,0.1)",
                border: "1px solid rgba(200,255,46,0.28)",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: volt }}>
                  {m.court}
                </p>
                <p className="text-[15px] font-extrabold leading-none text-[#C8FF2E]">{m.score}</p>
              </div>
              <p className="mt-1 text-[11px] font-semibold text-white">{m.a}</p>
              <p className="text-[10px]" style={{ color: theme.muted }}>
                vs {m.b}
              </p>
            </li>
          ))}
        </ul>
      </div>
      <p className="pt-2 text-[11px] font-semibold" style={{ color: theme.muted }}>
        0 no-shows · lineup trusted next week
      </p>
    </div>
  );
}

/** One phone: nightly mix-in wrap, auto-advancing. */
export function WrapStoryCluster() {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const startRef = useRef(0);
  const progressRef = useRef(0);
  const rafRef = useRef(0);

  const goTo = useCallback((next: number) => {
    setIndex(((next % STORIES.length) + STORIES.length) % STORIES.length);
    setProgress(0);
    progressRef.current = 0;
    startRef.current = performance.now();
  }, []);

  useEffect(() => {
    startRef.current = performance.now() - progressRef.current * STORY_MS;
    const tick = (now: number) => {
      if (!paused) {
        const elapsed = now - startRef.current;
        const p = Math.min(1, elapsed / STORY_MS);
        progressRef.current = p;
        setProgress(p);
        if (p >= 1) {
          setIndex((i) => (i + 1) % STORIES.length);
          progressRef.current = 0;
          setProgress(0);
          startRef.current = now;
        }
      } else {
        startRef.current = now - progressRef.current * STORY_MS;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [paused, index]);

  const onTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.35) goTo(index - 1);
    else goTo(index + 1);
  };

  const story = STORIES[index];
  const theme = THEMES[story];

  return (
    <div className="mx-auto mt-10 flex w-full max-w-[280px] justify-center sm:mt-12 sm:max-w-[300px]">
      <div
        role="button"
        tabIndex={0}
        aria-label="Mix-in wrap. Tap left or right to change slide."
        className="land-float relative w-full cursor-pointer overflow-hidden rounded-[36px] border-[3px] border-[#0F1115] shadow-[0_30px_55px_rgba(0,0,0,0.45)] outline-none focus-visible:ring-2 focus-visible:ring-[#0F1115]/40"
        style={{ background: theme.bg, aspectRatio: "9 / 16" }}
        onClick={onTap}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") goTo(index - 1);
          if (e.key === "ArrowRight" || e.key === " ") {
            e.preventDefault();
            goTo(index + 1);
          }
        }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div className="relative flex h-full flex-col p-4 sm:p-5">
          <div className="mb-4 flex gap-1" aria-hidden>
            {STORIES.map((_, i) => (
              <div
                key={i}
                className="h-[3px] flex-1 overflow-hidden rounded-full"
                style={{ background: theme.barTrack }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    background: theme.barFill,
                    width: `${
                      i < index ? 100 : i === index ? Math.max(0, Math.min(1, progress)) * 100 : 0
                    }%`,
                  }}
                />
              </div>
            ))}
          </div>

          <div key={story} className="flex min-h-0 flex-1 flex-col land-rise">
            <StoryBody id={story} theme={theme} />
          </div>
        </div>
      </div>
    </div>
  );
}
