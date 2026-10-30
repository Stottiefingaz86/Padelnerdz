/** Kings & Queens fixture generation (PRD §13.1). */

export type FixturePlayer = {
  user_id: string;
  display_name: string;
};

export type FixtureSide = {
  player_a: FixturePlayer;
  player_b: FixturePlayer;
};

export type FixtureMatch = {
  court: number;
  /** Court 1 = Kings (top). Highest court = Queens (bottom). */
  label: string;
  team_a: FixtureSide;
  team_b: FixtureSide;
  score_a?: number | null;
  score_b?: number | null;
  /** Winning side once scored */
  winner?: 'a' | 'b' | null;
};

export type FixtureRound = {
  round: number;
  matches: FixtureMatch[];
  unassigned: FixturePlayer[];
};

function courtLabel(court: number, total: number) {
  if (total <= 1) return 'Kings court';
  if (court === 1) return 'Kings court';
  if (court === total) return 'Queens court';
  return `Court ${court}`;
}

/** Split four players into crossed teams (break previous partnerships). */
function splitPartners(players: FixturePlayer[]): { team_a: FixtureSide; team_b: FixtureSide } {
  const [p0, p1, p2, p3] = players;
  return {
    team_a: { player_a: p0!, player_b: p2! },
    team_b: { player_a: p1!, player_b: p3! },
  };
}

/**
 * Round 1 seeding: sort players, fill courts of 4.
 * Court 1 = Kings (strongest seeds). Partners: 1+4 vs 2+3.
 */
export function generateKingsAndQueensRound1(
  players: FixturePlayer[],
  courts: number,
): FixtureRound {
  const courtCount = Math.max(1, courts);
  const capacity = courtCount * 4;
  const ordered = [...players];
  const assigned = ordered.slice(0, capacity);
  const unassigned = ordered.slice(capacity);
  const matches: FixtureMatch[] = [];

  for (let c = 0; c < courtCount; c += 1) {
    const slice = assigned.slice(c * 4, c * 4 + 4);
    if (slice.length < 4) {
      unassigned.push(...slice);
      continue;
    }
    const court = c + 1;
    matches.push({
      court,
      label: courtLabel(court, courtCount),
      team_a: { player_a: slice[0]!, player_b: slice[3]! },
      team_b: { player_a: slice[1]!, player_b: slice[2]! },
      score_a: null,
      score_b: null,
      winner: null,
    });
  }

  return { round: 1, matches, unassigned };
}

function sidePlayers(side: FixtureSide): FixturePlayer[] {
  return [side.player_a, side.player_b];
}

/**
 * Next round — classic K&Q movement:
 * - Winners move UP a court (toward Kings)
 * - Losers move DOWN a court (toward Queens)
 * - Partners always split when reforming teams
 *
 * Court 1 (Kings): winners stay + winners up from court 2
 * Court N (Queens): losers stay + losers down from court N-1
 * Middle: losers from above + winners from below
 */
export function generateNextKingsAndQueensRound(
  previous: FixtureRound,
  results: Record<number, 'a' | 'b'>,
): FixtureRound {
  const byCourt = [...previous.matches].sort((a, b) => a.court - b.court);
  const n = byCourt.length;
  if (n === 0) {
    return { round: previous.round + 1, matches: [], unassigned: previous.unassigned };
  }

  const winners: FixturePlayer[][] = [];
  const losers: FixturePlayer[][] = [];

  for (const m of byCourt) {
    const win = results[m.court] ?? (m.winner === 'b' ? 'b' : 'a');
    winners.push(win === 'a' ? sidePlayers(m.team_a) : sidePlayers(m.team_b));
    losers.push(win === 'a' ? sidePlayers(m.team_b) : sidePlayers(m.team_a));
  }

  const matches: FixtureMatch[] = [];

  for (let i = 0; i < n; i += 1) {
    let pool: FixturePlayer[] = [];

    if (n === 1) {
      // Single court: winners vs losers, partners split
      pool = [...winners[0]!, ...losers[0]!];
    } else if (i === 0) {
      // Kings: winners stay + winners from court 2
      pool = [...winners[0]!, ...winners[1]!];
    } else if (i === n - 1) {
      // Queens: losers stay + losers from court above
      pool = [...losers[n - 1]!, ...losers[n - 2]!];
    } else {
      // Middle: losers from court above + winners from court below
      pool = [...losers[i - 1]!, ...winners[i + 1]!];
    }

    if (pool.length < 4) continue;
    const teams = splitPartners(pool.slice(0, 4));
    const court = i + 1;
    matches.push({
      court,
      label: courtLabel(court, n),
      ...teams,
      score_a: null,
      score_b: null,
      winner: null,
    });
  }

  return {
    round: previous.round + 1,
    matches,
    unassigned: previous.unassigned,
  };
}

export function applyMatchScore(
  round: FixtureRound,
  court: number,
  scoreA: number,
  scoreB: number,
): FixtureRound {
  return {
    ...round,
    matches: round.matches.map((m) => {
      if (m.court !== court) return m;
      const winner: 'a' | 'b' | null =
        scoreA === scoreB ? null : scoreA > scoreB ? 'a' : 'b';
      return { ...m, score_a: scoreA, score_b: scoreB, winner };
    }),
  };
}

export function allMatchesScored(round: FixtureRound): boolean {
  return (
    round.matches.length > 0 &&
    round.matches.every(
      (m) =>
        m.winner === 'a' ||
        m.winner === 'b' ||
        (m.score_a != null && m.score_b != null && m.score_a !== m.score_b),
    )
  );
}

export function resultsFromRound(round: FixtureRound): Record<number, 'a' | 'b'> {
  const out: Record<number, 'a' | 'b'> = {};
  for (const m of round.matches) {
    if (m.winner === 'a' || m.winner === 'b') out[m.court] = m.winner;
    else if (m.score_a != null && m.score_b != null && m.score_a !== m.score_b) {
      out[m.court] = m.score_a > m.score_b ? 'a' : 'b';
    }
  }
  return out;
}
