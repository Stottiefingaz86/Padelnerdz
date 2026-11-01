/** Tournament by wins — group stage (games = points) + knockout (PRD §13.4). */

import type { FixtureMatch, FixturePlayer, FixtureSide } from './kingsAndQueens';

export type TournamentCategoryId = 'A' | 'B';

export type TournamentPhase = 'group' | 'semi' | 'finals' | 'complete';

export type TournamentTeam = {
  id: string;
  player_a: FixturePlayer;
  player_b: FixturePlayer;
};

export type TournamentGroup = {
  id: string;
  category: TournamentCategoryId;
  label: string;
  team_ids: string[];
};

export type TournamentMatchStage = 'group' | 'semi' | 'third' | 'final';

export type TournamentArchivedMatch = {
  match_key: string;
  stage: TournamentMatchStage;
  group_id?: string;
  category?: TournamentCategoryId;
  home_team_id: string;
  away_team_id: string;
  /** 1-based RR round within group stage */
  group_round?: number;
  score_a?: number | null;
  score_b?: number | null;
  winner?: 'a' | 'b' | null;
};

export type TournamentStanding = {
  team_id: string;
  played: number;
  match_wins: number;
  match_losses: number;
  /** Games won across group matches — ranking points */
  points: number;
  games_against: number;
};

export type TournamentByWinsConfig = {
  /** Categories to run (default A + B). */
  categories: TournamentCategoryId[];
  /** Groups per category (default 2 → A1/A2). */
  groups_per_category: number;
  /** 3 or 4 teams per group. */
  teams_per_group: 3 | 4;
};

export type TournamentByWinsRound = {
  format: 'tournament_by_wins';
  round: number;
  phase: TournamentPhase;
  group_round: number;
  total_group_rounds: number;
  groups: TournamentGroup[];
  teams: TournamentTeam[];
  archive: TournamentArchivedMatch[];
  matches: FixtureMatch[];
  court_to_match: Record<number, string>;
  unassigned: FixturePlayer[];
  config: TournamentByWinsConfig;
};

export const DEFAULT_TOURNAMENT_BY_WINS_CONFIG: TournamentByWinsConfig = {
  categories: ['A', 'B'],
  groups_per_category: 2,
  teams_per_group: 4,
};

export function isTournamentByWinsRound(value: unknown): value is TournamentByWinsRound {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as TournamentByWinsRound).format === 'tournament_by_wins'
  );
}

function teamSide(team: TournamentTeam): FixtureSide {
  return { player_a: team.player_a, player_b: team.player_b };
}

function teamLabel(team: TournamentTeam): string {
  return `${team.player_a.display_name} / ${team.player_b.display_name}`;
}

/** Circle method: rounds of pairings; byes as null. */
export function roundRobinPairings(teamIds: string[]): (readonly [string, string] | null)[][] {
  const ids = [...teamIds];
  if (ids.length < 2) return [];
  const bye = '__bye__';
  if (ids.length % 2 === 1) ids.push(bye);
  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;
  const arr = [...ids];
  const out: (readonly [string, string] | null)[][] = [];

  for (let r = 0; r < rounds; r += 1) {
    const pairs: (readonly [string, string] | null)[] = [];
    for (let i = 0; i < half; i += 1) {
      const a = arr[i]!;
      const b = arr[n - 1 - i]!;
      if (a === bye || b === bye) {
        pairs.push(null);
      } else {
        pairs.push([a, b]);
      }
    }
    out.push(pairs);
    // rotate all but first
    const fixed = arr[0]!;
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    arr.splice(0, arr.length, fixed, ...rest);
  }
  return out;
}

