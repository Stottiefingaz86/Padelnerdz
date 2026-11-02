"use client";

import { useMemo, useState } from "react";

/** Career totals: one mix-in can hold many matches (e.g. K&Q rounds). */
const MIXINS = 24;
const GAMES = 142;
const WINS = 91;
const LOSSES = GAMES - WINS;

type PlayerRef = { name: string; avatar: string };

type MatchResult = {
  win: boolean;
  score: string;
  partner: PlayerRef;
  opponents: [PlayerRef, PlayerRef];
};

const P = {
  sofia: { name: "Sofia", avatar: "https://i.pravatar.cc/64?img=5" },
  marco: { name: "Marco", avatar: "https://i.pravatar.cc/64?img=12" },
  elena: { name: "Elena", avatar: "https://i.pravatar.cc/64?img=9" },
  james: { name: "James", avatar: "https://i.pravatar.cc/64?img=14" },
  lucia: { name: "Lucia", avatar: "https://i.pravatar.cc/64?img=20" },
  alex: { name: "Alex", avatar: "https://i.pravatar.cc/64?img=33" },
  nina: { name: "Nina", avatar: "https://i.pravatar.cc/64?img=47" },
  omar: { name: "Omar", avatar: "https://i.pravatar.cc/64?img=52" },
  diego: { name: "Diego", avatar: "https://i.pravatar.cc/64?img=68" },
} as const;

/** Recent form only (last matches), not one chip per mix-in. */
const FORM: MatchResult[] = [
  { win: true, score: "6-3", partner: P.sofia, opponents: [P.marco, P.elena] },
  { win: false, score: "4-6", partner: P.alex, opponents: [P.james, P.lucia] },
  { win: true, score: "6-2", partner: P.nina, opponents: [P.omar, P.diego] },
  { win: true, score: "7-5", partner: P.sofia, opponents: [P.elena, P.alex] },
  { win: true, score: "6-4", partner: P.marco, opponents: [P.lucia, P.nina] },
  { win: false, score: "3-6", partner: P.james, opponents: [P.sofia, P.omar] },
  { win: true, score: "6-1", partner: P.elena, opponents: [P.diego, P.alex] },
  { win: false, score: "5-7", partner: P.lucia, opponents: [P.marco, P.nina] },
  { win: true, score: "6-3", partner: P.omar, opponents: [P.james, P.sofia] },
  { win: true, score: "6-4", partner: P.diego, opponents: [P.elena, P.lucia] },
  { win: false, score: "2-6", partner: P.alex, opponents: [P.nina, P.omar] },
  { win: true, score: "6-2", partner: P.sofia, opponents: [P.marco, P.james] },
];

function TinyAvatar({ player }: { player: PlayerRef }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={player.avatar}
      alt=""
      width={22}
      height={22}
      title={player.name}
      className="h-[22px] w-[22px] rounded-full object-cover ring-1 ring-white/20"
    />
  );
}

function FormChart({
  form,
  selected,
  onSelect,
}: {
  form: MatchResult[];
  selected: number | null;
  onSelect: (i: number) => void;
}) {
  const w = 320;
  const h = 72;
  const padX = 8;
  const padY = 10;

  const points = useMemo(() => {
    let wins = 0;
    return form.map((m, i) => {
      if (m.win) wins += 1;
      const r = wins / (i + 1);
      const x = padX + (i / Math.max(1, form.length - 1)) * (w - padX * 2);
      const y = padY + (1 - r) * (h - padY * 2);
      return { x, y, i };
    });
  }, [form]);

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-[72px] w-full"
      role="img"
      aria-label="Win rate over recent games"
    >
      <path
        d={path}
        fill="none"
        stroke="#C8FF2E"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p) => {
        const on = selected === p.i;
        const win = form[p.i]!.win;
        return (
          <g key={p.i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={on ? 6 : 4}
              fill={win ? "#C8FF2E" : "#0F1115"}
              stroke={win ? "#C8FF2E" : "#7A7A7A"}
              strokeWidth={2}
              className="cursor-pointer"
              onClick={() => onSelect(p.i)}
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={12}
              fill="transparent"
              className="cursor-pointer"
              onClick={() => onSelect(p.i)}
            />
          </g>
        );
      })}
    </svg>
  );
}

