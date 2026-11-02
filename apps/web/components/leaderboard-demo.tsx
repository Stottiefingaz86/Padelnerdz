"use client";

import { useMemo, useState } from "react";

type Period = "all_time" | "year" | "month";

type Row = {
  id: string;
  name: string;
  avatar: string;
  points: Record<Period, number>;
};

const PERIODS: { id: Period; label: string }[] = [
  { id: "all_time", label: "All time" },
  { id: "year", label: "This year" },
  { id: "month", label: "This month" },
];

/** Demo ladder for one club / private group. Points scale by period. */
const PLAYERS: Row[] = [
  {
    id: "1",
    name: "Sofia M.",
    avatar: "https://i.pravatar.cc/128?img=5",
    points: { all_time: 1840, year: 920, month: 210 },
  },
  {
    id: "2",
    name: "Marco R.",
    avatar: "https://i.pravatar.cc/128?img=12",
    points: { all_time: 1710, year: 880, month: 195 },
  },
  {
    id: "3",
    name: "Elena V.",
    avatar: "https://i.pravatar.cc/128?img=9",
    points: { all_time: 1580, year: 760, month: 240 },
  },
  {
    id: "4",
    name: "James K.",
    avatar: "https://i.pravatar.cc/128?img=14",
    points: { all_time: 1420, year: 690, month: 120 },
  },
  {
    id: "5",
    name: "Lucia P.",
    avatar: "https://i.pravatar.cc/128?img=20",
    points: { all_time: 1290, year: 610, month: 180 },
  },
  {
    id: "6",
    name: "Alex T.",
    avatar: "https://i.pravatar.cc/128?img=33",
    points: { all_time: 1180, year: 540, month: 95 },
  },
  {
    id: "7",
    name: "Nina S.",
    avatar: "https://i.pravatar.cc/128?img=47",
    points: { all_time: 980, year: 420, month: 160 },
  },
  {
    id: "8",
    name: "Omar H.",
    avatar: "https://i.pravatar.cc/128?img=52",
    points: { all_time: 860, year: 390, month: 70 },
  },
  {
    id: "9",
    name: "Diego L.",
    avatar: "https://i.pravatar.cc/128?img=68",
    points: { all_time: 740, year: 310, month: 55 },
  },
  {
    id: "10",
    name: "Chris H.",
    avatar: "https://i.pravatar.cc/128?img=11",
    points: { all_time: 620, year: 280, month: 48 },
  },
];

function medalClass(rank: number) {
  if (rank === 1) return "border-[#C8FF2E] text-[#C8FF2E]";
  if (rank === 2) return "border-white/40 text-white";
  if (rank === 3) return "border-[#C8A26E] text-[#C8A26E]";
  return "border-white/15 text-[#7A7A7A]";
}

export function LeaderboardDemo() {
  const [period, setPeriod] = useState<Period>("all_time");

  const rows = useMemo(() => {
    return [...PLAYERS]
      .map((p) => ({ ...p, pts: p.points[period] }))
      .sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name))
      .map((p, i) => ({ ...p, rank: i + 1 }));
  }, [period]);

  const top = rows[0];

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C8FF2E]">
            Group ladder
          </p>
          <p className="mt-1 land-display text-lg font-bold tracking-[-0.02em] text-white">
            Costa Crew · Marbella
          </p>
        </div>
        <div
          className="inline-flex rounded-full border border-white/12 bg-[#141414] p-1"
          role="tablist"
          aria-label="Leaderboard period"
        >
          {PERIODS.map((p) => {
            const on = period === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setPeriod(p.id)}
                className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition ${
                  on
                    ? "bg-[#C8FF2E] text-[#0F1115]"
                    : "text-[#B5B5B5] hover:text-white"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {top ? (
        <div className="mb-4 flex items-center gap-4 rounded-[24px] border border-[#C8FF2E]/35 bg-[#C8FF2E]/10 px-4 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={top.avatar}
            alt=""
            width={64}
            height={64}
            className="h-16 w-16 rounded-full object-cover ring-2 ring-[#C8FF2E]"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C8FF2E]">
              Top player
            </p>
            <p className="land-display truncate text-xl font-bold tracking-[-0.02em] text-white">
              {top.name}
            </p>
            <p className="mt-0.5 text-sm text-[#B5B5B5]">
              {top.pts.toLocaleString("en-GB")} pts from events
            </p>
          </div>
          <span className="land-display text-3xl font-extrabold text-[#C8FF2E]">
            #1
          </span>
        </div>
      ) : null}

      <ol className="overflow-hidden rounded-[24px] border border-white/10 bg-[#141414]">
        {rows.map((row, i) => (
          <li
            key={row.id}
            className={`flex items-center gap-3 px-4 py-3.5 ${
              i > 0 ? "border-t border-white/8" : ""
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[12px] font-bold ${medalClass(row.rank)}`}
            >
              {row.rank}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={row.avatar}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
            />
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-white">
              {row.name}
            </span>
            <span className="tabular-nums text-sm font-semibold text-[#C8FF2E]">
              {row.pts.toLocaleString("en-GB")}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-center text-[12px] text-[#7A7A7A]">
        Ranked per group. Points from paid places, finishes, and play.
      </p>
    </div>
  );
}
