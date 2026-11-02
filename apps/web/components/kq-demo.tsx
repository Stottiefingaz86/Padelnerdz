"use client";

import { useMemo, useState } from "react";

type Player = { id: string; name: string };
type Side = { a: Player; b: Player };
type Match = {
  court: number;
  label: string;
  teamA: Side;
  teamB: Side;
  scoreA: number | null;
  scoreB: number | null;
  winner: "a" | "b" | null;
};
type Round = { round: number; matches: Match[] };
type Draft = { a: string; b: string };

const MATCH_MINUTES = 20;
const SESSION_HOURS = 2;
const TOTAL_ROUNDS = (SESSION_HOURS * 60) / MATCH_MINUTES;
const COURTS = 4;

const NAMES = [
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
  "Kai",
  "Nina",
  "Omar",
  "Priya",
] as const;

function playersFromNames(): Player[] {
  return NAMES.map((name, i) => ({ id: `p${i}`, name }));
}

function courtLabel(court: number) {
  if (court === 1) return "Kings & Queens";
  return `Court ${court}`;
}

function splitPartners(pool: Player[]): { teamA: Side; teamB: Side } {
  const [p0, p1, p2, p3] = pool;
  return {
    teamA: { a: p0!, b: p2! },
    teamB: { a: p1!, b: p3! },
  };
}

function round1(players: Player[]): Round {
  const matches: Match[] = [];
  for (let c = 0; c < COURTS; c += 1) {
    const slice = players.slice(c * 4, c * 4 + 4);
    const court = c + 1;
    matches.push({
      court,
      label: courtLabel(court),
      teamA: { a: slice[0]!, b: slice[3]! },
      teamB: { a: slice[1]!, b: slice[2]! },
      scoreA: null,
      scoreB: null,
      winner: null,
    });
  }
  return { round: 1, matches };
}

function sidePlayers(side: Side): Player[] {
  return [side.a, side.b];
}

function nextRound(previous: Round): Round {
  const byCourt = [...previous.matches].sort((a, b) => a.court - b.court);
  const winners: Player[][] = [];
  const losers: Player[][] = [];

  for (const m of byCourt) {
    const win = m.winner === "b" ? "b" : "a";
    winners.push(win === "a" ? sidePlayers(m.teamA) : sidePlayers(m.teamB));
    losers.push(win === "a" ? sidePlayers(m.teamB) : sidePlayers(m.teamA));
  }

  const matches: Match[] = [];
  for (let i = 0; i < COURTS; i += 1) {
    let pool: Player[] = [];
    if (i === 0) pool = [...winners[0]!, ...winners[1]!];
    else if (i === COURTS - 1) pool = [...losers[COURTS - 1]!, ...losers[COURTS - 2]!];
    else pool = [...losers[i - 1]!, ...winners[i + 1]!];

    const teams = splitPartners(pool.slice(0, 4));
    const court = i + 1;
    matches.push({
      court,
      label: courtLabel(court),
      ...teams,
      scoreA: null,
      scoreB: null,
      winner: null,
    });
  }

  return { round: previous.round + 1, matches };
}

function allScored(round: Round) {
  return round.matches.every((m) => m.winner === "a" || m.winner === "b");
}

function emptyDrafts(): Record<number, Draft> {
  return Object.fromEntries(
    Array.from({ length: COURTS }, (_, i) => [i + 1, { a: "", b: "" }]),
  );
}

