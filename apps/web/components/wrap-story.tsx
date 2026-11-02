"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORY_MS = 4200;
const ink = "#0F1115";
const volt = "#C8FF2E";

type StoryId =
  | "cover"
  | "photo"
  | "squad"
  | "chat"
  | "finale"
  | "awards"
  | "roundup";

type SlideTheme = {
  bg: string;
  fg: string;
  muted: string;
  barTrack: string;
  barFill: string;
};

const STORIES: StoryId[] = [
  "cover",
  "photo",
  "squad",
  "chat",
  "finale",
  "awards",
  "roundup",
];

type Player = { name: string; avatar: string };

/** Demo night, 12 locked, full board. */
const SQUAD: Player[] = [
  { name: "Alex", avatar: "https://i.pravatar.cc/96?img=12" },
  { name: "Mia", avatar: "https://i.pravatar.cc/96?img=5" },
  { name: "Sam", avatar: "https://i.pravatar.cc/96?img=14" },
  { name: "Jordan", avatar: "https://i.pravatar.cc/96?img=20" },
  { name: "Chris", avatar: "https://i.pravatar.cc/96?img=11" },
  { name: "Lucia", avatar: "https://i.pravatar.cc/96?img=9" },
  { name: "Tom", avatar: "https://i.pravatar.cc/96?img=33" },
  { name: "Elena", avatar: "https://i.pravatar.cc/96?img=47" },
  { name: "Ravi", avatar: "https://i.pravatar.cc/96?img=52" },
  { name: "Noah", avatar: "https://i.pravatar.cc/96?img=68" },
  { name: "Sofia", avatar: "https://i.pravatar.cc/96?img=32" },
  { name: "Ben", avatar: "https://i.pravatar.cc/96?img=60" },
];

const BY_NAME = Object.fromEntries(SQUAD.map((p) => [p.name, p])) as Record<
  string,
  Player
>;