export function buildGroupSchedule(groups: TournamentGroup[]): {
  archive: TournamentArchivedMatch[];
  totalRounds: number;
} {
  const archive: TournamentArchivedMatch[] = [];
  let totalRounds = 0;

  for (const group of groups) {
    const rounds = roundRobinPairings(group.team_ids);
    totalRounds = Math.max(totalRounds, rounds.length);
    rounds.forEach((pairs, idx) => {
      const groupRound = idx + 1;
      for (const pair of pairs) {
        if (!pair) continue;
        const [home, away] = pair;
        archive.push({
          match_key: `group:${group.id}:r${groupRound}:${home}:${away}`,
          stage: 'group',
          group_id: group.id,
          category: group.category,
          home_team_id: home,
          away_team_id: away,
          group_round: groupRound,
          score_a: null,
          score_b: null,
          winner: null,
        });
      }
    });
  }

  return { archive, totalRounds };
}

function pairPlayers(players: FixturePlayer[]): {
  teams: TournamentTeam[];
  unassigned: FixturePlayer[];
} {
  const teams: TournamentTeam[] = [];
  const unassigned: FixturePlayer[] = [];
  for (let i = 0; i + 1 < players.length; i += 2) {
    const a = players[i]!;
    const b = players[i + 1]!;
    teams.push({
      id: `team-${a.user_id.slice(0, 8)}-${b.user_id.slice(0, 8)}-${teams.length + 1}`,
      player_a: a,
      player_b: b,
    });
  }
  if (players.length % 2 === 1) {
    unassigned.push(players[players.length - 1]!);
  }
  return { teams, unassigned };
}

function makeGroups(config: TournamentByWinsConfig): TournamentGroup[] {
  const groups: TournamentGroup[] = [];
  for (const category of config.categories) {
    for (let i = 1; i <= config.groups_per_category; i += 1) {
      const id = `${category}${i}`;
      groups.push({ id, category, label: id, team_ids: [] });
    }
  }
  return groups;
}

/**
 * Seed fixed doubles into A/B groups and open group-stage round 1.
 * Extra teams beyond capacity sit out; odd players go to unassigned.
 */
export function seedTournamentByWins(
  players: FixturePlayer[],
  config: TournamentByWinsConfig = DEFAULT_TOURNAMENT_BY_WINS_CONFIG,
): TournamentByWinsRound {
  const cfg: TournamentByWinsConfig = {
    categories: config.categories.length ? config.categories : ['A'],
    groups_per_category: Math.max(1, config.groups_per_category),
    teams_per_group: config.teams_per_group === 3 ? 3 : 4,
  };

  const { teams: allTeams, unassigned } = pairPlayers(players);
  const groups = makeGroups(cfg);
  const capacity = groups.length * cfg.teams_per_group;
  const seated = allTeams.slice(0, capacity);
  const overflowPlayers: FixturePlayer[] = [];
  for (const t of allTeams.slice(capacity)) {
    overflowPlayers.push(t.player_a, t.player_b);
  }

  // Fill A groups first (higher level), then B — keeps stronger block together when seeded by reliability.
  let cursor = 0;
  for (const group of groups) {
    const slice = seated.slice(cursor, cursor + cfg.teams_per_group);
    group.team_ids = slice.map((t) => t.id);
    cursor += cfg.teams_per_group;
  }

  // Drop empty groups (not enough teams)
  const liveGroups = groups.filter((g) => g.team_ids.length >= 2);
  const { archive, totalRounds } = buildGroupSchedule(liveGroups);

  const state: TournamentByWinsRound = {
    format: 'tournament_by_wins',
    round: 1,
    phase: 'group',
    group_round: 1,
    total_group_rounds: totalRounds,
    groups: liveGroups,
    teams: seated,
    archive,
    matches: [],
    court_to_match: {},
    unassigned: [...unassigned, ...overflowPlayers],
    config: cfg,
  };

  return materializeCurrentMatches(state);
}

function findTeam(state: TournamentByWinsRound, teamId: string): TournamentTeam {
  const team = state.teams.find((t) => t.id === teamId);
  if (!team) {
    throw new Error(`Unknown tournament team ${teamId}`);
  }
  return team;
}

function matchLabel(state: TournamentByWinsRound, meta: TournamentArchivedMatch): string {
  if (meta.stage === 'group') {
    return `${meta.group_id} · RR ${meta.group_round}`;
  }
  if (meta.stage === 'semi') {
    return `Semi-final · Cat ${meta.category}`;
  }
  if (meta.stage === 'third') {
    return `3rd / 4th · Cat ${meta.category}`;
  }
  return `Final · Cat ${meta.category}`;
}