function TeamRow({
  side,
  won,
  lost,
  scoreValue,
  scoreId,
  onScoreChange,
  showInput,
}: {
  side: Side;
  won: boolean;
  lost: boolean;
  scoreValue?: string;
  scoreId?: string;
  onScoreChange?: (value: string) => void;
  showInput?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 ${
        won
          ? "border border-[#C8FF2E]/50 bg-[#C8FF2E]/14"
          : lost
            ? "border border-white/8 bg-white/[0.03] opacity-50"
            : "border border-white/10 bg-[#0F1115]/65"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="land-display text-[15px] font-bold tracking-[-0.02em] text-white">
          {side.a.name} <span className="font-semibold text-[#7A7A7A]">/</span>{" "}
          {side.b.name}
        </p>
        {won ? (
          <p className="mt-1 text-[11px] font-semibold text-[#C8FF2E]">Won</p>
        ) : lost ? (
          <p className="mt-1 text-[11px] font-medium text-[#7A7A7A]">Lost</p>
        ) : null}
      </div>
      {showInput && onScoreChange && scoreId ? (
        <input
          id={scoreId}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={scoreValue ?? ""}
          onChange={(e) => onScoreChange(e.target.value)}
          placeholder="0"
          aria-label={`Score for ${side.a.name} and ${side.b.name}`}
          className="land-score-input h-11 w-[3.25rem] shrink-0 rounded-xl border border-white/15 bg-[#0F1115] text-center text-lg font-bold text-white outline-none transition placeholder:text-[#7A7A7A]"
        />
      ) : null}
    </div>
  );
}

export function KqDemo() {
  const [open, setOpen] = useState(false);
  const [seed] = useState(() => playersFromNames());
  const [round, setRound] = useState<Round>(() => round1(playersFromNames()));
  const [drafts, setDrafts] = useState<Record<number, Draft>>(emptyDrafts);
  const [flash, setFlash] = useState(false);
  const [champion, setChampion] = useState<Side | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});

  const scoredCount = round.matches.filter((m) => m.winner).length;
  const ready = allScored(round);
  const minutesPlayed = (round.round - 1) * MATCH_MINUTES;
  const minutesLeft = SESSION_HOURS * 60 - minutesPlayed;
  const isFinalRound = round.round >= TOTAL_ROUNDS;
  const progress = Math.min(1, minutesPlayed / (SESSION_HOURS * 60));

  const kingsMatch = useMemo(
    () => round.matches.find((m) => m.court === 1) ?? null,
    [round],
  );

  function setDraft(court: number, key: "a" | "b", value: string) {
    const clean = value.replace(/[^\d]/g, "").slice(0, 3);
    setDrafts((prev) => ({
      ...prev,
      [court]: { ...prev[court]!, [key]: clean },
    }));
    setErrors((prev) => {
      if (!prev[court]) return prev;
      const next = { ...prev };
      delete next[court];
      return next;
    });
  }

  function saveScore(court: number) {
    if (champion) return;
    const draft = drafts[court] ?? { a: "", b: "" };
    const scoreA = Number(draft.a);
    const scoreB = Number(draft.b);

    if (draft.a === "" || draft.b === "" || Number.isNaN(scoreA) || Number.isNaN(scoreB)) {
      setErrors((prev) => ({ ...prev, [court]: "Type both scores" }));
      return;
    }
    if (scoreA === scoreB) {
      setErrors((prev) => ({ ...prev, [court]: "Need a winner, scores can’t be tied" }));
      return;
    }

    setRound((prev) => ({
      ...prev,
      matches: prev.matches.map((m) => {
        if (m.court !== court) return m;
        return {
          ...m,
          scoreA,
          scoreB,
          winner: scoreA > scoreB ? "a" : "b",
        };
      }),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[court];
      return next;
    });
  }

  function advance() {
    if (!ready || champion) return;

    if (isFinalRound) {
      const kings = round.matches.find((m) => m.court === 1);
      if (kings?.winner === "a") setChampion(kings.teamA);
      else if (kings?.winner === "b") setChampion(kings.teamB);
      return;
    }

    setFlash(true);
    window.setTimeout(() => {
      setRound(nextRound(round));
      setDrafts(emptyDrafts());
      setErrors({});
      setFlash(false);
    }, 420);
  }

  function reset() {
    setChampion(null);
    setFlash(false);
    setErrors({});
    setDrafts(emptyDrafts());
    setRound(round1(seed));
  }

  if (!open) {
    return (
      <div className="rounded-[32px] border border-white/10 bg-[#141414] px-6 py-10 text-center shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:px-10 sm:py-12">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-[#C8FF2E]">
          ORGANISER DEMO
        </p>
        <h3 className="land-display mx-auto mt-3 max-w-lg text-2xl font-bold tracking-[-0.03em] text-white sm:text-[1.75rem]">
          Run a night on the board.
        </h3>
        <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-[#B5B5B5]">
          16 players, 4 courts, typed scores, auto fixtures. Same Kings & Queens
          movement as the app.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-7 inline-flex items-center justify-center rounded-2xl bg-[#C8FF2E] px-6 py-3.5 text-[15px] font-bold text-[#0F1115] transition hover:brightness-95"
        >
          Try the demo
        </button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#141414] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(200,255,46,0.55), transparent)",
        }}
      />

      <div className="border-b border-white/10 px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[#C8FF2E]">
              ORGANISER DEMO
            </p>
            <h3 className="land-display mt-2 text-2xl font-bold tracking-[-0.03em] text-white sm:text-[1.75rem]">
              You’re running the board.
            </h3>
            <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[#B5B5B5]">
              Type each pair’s games after ~{MATCH_MINUTES} minutes, 15–0, 6–4,
              whatever happened. Save every court, then rebuild fixtures. After{" "}
              {TOTAL_ROUNDS} rounds / {SESSION_HOURS} hours, Kings & Queens
              winners take the night.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-full border border-white/15 px-3.5 py-1.5 text-[12px] font-semibold text-[#B5B5B5] transition hover:border-[#C8FF2E]/4 hover:text-[#C8FF2E]"
            >
              Reset night
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-white/15 px-3.5 py-1.5 text-[12px] font-semibold text-[#B5B5B5] transition hover:border-white/30 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#0F1115]/70 px-4 py-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-[#7A7A7A]">
              ROUND
            </p>
            <p className="land-display mt-1 text-xl font-extrabold text-white">
              {round.round}
              <span className="text-base font-bold text-[#7A7A7A]"> / {TOTAL_ROUNDS}</span>
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0F1115]/70 px-4 py-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-[#7A7A7A]">
              SESSION CLOCK
            </p>
            <p className="land-display mt-1 text-xl font-extrabold text-white">
              {minutesPlayed}
              <span className="text-base font-bold text-[#7A7A7A]">
                {" "}
                / {SESSION_HOURS * 60} min
              </span>
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0F1115]/70 px-4 py-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-[#7A7A7A]">
              SCORES IN
            </p>
            <p className="land-display mt-1 text-xl font-extrabold text-[#C8FF2E]">
              {scoredCount}
              <span className="text-base font-bold text-[#7A7A7A]"> / {COURTS}</span>
            </p>
          </div>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#C8FF2E] transition-all duration-500"
            style={{ width: `${champion ? 100 : progress * 100}%` }}
          />
        </div>
        <p className="mt-2 text-[12px] text-[#7A7A7A]">
          {champion
            ? "Session complete."
            : isFinalRound
              ? `Final round · score Kings & Queens to crown the night · ~${MATCH_MINUTES} min`
              : `~${minutesLeft} min left · winners climb toward Kings & Queens`}
        </p>
      </div>

      {champion ? (
        <div className="border-b border-[#C8FF2E]/35 bg-[#C8FF2E] px-5 py-6 text-[#0F1115] sm:px-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0F1115]/65">
            End of night
          </p>
          <p className="land-display mt-2 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">
            King & Queen: {champion.a.name} / {champion.b.name}
          </p>
          <p className="mt-2 text-[14px] text-[#0F1115]/75">
            Finished on Kings & Queens and won the last match after {SESSION_HOURS}{" "}
            hours.
          </p>
        </div>
      ) : null}

      {flash ? (
        <div className="border-b border-[#C8FF2E]/25 bg-[#C8FF2E]/10 px-5 py-3 text-center text-[13px] font-semibold text-[#C8FF2E] sm:px-7">
          Winners ↑ · Losers ↓ · Partners split · New fixtures locked
        </div>
      ) : null}

      <div
        className={`grid gap-4 p-5 transition-opacity duration-300 sm:p-7 lg:grid-cols-2 ${
          flash ? "opacity-40" : "opacity-100"
        }`}
      >
        {round.matches.map((m) => {
          const isKingsQueens = m.court === 1;
          const decided = m.winner === "a" || m.winner === "b";
          const draft = drafts[m.court] ?? { a: "", b: "" };
          const err = errors[m.court];

          return (
            <article
              key={`${round.round}-${m.court}`}
              className={`relative overflow-hidden rounded-[26px] border p-4 sm:p-5 ${
                isKingsQueens
                  ? "border-[#C8FF2E]/45 bg-gradient-to-b from-[#C8FF2E]/12 to-transparent lg:col-span-2"
                  : "border-white/10 bg-[#0F1115]/55"
              }`}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {isKingsQueens ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="/brand-crown.png"
                      alt=""
                      className="h-7 w-7 object-contain mix-blend-screen"
                      aria-hidden
                    />
                  ) : null}
                  <div>
                    <p
                      className={`text-[11px] font-bold uppercase tracking-[0.16em] ${
                        isKingsQueens ? "text-[#C8FF2E]" : "text-[#7A7A7A]"
                      }`}
                    >
                      {isKingsQueens ? "▲ Top court" : `#${m.court}`}
                    </p>
                    <p className="mt-0.5 text-[13px] font-semibold text-white">{m.label}</p>
                    {isKingsQueens ? (
                      <p className="mt-0.5 text-[11px] font-medium text-[#C8FF2E]/80">
                        Win and you stay
                      </p>
                    ) : null}
                  </div>
                </div>
                {decided && m.scoreA != null && m.scoreB != null ? (
                  <p className="land-display text-2xl font-extrabold tracking-tight text-white">
                    {m.scoreA}
                    <span className="mx-1 text-[#7A7A7A]">–</span>
                    {m.scoreB}
                  </p>
                ) : (
                  <p className="text-[12px] font-medium text-[#7A7A7A]">Enter score</p>
                )}
              </div>

              <div className="space-y-2">
                <TeamRow
                  side={m.teamA}
                  won={m.winner === "a"}
                  lost={m.winner === "b"}
                  showInput={!champion}
                  scoreId={`score-a-${m.court}`}
                  scoreValue={draft.a}
                  onScoreChange={(v) => setDraft(m.court, "a", v)}
                />
                <p className="text-center text-[11px] font-semibold tracking-[0.14em] text-[#7A7A7A]">
                  VS
                </p>
                <TeamRow
                  side={m.teamB}
                  won={m.winner === "b"}
                  lost={m.winner === "a"}
                  showInput={!champion}
                  scoreId={`score-b-${m.court}`}
                  scoreValue={draft.b}
                  onScoreChange={(v) => setDraft(m.court, "b", v)}
                />
              </div>

              {!champion ? (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => saveScore(m.court)}
                    className="h-11 rounded-xl bg-[#C8FF2E] px-4 text-[13px] font-bold text-[#0F1115] transition hover:brightness-95"
                  >
                    {decided ? "Update score" : "Save score"}
                  </button>
                  {err ? (
                    <p className="text-[12px] font-medium text-[#FF6B6B]">{err}</p>
                  ) : (
                    <p className="text-[11px] text-[#7A7A7A]">
                      Score sits next to each pair, type games won after ~
                      {MATCH_MINUTES} min.
                    </p>
                  )}
                </div>
              ) : null}

              <p className="mt-3 text-[11px] font-medium text-[#7A7A7A]">
                {isKingsQueens
                  ? "Win on Kings & Queens · you stay · partners still split"
                  : "Winners ↑ toward Kings & Queens · losers ↓ · partners split"}
              </p>
            </article>
          );
        })}
      </div>

      <div className="border-t border-white/10 px-5 py-5 sm:px-7">
        {champion ? (
          <button
            type="button"
            onClick={reset}
            className="w-full rounded-2xl bg-[#C8FF2E] px-5 py-3.5 text-center text-[15px] font-bold text-[#0F1115] transition hover:brightness-95"
          >
            Run another night
          </button>
        ) : (
          <button
            type="button"
            disabled={!ready}
            onClick={advance}
            className={`w-full rounded-2xl px-5 py-3.5 text-center text-[15px] font-bold transition ${
              ready
                ? "bg-[#C8FF2E] text-[#0F1115] hover:brightness-95"
                : "cursor-not-allowed bg-white/8 text-[#7A7A7A]"
            }`}
          >
            {!ready
              ? `Enter a score on every court (${scoredCount}/${COURTS})`
              : isFinalRound
                ? kingsMatch?.winner
                  ? "Crown King & Queen of the night"
                  : "Finish Kings & Queens to crown winners"
                : `Generate round ${round.round + 1}`}
          </button>
        )}
      </div>
    </div>
  );
}