const THEMES: Record<StoryId, SlideTheme> = {
  cover: {
    bg: volt,
    fg: ink,
    muted: "rgba(15,17,21,0.62)",
    barTrack: "rgba(15,17,21,0.22)",
    barFill: ink,
  },
  photo: {
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
  chat: {
    bg: "#0F1115",
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
  roundup: {
    bg: volt,
    fg: ink,
    muted: "rgba(15,17,21,0.62)",
    barTrack: "rgba(15,17,21,0.22)",
    barFill: ink,
  },
};

function Avatar({
  player,
  size = 28,
  ring,
}: {
  player: Player;
  size?: number;
  ring?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={player.avatar}
      alt=""
      width={size}
      height={size}
      title={player.name}
      className="rounded-full object-cover"
      style={{
        width: size,
        height: size,
        boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
      }}
    />
  );
}

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
          <div className="mt-5 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/octogono-sotogrande.png"
              alt="Octogono Sotogrande"
              width={128}
              height={128}
              className="h-28 w-28 rounded-full object-cover ring-[3px] ring-[#0F1115] shadow-[0_10px_28px_rgba(15,17,21,0.22)]"
            />
          </div>
          <p
            className="land-display mt-4 text-center text-[1.85rem] font-extrabold leading-[1.02] tracking-[-0.045em]"
            style={{ color: theme.fg }}
          >
            Octogono
            <br />
            Sotogrande
          </p>
          <div className="mt-4 flex justify-center -space-x-2">
            {SQUAD.slice(0, 6).map((p) => (
              <Avatar key={p.name} player={p} size={32} ring={volt} />
            ))}
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold"
              style={{ background: ink, color: volt }}
            >
              +6
            </span>
          </div>
        </div>
        <div>
          <p className="text-[13px] font-semibold" style={{ color: theme.fg }}>
            Wed 12 Nov · 19:30
          </p>
          <p className="mt-1 text-[12px] font-medium" style={{ color: theme.muted }}>
            Kings & Queens · 3 courts
          </p>
          <div
            className="mt-5 inline-flex rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]"
            style={{ background: ink, color: volt }}
          >
            Tap through the night
          </div>
        </div>
      </div>
    );
  }

  if (id === "photo") {
    return (
      <div className="relative -mx-1 flex flex-1 flex-col overflow-hidden rounded-[22px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/wrap-night.jpg"
          alt="Group photo from tonight"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(15,17,21,0.55) 0%, transparent 35%, transparent 55%, rgba(15,17,21,0.92) 100%)",
          }}
        />
        <div className="relative z-[1] flex flex-1 flex-col justify-between p-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#C8FF2E]">
              Shared from chat
            </p>
            <p className="land-display mt-2 text-[1.55rem] font-extrabold leading-tight tracking-[-0.04em] text-white">
              The night on court.
            </p>
          </div>
          <div>
            <div className="mb-2 flex -space-x-1.5">
              {SQUAD.slice(0, 8).map((p) => (
                <Avatar key={p.name} player={p} size={26} ring="#0F1115" />
              ))}
            </div>
            <p className="text-[12px] font-semibold text-white/85">
              Posted in the session room · 12 in the shot
            </p>
          </div>
        </div>
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
        <ul className="mt-4 grid grid-cols-2 gap-2">
          {SQUAD.map((p) => (
            <li
              key={p.name}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-2 py-1.5"
            >
              <Avatar player={p} size={28} />
              <span
                className="land-display truncate text-[12px] font-extrabold tracking-[-0.02em]"
                style={{ color: theme.fg }}
              >
                {p.name}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (id === "chat") {
    const messages: {
      from: Player;
      text: string;
      mine?: boolean;
      flames?: number;
    }[] = [
      { from: BY_NAME.Mia, text: "Court 1 is flying. Who’s next?", flames: 4 },
      { from: BY_NAME.Alex, text: "We take that. 6-4.", mine: true, flames: 8 },
      { from: BY_NAME.Sofia, text: "Photo from the glass coming in" },
      { from: BY_NAME.Chris, text: "Check-in done. Let’s go round 3." },
      { from: BY_NAME.Lucia, text: "Queen energy tonight", flames: 6 },
    ];
    const floatFlames = [
      { left: "12%", delay: "0s", duration: "2.6s", size: "1.15rem", x: "-6px" },
      { left: "28%", delay: "0.45s", duration: "3.1s", size: "0.95rem", x: "10px" },
      { left: "46%", delay: "0.9s", duration: "2.4s", size: "1.35rem", x: "-12px" },
      { left: "62%", delay: "0.2s", duration: "2.9s", size: "1.05rem", x: "14px" },
      { left: "78%", delay: "1.15s", duration: "2.7s", size: "1.2rem", x: "4px" },
      { left: "38%", delay: "1.5s", duration: "3.2s", size: "0.85rem", x: "-8px" },
      { left: "70%", delay: "1.8s", duration: "2.5s", size: "1.1rem", x: "8px" },
    ];
    return (
      <div className="relative flex flex-1 flex-col overflow-hidden pt-1">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.2em]"
          style={{ color: volt }}
        >
          Session chat
        </p>
        <p
          className="land-display mt-2 text-[1.45rem] font-extrabold leading-tight tracking-[-0.04em]"
          style={{ color: theme.fg }}
        >
          The room while you played.
        </p>
        <div className="relative mt-4 flex flex-1 flex-col justify-end gap-2.5">
          {messages.map((m, i) => (
            <div
              key={`${m.from.name}-${i}`}
              className={`relative flex max-w-[92%] items-end gap-2 ${
                m.mine ? "ml-auto flex-row-reverse" : ""
              }`}
            >
              <Avatar player={m.from} size={24} />
              <div className="relative">
                <div
                  className="rounded-2xl px-3 py-2"
                  style={{
                    background: m.mine ? volt : "rgba(255,255,255,0.08)",
                    color: m.mine ? ink : "#fff",
                    borderRadius: m.mine
                      ? "16px 16px 4px 16px"
                      : "16px 16px 16px 4px",
                  }}
                >
                  {!m.mine ? (
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#C8FF2E]/80">
                      {m.from.name}
                    </p>
                  ) : null}
                  <p className="text-[12px] font-semibold leading-snug">{m.text}</p>
                </div>
                {m.flames ? (
                  <span
                    className={`absolute -bottom-2 ${
                      m.mine ? "left-1" : "right-1"
                    } inline-flex items-center gap-0.5 rounded-full border border-white/15 bg-[#1A1C20] px-1.5 py-0.5 text-[10px] font-bold text-white shadow-[0_4px_12px_rgba(0,0,0,0.35)]`}
                  >
                    <span aria-hidden>🔥</span>
                    {m.flames}
                  </span>
                ) : null}
              </div>
            </div>
          ))}

          <div className="pointer-events-none absolute inset-x-0 bottom-8 top-0 overflow-hidden" aria-hidden>
            {floatFlames.map((f, i) => (
              <span
                key={i}
                className="wrap-flame"
                style={{
                  left: f.left,
                  bottom: "8%",
                  fontSize: f.size,
                  animationDelay: f.delay,
                  animationDuration: f.duration,
                  ["--flame-x" as string]: f.x,
                }}
              >
                🔥
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (id === "awards") {
    const king = BY_NAME.Alex;
    const queen = BY_NAME.Mia;
    const mvp = BY_NAME.Chris;
    const improved = BY_NAME.Sam;
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
        <div className="flex flex-1 items-center justify-center py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand-crown.png"
            alt=""
            width={120}
            height={120}
            className="h-[7.5rem] w-[7.5rem] object-contain drop-shadow-[0_8px_24px_rgba(15,17,21,0.28)]"
            aria-hidden
          />
        </div>
        <div className="space-y-2.5">
          <div
            className="flex items-center gap-3 rounded-2xl px-3.5 py-3"
            style={{ background: ink, color: volt }}
          >
            <Avatar player={king} size={44} ring={volt} />
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#C8FF2E]/70">
                King
              </p>
              <p className="land-display mt-0.5 text-[1.25rem] font-extrabold tracking-[-0.03em]">
                {king.name}
              </p>
              <p className="text-[11px] font-medium text-white/70">
                Top court · 3 wins
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-3 rounded-2xl px-3.5 py-3"
            style={{
              background: "rgba(15,17,21,0.12)",
              border: "1px solid rgba(15,17,21,0.2)",
            }}
          >
            <Avatar player={queen} size={44} ring="rgba(15,17,21,0.35)" />
            <div className="min-w-0">
              <p
                className="text-[9px] font-bold uppercase tracking-[0.16em]"
                style={{ color: theme.muted }}
              >
                Queen
              </p>
              <p
                className="land-display mt-0.5 text-[1.25rem] font-extrabold tracking-[-0.03em]"
                style={{ color: theme.fg }}
              >
                {queen.name}
              </p>
              <p className="text-[11px] font-medium" style={{ color: theme.muted }}>
                Top court · 3 wins
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5"
            style={{
              background: "rgba(15,17,21,0.08)",
              border: "1px solid rgba(15,17,21,0.16)",
            }}
          >
            <Avatar player={mvp} size={28} />
            <Avatar player={improved} size={28} />
            <p className="text-[10px] font-bold" style={{ color: theme.fg }}>
              MVP {mvp.name} · most improved {improved.name}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (id === "finale") {
    return (
      <div className="flex flex-1 flex-col justify-between pt-1">
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.2em]"
            style={{ color: volt }}
          >
            Night scores
          </p>
          <p
            className="land-display mt-2 text-[1.55rem] font-extrabold leading-tight tracking-[-0.04em]"
            style={{ color: theme.fg }}
          >
            The night in
            <br />
            numbers.
          </p>

          {/* Hero: biggest win */}
          <div
            className="mt-5 overflow-hidden rounded-[22px]"
            style={{
              background: `linear-gradient(160deg, ${volt} 0%, #9AD40E 100%)`,
              color: ink,
            }}
          >
            <div className="px-4 pb-4 pt-3.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#0F1115]/70">
                Biggest win
              </p>
              <p className="land-display mt-1 text-[3.1rem] font-extrabold leading-none tracking-[-0.06em]">
                6–1
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex -space-x-2">
                  <Avatar player={BY_NAME.Alex} size={30} ring={ink} />
                  <Avatar player={BY_NAME.Sam} size={30} ring={ink} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-extrabold tracking-[-0.02em]">
                    Alex / Sam
                  </p>
                  <p className="text-[11px] font-medium text-[#0F1115]/65">
                    beat Tom / Elena · court 2
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Pair: closest + mover */}
          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            <div
              className="rounded-[20px] px-3 py-3"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <p
                className="text-[8px] font-bold uppercase tracking-[0.16em]"
                style={{ color: volt }}
              >
                Closest
              </p>
              <p
                className="land-display mt-1.5 text-[1.85rem] font-extrabold leading-none tracking-[-0.05em]"
                style={{ color: volt }}
              >
                7–6
              </p>
              <div className="mt-3 flex -space-x-1.5">
                <Avatar player={BY_NAME.Mia} size={22} ring="#0F1115" />
                <Avatar player={BY_NAME.Jordan} size={22} ring="#0F1115" />
              </div>
              <p className="mt-1.5 text-[11px] font-bold text-white">Mia / Jordan</p>
              <p className="mt-0.5 text-[10px] font-medium" style={{ color: theme.muted }}>
                Top court thriller
              </p>
            </div>

            <div
              className="rounded-[20px] px-3 py-3"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <p
                className="text-[8px] font-bold uppercase tracking-[0.16em]"
                style={{ color: volt }}
              >
                Biggest mover
              </p>
              <p
                className="land-display mt-1.5 text-[1.85rem] font-extrabold leading-none tracking-[-0.05em]"
                style={{ color: volt }}
              >
                +3
              </p>
              <div className="mt-3">
                <Avatar player={BY_NAME.Sofia} size={22} ring="#0F1115" />
              </div>
              <p className="mt-1.5 text-[11px] font-bold text-white">Sofia</p>
              <p className="mt-0.5 text-[10px] font-medium" style={{ color: theme.muted }}>
                Court 4 → top
              </p>
            </div>
          </div>
        </div>

        <div
          className="mt-3 inline-flex self-start rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{
            background: "rgba(200,255,46,0.12)",
            color: volt,
            border: "1px solid rgba(200,255,46,0.28)",
          }}
        >
          18 games · highlights
        </div>
      </div>
    );
  }

  const unlocked = [
    {
      src: "/missions/mixin_winner.png",
      title: "Mix-in winner",
      player: BY_NAME.Alex,
    },
    {
      src: "/missions/wins_3.png",
      title: "Hat-trick",
      player: BY_NAME.Sam,
    },
    {
      src: "/missions/comeback.png",
      title: "Comeback",
      player: BY_NAME.Sofia,
    },
    {
      src: "/missions/reliable_5.png",
      title: "Shows up",
      player: BY_NAME.Chris,
    },
  ];

  return (
    <div className="flex flex-1 flex-col justify-between pt-1">
      <div>
        <p
          className="text-[11px] font-bold uppercase tracking-[0.2em]"
          style={{ color: theme.muted }}
        >
          Tonight’s wrap
        </p>
        <p
          className="land-display mt-2 text-[1.7rem] font-extrabold leading-[1.02] tracking-[-0.045em]"
          style={{ color: theme.fg }}
        >
          One mix-in.
          <br />
          One night.
        </p>

        <div
          className="mt-3 flex items-center gap-2.5 rounded-2xl px-2.5 py-2"
          style={{
            background: "rgba(15,17,21,0.1)",
            border: "1px solid rgba(15,17,21,0.14)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/octogono-sotogrande.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-[#0F1115]"
            aria-hidden
          />
          <div className="min-w-0">
            <p
              className="truncate text-[13px] font-extrabold tracking-[-0.02em]"
              style={{ color: theme.fg }}
            >
              Octogono Sotogrande
            </p>
            <p className="text-[11px] font-medium" style={{ color: theme.muted }}>
              Wed 12 Nov · 19:30 · Kings & Queens
            </p>
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          {[
            { label: "Games", value: "18" },
            { label: "Courts", value: "3" },
            { label: "Checked in", value: "12/12" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl px-2 py-2"
              style={{ background: "rgba(15,17,21,0.1)" }}
            >
              <p
                className="text-[8px] font-bold uppercase tracking-[0.12em]"
                style={{ color: theme.muted }}
              >
                {stat.label}
              </p>
              <p
                className="land-display mt-0.5 text-[1.05rem] font-extrabold tracking-[-0.03em]"
                style={{ color: theme.fg }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <div
            className="rounded-2xl px-3 py-2.5"
            style={{ background: ink, color: volt }}
          >
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#C8FF2E]/70">
              King
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <Avatar player={BY_NAME.Alex} size={26} ring={volt} />
              <div className="min-w-0">
                <p className="land-display text-[1rem] font-extrabold tracking-[-0.03em]">
                  Alex
                </p>
                <p className="text-[10px] font-medium text-[#C8FF2E]/65">3 wins · top court</p>
              </div>
            </div>
          </div>
          <div
            className="rounded-2xl px-3 py-2.5"
            style={{
              background: "rgba(15,17,21,0.12)",
              border: "1px solid rgba(15,17,21,0.18)",
            }}
          >
            <p
              className="text-[8px] font-bold uppercase tracking-[0.14em]"
              style={{ color: theme.muted }}
            >
              Queen
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <Avatar player={BY_NAME.Mia} size={26} ring="rgba(15,17,21,0.35)" />
              <div className="min-w-0">
                <p
                  className="land-display text-[1rem] font-extrabold tracking-[-0.03em]"
                  style={{ color: theme.fg }}
                >
                  Mia
                </p>
                <p className="text-[10px] font-medium" style={{ color: theme.muted }}>
                  3 wins · top court
                </p>
              </div>
            </div>
          </div>
        </div>

        <p
          className="mt-3 text-[9px] font-bold uppercase tracking-[0.16em]"
          style={{ color: theme.muted }}
        >
          Missions unlocked · 4
        </p>
        <ul className="mt-1.5 space-y-1">
          {unlocked.map((m) => (
            <li
              key={m.title}
              className="flex items-center gap-2 rounded-xl px-2 py-1"
              style={{
                background: "rgba(15,17,21,0.1)",
                border: "1px solid rgba(15,17,21,0.14)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.src}
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 shrink-0 object-contain"
                aria-hidden
              />
              <p
                className="min-w-0 flex-1 truncate text-[11px] font-bold"
                style={{ color: theme.fg }}
              >
                {m.title}
              </p>
              <Avatar player={m.player} size={20} />
              <p
                className="w-11 shrink-0 truncate text-right text-[10px] font-semibold"
                style={{ color: theme.muted }}
              >
                {m.player.name}
              </p>
            </li>
          ))}
        </ul>
      </div>
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