function materializeCurrentMatches(state: TournamentByWinsRound): TournamentByWinsRound {
  let pending: TournamentArchivedMatch[] = [];

  if (state.phase === 'group') {
    pending = state.archive.filter(
      (m) => m.stage === 'group' && m.group_round === state.group_round,
    );
  } else if (state.phase === 'semi') {
    pending = state.archive.filter(
      (m) => m.stage === 'semi' && (m.score_a == null || m.score_b == null || !m.winner),
    );
    // If re-opening after partial scores, show all semis for this phase round
    const semis = state.archive.filter((m) => m.stage === 'semi');
    const anyScored = semis.some((m) => m.winner === 'a' || m.winner === 'b');
    if (!anyScored || pending.length) {
      pending = semis;
    }
  } else if (state.phase === 'finals') {
    pending = state.archive.filter((m) => m.stage === 'third' || m.stage === 'final');
  } else {
    pending = [];
  }

  const matches: FixtureMatch[] = [];
  const court_to_match: Record<number, string> = {};

  pending.forEach((meta, idx) => {
    const court = idx + 1;
    const home = findTeam(state, meta.home_team_id);
    const away = findTeam(state, meta.away_team_id);
    court_to_match[court] = meta.match_key;
    matches.push({
      court,
      label: matchLabel(state, meta),
      team_a: teamSide(home),
      team_b: teamSide(away),
      score_a: meta.score_a ?? null,
      score_b: meta.score_b ?? null,
      winner: meta.winner ?? null,
    });
  });

  return { ...state, matches, court_to_match };
}

export function standingsForGroup(
  state: TournamentByWinsRound,
  groupId: string,
): TournamentStanding[] {
  const group = state.groups.find((g) => g.id === groupId);
  if (!group) return [];

  const rows = new Map<string, TournamentStanding>();
  for (const id of group.team_ids) {
    rows.set(id, {
      team_id: id,
      played: 0,
      match_wins: 0,
      match_losses: 0,
      points: 0,
      games_against: 0,
    });
  }

  for (const m of state.archive) {
    if (m.stage !== 'group' || m.group_id !== groupId) continue;
    if (m.score_a == null || m.score_b == null) continue;
    const home = rows.get(m.home_team_id);
    const away = rows.get(m.away_team_id);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.points += m.score_a;
    away.points += m.score_b;
    home.games_against += m.score_b;
    away.games_against += m.score_a;

    if (m.score_a > m.score_b) {
      home.match_wins += 1;
      away.match_losses += 1;
    } else if (m.score_b > m.score_a) {
      away.match_wins += 1;
      home.match_losses += 1;
    }
  }

  return [...rows.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.match_wins !== a.match_wins) return b.match_wins - a.match_wins;
    const diffA = a.points - a.games_against;
    const diffB = b.points - b.games_against;
    if (diffB !== diffA) return diffB - diffA;
    return a.team_id.localeCompare(b.team_id);
  });
}

export function allGroupStandings(
  state: TournamentByWinsRound,
): Record<string, TournamentStanding[]> {
  const out: Record<string, TournamentStanding[]> = {};
  for (const g of state.groups) {
    out[g.id] = standingsForGroup(state, g.id);
  }
  return out;
}

/** Best of 9: first to 5. Winner has 5; loser 0–4. */
export function isValidBestOfNine(scoreA: number, scoreB: number): boolean {
  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB)) return false;
  if (scoreA < 0 || scoreB < 0) return false;
  if (scoreA === scoreB) return false;
  const hi = Math.max(scoreA, scoreB);
  const lo = Math.min(scoreA, scoreB);
  return hi === 5 && lo <= 4;
}