export function ProfileProgressDemo() {
  const [selected, setSelected] = useState<number | null>(0);
  const winPct = Math.round((WINS / GAMES) * 100);
  const match = selected == null ? null : FORM[selected]!;

  return (
    <div className="mt-10 overflow-hidden rounded-[24px] border border-white/10 bg-[#141414]">
      <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://i.pravatar.cc/128?img=11"
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 rounded-full object-cover"
        />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C8FF2E]">
            Your profile
          </p>
          <p className="land-display truncate text-base font-bold tracking-[-0.02em] text-white">
            Chris H.
          </p>
        </div>
        <span className="ml-auto rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-[#B5B5B5]">
          Level · Intermediate
        </span>
      </div>

      <div className="grid grid-cols-3 divide-x divide-white/8 border-b border-white/8">
        {[
          { label: "Games", value: String(GAMES) },
          { label: "W-L", value: `${WINS}-${LOSSES}` },
          { label: "Win rate", value: `${winPct}%`, accent: true },
        ].map((s) => (
          <div key={s.label} className="px-3 py-3 text-center">
            <p
              className={`land-display text-lg font-bold tracking-[-0.02em] ${
                s.accent ? "text-[#C8FF2E]" : "text-white"
              }`}
            >
              {s.value}
            </p>
            <p className="mt-0.5 text-[11px] text-[#7A7A7A]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="px-4 py-3.5">
        <div className="mb-1 flex items-center justify-between gap-3">
          <p className="text-[12px] font-semibold text-white">Form</p>
          <p className="text-[11px] text-[#7A7A7A]">
            Last {FORM.length} matches
          </p>
        </div>

        {match ? (
          <div className="mb-2 rounded-xl border border-white/10 bg-[#0F1115] px-3 py-2">
            <div className="flex items-baseline justify-between gap-2">
              <p className="land-display text-sm font-bold text-white">
                <span className={match.win ? "text-[#C8FF2E]" : "text-[#B5B5B5]"}>
                  {match.win ? "Win" : "Loss"}
                </span>
                <span className="text-white"> {match.score}</span>
              </p>
              <p className="text-[11px] text-[#7A7A7A]">
                Match {selected! + 1}
              </p>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px] text-[#B5B5B5]">
              <span>With</span>
              <TinyAvatar player={match.partner} />
              <span className="font-medium text-white">{match.partner.name}</span>
              <span className="text-[#7A7A7A]">vs</span>
              <TinyAvatar player={match.opponents[0]} />
              <span className="font-medium text-white">
                {match.opponents[0].name}
              </span>
              <span className="text-[#7A7A7A]">&</span>
              <TinyAvatar player={match.opponents[1]} />
              <span className="font-medium text-white">
                {match.opponents[1].name}
              </span>
            </div>
          </div>
        ) : null}

        <FormChart form={FORM} selected={selected} onSelect={setSelected} />
        <div className="mt-2 grid grid-cols-6 gap-1.5">
          {FORM.map((m, i) => {
            const on = selected === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(i)}
                title={`${m.score} with ${m.partner.name} vs ${m.opponents[0].name} & ${m.opponents[1].name}`}
                className={`flex h-8 flex-col items-center justify-center rounded-md border text-[10px] font-bold leading-none ${
                  m.win
                    ? "border-[#C8FF2E]/45 bg-[#C8FF2E]/15 text-[#C8FF2E]"
                    : "border-white/12 bg-white/5 text-[#B5B5B5]"
                } ${on ? "outline outline-1 outline-[#C8FF2E] outline-offset-1" : ""}`}
              >
                <span className="opacity-60">{i + 1}</span>
                <span>{m.win ? "W" : "L"}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-white/8 px-4 py-3.5">
        <div className="rounded-2xl border border-white/8 bg-[#0F1115] px-2.5 py-2.5 text-center">
          <p className="land-display text-sm font-bold text-white">{MIXINS}</p>
          <p className="mt-0.5 text-[10px] text-[#7A7A7A]">Mix-ins</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-[#0F1115] px-2.5 py-2.5 text-center">
          <p className="land-display text-sm font-bold text-white">1,180</p>
          <p className="mt-0.5 text-[10px] text-[#7A7A7A]">Points</p>
        </div>
        <div className="relative rounded-2xl border border-[#C8FF2E]/35 bg-[#C8FF2E]/10 px-2.5 py-2.5 text-center">
          <p className="land-display text-sm font-bold text-[#C8FF2E]">96%</p>
          <p className="mt-0.5 inline-flex items-center justify-center gap-1 text-[10px] font-semibold text-[#C8FF2E]/90">
            Reliability
            <span className="group relative inline-flex">
              <button
                type="button"
                aria-label="What reliability means"
                className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#C8FF2E]/50 text-[8px] font-bold text-[#C8FF2E]"
              >
                i
              </button>
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-44 -translate-x-1/2 rounded-lg border border-white/15 bg-[#0F1115] px-2.5 py-2 text-left text-[10px] font-normal leading-snug text-[#B5B5B5] opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100"
              >
                How often you check in and show up. Not your padel level.
              </span>
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