export function applyTournamentMatchScore(
  state: TournamentByWinsRound,
  court: number,
  scoreA: number,
  scoreB: number,
): TournamentByWinsRound {
  const key = state.court_to_match[court];
  if (!key) return state;

  const winner: 'a' | 'b' | null =
    scoreA === scoreB ? null : scoreA > scoreB ? 'a' : 'b';

  const archive = state.archive.map((m) =>
    m.match_key === key
      ? { ...m, score_a: scoreA, score_b: scoreB, winner }
      : m,
  );

  const matches = state.matches.map((m) =>
    m.court === court ? { ...m, score_a: scoreA, score_b: scoreB, winner } : m,
  );

  return { ...state, archive, matches };
}

function groupMatchesComplete(state: TournamentByWinsRound): boolean {
  const groupMatches = state.archive.filter((m) => m.stage === 'group');
  return (
    groupMatches.length > 0 &&
    groupMatches.every((m) => m.winner === 'a' || m.winner === 'b')
  );
}

function currentMatchesComplete(state: TournamentByWinsRound): boolean {
  return (
    state.matches.length > 0 &&
    state.matches.every((m) => m.winner === 'a' || m.winner === 'b')
  );
}

function qualifyingTeams(
  state: TournamentByWinsRound,
  category: TournamentCategoryId,
): { first: TournamentTeam; second: TournamentTeam; groupId: string }[] {
  const catGroups = state.groups.filter((g) => g.category === category);
  const out: { first: TournamentTeam; second: TournamentTeam; groupId: string }[] = [];
  for (const g of catGroups) {
    const table = standingsForGroup(state, g.id);
    if (table.length < 2) continue;
    const first = findTeam(state, table[0]!.team_id);
    const second = findTeam(state, table[1]!.team_id);
    out.push({ first, second, groupId: g.id });
  }
  return out;
}

function buildSemis(state: TournamentByWinsRound): TournamentArchivedMatch[] {
  const semis: TournamentArchivedMatch[] = [];
  const categories = [...new Set(state.groups.map((g) => g.category))];

  for (const category of categories) {
    const qualifiers = qualifyingTeams(state, category);
    if (qualifiers.length >= 2) {
      const g1 = qualifiers[0]!;
      const g2 = qualifiers[1]!;
      // Leader of each group plays 2nd of the other
      semis.push({
        match_key: `semi:${category}:1`,
        stage: 'semi',
        category,
        home_team_id: g1.first.id,
        away_team_id: g2.second.id,
        score_a: null,
        score_b: null,
        winner: null,
      });
      semis.push({
        match_key: `semi:${category}:2`,
        stage: 'semi',
        category,
        home_team_id: g2.first.id,
        away_team_id: g1.second.id,
        score_a: null,
        score_b: null,
        winner: null,
      });
    } else if (qualifiers.length === 1) {
      // Single group: 1st vs 4th and 2nd vs 3rd when possible, else 1st vs 2nd as final later
      const g = state.groups.find((x) => x.category === category)!;
      const table = standingsForGroup(state, g.id);
      if (table.length >= 4) {
        semis.push({
          match_key: `semi:${category}:1`,
          stage: 'semi',
          category,
          home_team_id: table[0]!.team_id,
          away_team_id: table[3]!.team_id,
          score_a: null,
          score_b: null,
          winner: null,
        });
        semis.push({
          match_key: `semi:${category}:2`,
          stage: 'semi',
          category,
          home_team_id: table[1]!.team_id,
          away_team_id: table[2]!.team_id,
          score_a: null,
          score_b: null,
          winner: null,
        });
      } else if (table.length >= 2) {
        // Skip semis — go straight to a final via a synthetic semi path
        semis.push({
          match_key: `semi:${category}:1`,
          stage: 'semi',
          category,
          home_team_id: table[0]!.team_id,
          away_team_id: table[1]!.team_id,
          score_a: null,
          score_b: null,
          winner: null,
        });
      }
    }
  }

  return semis;
}

function buildFinals(state: TournamentByWinsRound): TournamentArchivedMatch[] {
  const finals: TournamentArchivedMatch[] = [];
  const categories = [...new Set(state.groups.map((g) => g.category))];

  for (const category of categories) {
    const semis = state.archive.filter((m) => m.stage === 'semi' && m.category === category);
    // Categories that went straight to a final (no semis) are already done.
    if (semis.length < 2) continue;

    const s1 = semis[0]!;
    const s2 = semis[1]!;
    if (!s1.winner || !s2.winner) continue;

    const w1 = s1.winner === 'a' ? s1.home_team_id : s1.away_team_id;
    const l1 = s1.winner === 'a' ? s1.away_team_id : s1.home_team_id;
    const w2 = s2.winner === 'a' ? s2.home_team_id : s2.away_team_id;
    const l2 = s2.winner === 'a' ? s2.away_team_id : s2.home_team_id;

    finals.push({
      match_key: `third:${category}`,
      stage: 'third',
      category,
      home_team_id: l1,
      away_team_id: l2,
      score_a: null,
      score_b: null,
      winner: null,
    });
    finals.push({
      match_key: `final:${category}`,
      stage: 'final',
      category,
      home_team_id: w1,
      away_team_id: w2,
      score_a: null,
      score_b: null,
      winner: null,
    });
  }

  return finals;
}

export function tournamentAdvanceLabel(state: TournamentByWinsRound): string {
  if (state.phase === 'group') {
    if (state.group_round < state.total_group_rounds) {
      return `Generate group round ${state.group_round + 1}`;
    }
    return 'Generate semi-finals';
  }
  if (state.phase === 'semi') return 'Generate 3rd place & finals';
  if (state.phase === 'finals') return 'Complete tournament';
  return 'Tournament complete';
}

/**
 * Advance after current courts are scored:
 * next RR round → semis → 3rd/final → complete.
 * Knockout ignores group points; only match winner advances.
 */
export function advanceTournamentByWins(
  state: TournamentByWinsRound,
): { state: TournamentByWinsRound; error?: string } {
  if (state.phase === 'complete') {
    return { state, error: 'Tournament is already complete' };
  }
  if (!currentMatchesComplete(state)) {
    return { state, error: 'Enter a score on every match before advancing' };
  }

  if (state.phase === 'group') {
    if (state.group_round < state.total_group_rounds) {
      const next = materializeCurrentMatches({
        ...state,
        round: state.round + 1,
        group_round: state.group_round + 1,
      });
      return { state: next };
    }
    if (!groupMatchesComplete(state)) {
      return { state, error: 'Finish every group match before semi-finals' };
    }
    const semis = buildSemis(state);
    if (!semis.length) {
      return { state, error: 'Need at least two teams per category to start knockouts' };
    }

    const next = materializeCurrentMatches({
      ...state,
      round: state.round + 1,
      phase: 'semi',
      archive: [...state.archive, ...semis],
    });
    return { state: next };
  }

  if (state.phase === 'semi') {
    const finals = buildFinals(state);
    // Categories with a single semi already crowned a winner — skip straight to complete
    // when no 3rd/final matches are needed.
    if (!finals.length) {
      return {
        state: {
          ...state,
          round: state.round + 1,
          phase: 'complete',
          matches: [],
          court_to_match: {},
        },
      };
    }
    const next = materializeCurrentMatches({
      ...state,
      round: state.round + 1,
      phase: 'finals',
      archive: [...state.archive, ...finals],
    });
    return { state: next };
  }

  // finals → complete
  const next: TournamentByWinsRound = {
    ...state,
    round: state.round + 1,
    phase: 'complete',
    matches: [],
    court_to_match: {},
  };
  return { state: next };
}

export function describeTournamentTeam(
  state: TournamentByWinsRound,
  teamId: string,
): string {
  try {
    return teamLabel(findTeam(state, teamId));
  } catch {
    return teamId;
  }
}

export function tournamentPhaseSubtitle(state: TournamentByWinsRound): string {
  if (state.phase === 'group') {
    return `Group stage · round ${state.group_round}/${state.total_group_rounds} · best of 9 · games won = table points (e.g. lose 5–4 still earns 4)`;
  }
  if (state.phase === 'semi') {
    return 'Semi-finals · best of 9 · knockout (group points no longer count)';
  }
  if (state.phase === 'finals') {
    return '3rd/4th place & finals · best of 9 · knockout';
  }
  return 'Tournament complete';
}
