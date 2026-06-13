import { Group, Match, PlayoffMatch, Team, TeamStanding, TiebreakerRule, Tournament } from "@/types/tournament";

export function generateId(): string {
  return crypto.randomUUID();
}

export function generateGroups(groupCount: number): Group[] {
  const names = ["Skupina A", "Skupina B", "Skupina C", "Skupina D", "Skupina E", "Skupina F"];
  return Array.from({ length: groupCount }, (_, i) => ({
    id: generateId(),
    name: names[i] || `Skupina ${i + 1}`,
  }));
}

export function assignTeamsToGroups(teams: Team[], groups: Group[]): Team[] {
  return teams.map((team, i) => ({
    ...team,
    groupId: groups[i % groups.length].id,
  }));
}

export function generateRoundRobinMatches(
  teams: Team[],
  groupId: string,
  fieldCount: number,
  startOrder: number,
  roundCount: number = 1,
): Match[] {
  const groupTeams = teams.filter((t) => t.groupId === groupId);
  const matches: Match[] = [];

  for (let round = 0; round < roundCount; round++) {
    for (let i = 0; i < groupTeams.length; i++) {
      for (let j = i + 1; j < groupTeams.length; j++) {
        // In round 2, swap home/away
        const home = round % 2 === 0 ? groupTeams[i] : groupTeams[j];
        const away = round % 2 === 0 ? groupTeams[j] : groupTeams[i];
        matches.push({
          id: generateId(),
          groupId,
          homeTeamId: home.id,
          awayTeamId: away.id,
          homeScore: null,
          awayScore: null,
          field: (matches.length % fieldCount) + 1,
          order: startOrder + matches.length,
          played: false,
          scheduledTime: null,
          active: false,
        });
      }
    }
  }

  return matches;
}

function getMatchTeams(m: Match): string[] {
  return [m.homeTeamId, m.awayTeamId];
}

function getSlot(index: number, fieldCount: number): number {
  return Math.floor(index / fieldCount);
}

function hasSlotConflict(matches: Match[], index: number, fieldCount: number): boolean {
  const slot = getSlot(index, fieldCount);
  const currTeams = getMatchTeams(matches[index]);

  for (let i = 0; i < matches.length; i++) {
    if (i === index) continue;
    const iSlot = getSlot(i, fieldCount);
    // Conflict if same team is in the SAME slot (can't play 2 matches at once)
    // or in an adjacent slot (back-to-back matches)
    if (iSlot === slot || iSlot === slot - 1 || iSlot === slot + 1) {
      const otherTeams = getMatchTeams(matches[i]);
      if (otherTeams.some((t) => currTeams.includes(t))) {
        // Same-slot conflict is always bad
        if (iSlot === slot) return true;
        // Adjacent slot conflict (consecutive matches)
        return true;
      }
    }
  }
  return false;
}

function countMaxConsecutive(matches: Match[], fieldCount: number): number {
  let maxRun = 1;
  const slots: string[][] = [];
  for (let i = 0; i < matches.length; i++) {
    const s = getSlot(i, fieldCount);
    if (!slots[s]) slots[s] = [];
    slots[s].push(...getMatchTeams(matches[i]));
  }

  const teamSlots: Record<string, number[]> = {};
  for (let s = 0; s < slots.length; s++) {
    if (!slots[s]) continue;
    for (const t of slots[s]) {
      if (!teamSlots[t]) teamSlots[t] = [];
      teamSlots[t].push(s);
    }
  }

  for (const runs of Object.values(teamSlots)) {
    const sorted = Array.from(new Set(runs)).sort((a, b) => a - b);
    let run = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) {
        run++;
        if (run > maxRun) maxRun = run;
      } else {
        run = 1;
      }
    }
  }
  return maxRun;
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

interface ScheduleResult {
  placed: Match[];
  leftover: Match[];
}

function tryScheduleWithCooldown(
  pool: Match[],
  teamIds: string[],
  fieldCount: number,
  enforceCooldown: boolean,
): ScheduleResult {
  const consecutive: Record<string, number> = {};
  const lastOpponent: Record<string, string | null> = {};
  teamIds.forEach((t) => {
    consecutive[t] = 0;
    lastOpponent[t] = null;
  });

  const remaining = [...pool];
  const placed: Match[] = [];
  let slotIndex = 0;

  while (remaining.length > 0) {
    const slotTeams = new Set<string>();
    const courtOccupied: boolean[] = new Array(fieldCount).fill(false);
    const slotPlacements: Match[] = [];

    for (let f = 1; f <= fieldCount; f++) {
      if (courtOccupied[f - 1]) continue;

      const idx = remaining.findIndex((m) => {
        if (slotTeams.has(m.homeTeamId) || slotTeams.has(m.awayTeamId)) return false;
        // Block immediate rematch (back-to-back vs same opponent)
        if (lastOpponent[m.homeTeamId] === m.awayTeamId) return false;
        if (lastOpponent[m.awayTeamId] === m.homeTeamId) return false;
        if (enforceCooldown) {
          if ((consecutive[m.homeTeamId] ?? 0) >= 2) return false;
          if ((consecutive[m.awayTeamId] ?? 0) >= 2) return false;
        }
        return true;
      });

      if (idx === -1) continue;

      const match = remaining.splice(idx, 1)[0];
      slotPlacements.push({
        ...match,
        field: f,
        order: slotIndex * fieldCount + (f - 1),
      });
      slotTeams.add(match.homeTeamId);
      slotTeams.add(match.awayTeamId);
      courtOccupied[f - 1] = true;
    }

    const placedThisSlot = slotPlacements.length;
    const slotFull = placedThisSlot === fieldCount;
    const isLastSlot = remaining.length === 0;

    // Disallow gaps in the middle: only the last slot may be partial.
    if (!slotFull && !isLastSlot) {
      // Roll back this slot's placements into remaining and report deadlock.
      const originals = slotPlacements.map((sp) => {
        const { field: _f, order: _o, ...rest } = sp;
        return { ...rest, field: 0, order: 0 } as Match;
      });
      return { placed, leftover: [...originals, ...remaining] };
    }

    if (placedThisSlot === 0) {
      return { placed, leftover: remaining };
    }

    // Commit slot
    placed.push(...slotPlacements);

    // Update lastOpponent for teams that played this slot
    for (const sp of slotPlacements) {
      lastOpponent[sp.homeTeamId] = sp.awayTeamId;
      lastOpponent[sp.awayTeamId] = sp.homeTeamId;
    }

    // Reset cooldown for teams not playing this slot; increment for teams that did
    for (const t of teamIds) {
      if (slotTeams.has(t)) {
        consecutive[t] = (consecutive[t] ?? 0) + 1;
      } else {
        consecutive[t] = 0;
      }
    }

    slotIndex++;
  }

  return { placed, leftover: [] };
}

export function generateAllMatches(
  teams: Team[],
  groups: Group[],
  fieldCount: number,
  roundCount: number = 1,
): Match[] {
  // Generate matches per group separately
  const matchesByGroup: Match[][] = [];
  for (const group of groups) {
    const groupMatches = generateRoundRobinMatches(teams, group.id, fieldCount, 0, roundCount);
    matchesByGroup.push(groupMatches);
  }

  // Interleave: round-robin pick from each group (initial pool order)
  const initialPool: Match[] = [];
  const indices = matchesByGroup.map(() => 0);
  const totalMatches = matchesByGroup.reduce((sum, g) => sum + g.length, 0);

  while (initialPool.length < totalMatches) {
    for (let gi = 0; gi < matchesByGroup.length; gi++) {
      if (indices[gi] < matchesByGroup[gi].length) {
        initialPool.push(matchesByGroup[gi][indices[gi]]);
        indices[gi]++;
      }
    }
  }

  const teamIds = teams.map((t) => t.id);
  const MAX_ATTEMPTS = 2000;

  let pool = [...initialPool];

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Full reset every attempt: fresh trackers inside helper, fresh shuffled pool here.
    const result = tryScheduleWithCooldown(pool, teamIds, fieldCount, true);
    if (result.leftover.length === 0) {
      return result.placed.sort((a, b) => a.order - b.order);
    }
    pool = [...initialPool];
    shuffleInPlace(pool);
  }

  console.error("[generateAllMatches] Failed to build a valid schedule", {
    teams: teams.length,
    groups: groups.length,
    fieldCount,
    roundCount,
    totalMatches,
  });
  throw new Error(
    "Nepodařilo se vygenerovat platný rozpis bez konfliktů. Zkuste upravit počet kurtů nebo skupin.",
  );
}

export function assignMatchTimes(
  matches: Match[],
  startTime: string,
  matchDurationMinutes: number,
  fieldCount: number,
  breakMinutes: number = 0,
): Match[] {
  const sorted = [...matches].sort((a, b) => a.order - b.order);
  const [hours, minutes] = startTime.split(":").map(Number);
  const slotDuration = matchDurationMinutes + breakMinutes;

  return sorted.map((match) => {
    const slot = Math.floor(match.order / fieldCount);
    const totalMinutes = hours * 60 + minutes + slot * slotDuration;
    const h = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
    const m = (totalMinutes % 60).toString().padStart(2, "0");
    return { ...match, scheduledTime: `${h}:${m}` };
  });
}

export function recalculateMatchTimes(
  matches: Match[],
  startTime: string,
  matchDurationMinutes: number,
  fieldCount: number,
  breakMinutes: number,
): Match[] {
  const unplayed = matches.filter((m) => !m.played).sort((a, b) => a.order - b.order);
  const played = matches.filter((m) => m.played);

  if (unplayed.length === 0) return matches;

  const [hours, minutes] = startTime.split(":").map(Number);
  const slotDuration = matchDurationMinutes + breakMinutes;

  const updatedUnplayed = unplayed.map((match) => {
    const slot = Math.floor(match.order / fieldCount);
    const totalMinutes = hours * 60 + minutes + slot * slotDuration;
    const h = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
    const m = (totalMinutes % 60).toString().padStart(2, "0");
    return { ...match, scheduledTime: `${h}:${m}` };
  });

  return [...played, ...updatedUnplayed];
}

export function calculateStandings(
  matches: Match[],
  teams: Team[],
  groupId: string,
  rule: TiebreakerRule = 'head_to_head',
): TeamStanding[] {
  const groupTeams = teams.filter((t) => t.groupId === groupId);
  const groupMatches = matches.filter((m) => m.groupId === groupId && m.played);

  const standings: TeamStanding[] = groupTeams.map((team) => ({
    teamId: team.id,
    teamName: team.name,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  }));

  for (const match of groupMatches) {
    if (match.homeScore === null || match.awayScore === null) continue;

    const home = standings.find((s) => s.teamId === match.homeTeamId);
    const away = standings.find((s) => s.teamId === match.awayTeamId);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.wins++;
      home.points += 3;
      away.losses++;
    } else if (match.homeScore < match.awayScore) {
      away.wins++;
      away.points += 3;
      home.losses++;
    } else {
      home.draws++;
      away.draws++;
      home.points += 1;
      away.points += 1;
    }
  }

  standings.forEach((s) => {
    s.goalDifference = s.goalsFor - s.goalsAgainst;
  });

  // Tie-breaker helper: head-to-head (returns negative if a wins, positive if b wins, 0 if no single match)
  const headToHead = (a: TeamStanding, b: TeamStanding): number => {
    const h2h = groupMatches.find(
      (m) =>
        (m.homeTeamId === a.teamId && m.awayTeamId === b.teamId) ||
        (m.homeTeamId === b.teamId && m.awayTeamId === a.teamId),
    );
    if (!h2h || h2h.homeScore === null || h2h.awayScore === null) return 0;
    const aGoals = h2h.homeTeamId === a.teamId ? h2h.homeScore : h2h.awayScore;
    const bGoals = h2h.homeTeamId === b.teamId ? h2h.homeScore : h2h.awayScore;
    return bGoals - aGoals;
  };

  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;

    if (rule === 'head_to_head') {
      const h = headToHead(a, b);
      if (h !== 0) return h;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    }

    if (rule === 'goal_diff') {
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return headToHead(a, b);
    }

    // rule === 'wins'
    if (b.wins !== a.wins) return b.wins - a.wins;
    const h = headToHead(a, b);
    if (h !== 0) return h;
    return b.goalDifference - a.goalDifference;
  });

  return standings;
}

function computePlayoffStartMinutes(tournament: Tournament): number {
  if (tournament.playoffStartTime) {
    const [pH, pM] = tournament.playoffStartTime.split(":").map(Number);
    return pH * 60 + pM;
  }
  const { matches, fieldCount } = tournament;
  const sortedGroupMatches = [...matches].sort((a, b) => a.order - b.order);
  const lastGroupMatch = sortedGroupMatches[sortedGroupMatches.length - 1];
  const lastGroupSlot = lastGroupMatch ? Math.floor(lastGroupMatch.order / fieldCount) : -1;
  const [startHours, startMinutes] = tournament.startTime.split(":").map(Number);
  const groupSlotDuration = tournament.matchDurationMinutes + tournament.breakDurationMinutes;
  return startHours * 60 + startMinutes + (lastGroupSlot + 1) * groupSlotDuration;
}

/**
 * Compute overall seeding across groups in layers:
 * All 1st-placed teams (ranked among themselves), then all 2nd-placed, etc.
 */
export function computeOverallSeeding(tournament: Tournament): string[] {
  const { groups, teams, matches } = tournament;
  const rule = tournament.tiebreakerRule || 'head_to_head';
  const allStandings = groups.map((g) => calculateStandings(matches, teams, g.id, rule));
  const maxLen = Math.max(0, ...allStandings.map((s) => s.length));
  const seeds: string[] = [];
  for (let pos = 0; pos < maxLen; pos++) {
    const layer = allStandings.map((s) => s[pos]).filter((s) => s !== undefined);
    layer.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
    for (const s of layer) seeds.push(s.teamId);
  }
  return seeds;
}

/**
 * Generate a classic bracket playoff.
 * 12+ teams: pre-round (5v12, 6v11, 7v10, 8v9) → QF → SF → 3rd + Final.
 * 8-11 teams: QF (1v8…) → SF → 3rd + Final.
 * 4-7 teams: SF (1v4, 2v3) → 3rd + Final.
 * 2-3 teams: Final only.
 */
export function generateBracketPlayoff(tournament: Tournament, seedsOverride?: (string | null)[]): PlayoffMatch[] {
  const { fieldCount } = tournament;
  const seeds: (string | null)[] = seedsOverride ?? computeOverallSeeding(tournament);
  const N = seeds.length;

  const matchDuration = tournament.playoffMatchDurationMinutes ?? tournament.matchDurationMinutes ?? 12;
  const breakDuration = tournament.playoffBreakDurationMinutes ?? tournament.breakDurationMinutes ?? 3;
  const slotDuration = matchDuration + breakDuration;
  const startMin = computePlayoffStartMinutes(tournament);

  const out: PlayoffMatch[] = [];
  let idx = 0;
  const seed = (n: number): string | null => seeds[n - 1] ?? null;

  const add = (round: number, position: number, home: string | null, away: string | null, label: string) => {
    const slot = Math.floor(idx / fieldCount);
    const total = startMin + slot * slotDuration;
    const h = Math.floor(total / 60).toString().padStart(2, "0");
    const m = (total % 60).toString().padStart(2, "0");
    out.push({
      id: generateId(),
      round, position,
      homeTeamId: home, awayTeamId: away,
      homeScore: null, awayScore: null,
      played: false,
      field: (idx % fieldCount) + 1,
      active: false,
      label,
      scheduledTime: `${h}:${m}`,
    });
    idx++;
  };

  const nextSlot = () => {
    if (idx % fieldCount !== 0) {
      idx += fieldCount - (idx % fieldCount);
    }
  };

  if (N >= 12) {
    add(10, 0, seed(5), seed(12), 'Předkolo: 5 vs 12');
    add(10, 1, seed(6), seed(11), 'Předkolo: 6 vs 11');
    add(10, 2, seed(7), seed(10), 'Předkolo: 7 vs 10');
    add(10, 3, seed(8), seed(9), 'Předkolo: 8 vs 9');
    
    nextSlot();

    if (tournament.playoffConsolationMatches) {
      add(11, 0, null, null, 'O 9.-12. místo (1)');
      add(11, 1, null, null, 'O 9.-12. místo (2)');
      nextSlot();
    }

    add(4, 0, seed(1), null, 'Čtvrtfinále 1');
    add(4, 1, seed(2), null, 'Čtvrtfinále 2');
    add(4, 2, seed(3), null, 'Čtvrtfinále 3');
    add(4, 3, seed(4), null, 'Čtvrtfinále 4');

    nextSlot();

    if (tournament.playoffConsolationMatches) {
      add(12, 0, null, null, 'Finále Playdown');
    }

    add(3, 0, null, null, 'Semifinále 1');
    add(3, 1, null, null, 'Semifinále 2');

    nextSlot();

    add(2, 0, null, null, 'O 3. místo');
    add(1, 0, null, null, 'Finále');
  } else if (N >= 8) {
    add(4, 0, seed(1), seed(8), 'Čtvrtfinále 1');
    add(4, 1, seed(2), seed(7), 'Čtvrtfinále 2');
    add(4, 2, seed(3), seed(6), 'Čtvrtfinále 3');
    add(4, 3, seed(4), seed(5), 'Čtvrtfinále 4');

    nextSlot();

    if (tournament.playoffConsolationMatches) {
      add(5, 0, null, null, 'O 5.-8. místo (1)');
      add(5, 1, null, null, 'O 5.-8. místo (2)');
      nextSlot();
    }

    add(3, 0, null, null, 'Semifinále 1');
    add(3, 1, null, null, 'Semifinále 2');

    nextSlot();

    if (tournament.playoffConsolationMatches) {
      add(6, 0, null, null, 'Finále Playdown');
    }

    add(2, 0, null, null, 'O 3. místo');
    add(1, 0, null, null, 'Finále');
  } else if (N >= 4) {
    add(3, 0, seed(1), seed(4), 'Semifinále 1');
    add(3, 1, seed(2), seed(3), 'Semifinále 2');

    nextSlot();

    add(2, 0, null, null, 'O 3. místo');
    add(1, 0, null, null, 'Finále');
  } else if (N >= 2) {
    add(1, 0, seed(1), seed(2), 'Finále');
  }

  return out;
}

export function generatePlayoffBracket(tournament: Tournament): PlayoffMatch[] {
  if (tournament.playoffFormat === 'bracket') {
    return generateBracketPlayoff(tournament);
  }
  return generatePlacementPlayoff(tournament);
}

function generatePlacementPlayoff(tournament: Tournament): PlayoffMatch[] {
  const { groups, teams, matches, fieldCount } = tournament;
  const rule = tournament.tiebreakerRule || 'head_to_head';

  if (groups.length < 2) return [];

  // Get standings for both groups
  const standingsA = calculateStandings(matches, teams, groups[0].id, rule);
  const standingsB = calculateStandings(matches, teams, groups[1].id, rule);

  const maxLen = Math.max(standingsA.length, standingsB.length);
  const minLen = Math.min(standingsA.length, standingsB.length);

  const playoffMatches: PlayoffMatch[] = [];

  // Calculate start time: use custom playoff start time or continue from last group match
  const matchDuration = tournament.playoffMatchDurationMinutes ?? tournament.matchDurationMinutes ?? 11;
  const breakDuration = tournament.playoffBreakDurationMinutes ?? tournament.breakDurationMinutes ?? 3;
  const slotDuration = matchDuration + breakDuration;

  let playoffStartMinutes: number;
  if (tournament.playoffStartTime) {
    const [pH, pM] = tournament.playoffStartTime.split(":").map(Number);
    playoffStartMinutes = pH * 60 + pM;
  } else {
    const sortedGroupMatches = [...matches].sort((a, b) => a.order - b.order);
    const lastGroupMatch = sortedGroupMatches[sortedGroupMatches.length - 1];
    const lastGroupSlot = lastGroupMatch ? Math.floor(lastGroupMatch.order / fieldCount) : -1;
    const [startHours, startMinutes] = tournament.startTime.split(":").map(Number);
    const groupSlotDuration = tournament.matchDurationMinutes + tournament.breakDurationMinutes;
    playoffStartMinutes = startHours * 60 + startMinutes + (lastGroupSlot + 1) * groupSlotDuration;
  }

  let playoffIndex = 0;

  function getPlayoffTime(index: number): string {
    const slot = Math.floor(index / fieldCount);
    const totalMinutes = playoffStartMinutes + slot * slotDuration;
    const h = Math.floor(totalMinutes / 60)
      .toString()
      .padStart(2, "0");
    const m = (totalMinutes % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  }

  if (standingsA.length !== standingsB.length) {
    const larger = standingsA.length > standingsB.length ? standingsA : standingsB;
    const smaller = standingsA.length > standingsB.length ? standingsB : standingsA;

    const extraTeamId = larger[maxLen - 1]?.teamId || null;
    const lastSmallerTeamId = smaller[minLen - 1]?.teamId || null;

    playoffMatches.push({
      id: generateId(),
      round: 10,
      position: 0,
      homeTeamId: extraTeamId,
      awayTeamId: lastSmallerTeamId,
      homeScore: null,
      awayScore: null,
      played: false,
      field: (playoffIndex % fieldCount) + 1,
      active: false,
      label: "Předkolo",
      scheduledTime: getPlayoffTime(playoffIndex),
    });
    playoffIndex++;

    if (playoffIndex % fieldCount !== 0) {
      playoffIndex += fieldCount - (playoffIndex % fieldCount);
    }
  }

  const placementCount = maxLen;

  // Generate from least important (highest rank) to most important (rank 1 = final)
  for (let i = placementCount - 1; i >= 0; i--) {
    const rank = i + 1;
    const placeStart = i * 2 + 1;
    const placeEnd = i * 2 + 2;
    const label = `O ${placeStart}.-${placeEnd}. místo`;

    let homeTeamId: string | null = null;
    let awayTeamId: string | null = null;

    if (standingsA.length !== standingsB.length) {
      const larger = standingsA.length > standingsB.length ? standingsA : standingsB;
      const smaller = standingsA.length > standingsB.length ? standingsB : standingsA;

      if (i < minLen - 1) {
        homeTeamId = standingsA[i]?.teamId || null;
        awayTeamId = standingsB[i]?.teamId || null;
      } else if (i === minLen - 1) {
        homeTeamId = larger[i]?.teamId || null;
        awayTeamId = null;
      } else {
        continue;
      }
    } else {
      homeTeamId = standingsA[i]?.teamId || null;
      awayTeamId = standingsB[i]?.teamId || null;
    }

    playoffMatches.push({
      id: generateId(),
      round: rank,
      position: 0,
      homeTeamId,
      awayTeamId,
      homeScore: null,
      awayScore: null,
      played: false,
      field: (playoffIndex % fieldCount) + 1,
      active: false,
      label,
      scheduledTime: getPlayoffTime(playoffIndex),
    });
    playoffIndex++;
  }

  return playoffMatches;
}

/**
 * Returns true if a team's standing position in its group is mathematically certain
 * (no remaining matches can change it). Position is 0-indexed (0 = first place).
 */
function isPositionCertain(
  teamId: string,
  position: number,
  matches: Match[],
  teams: Team[],
  groupId: string,
  rule: TiebreakerRule = 'head_to_head',
): boolean {
  const standings = calculateStandings(matches, teams, groupId, rule);
  if (standings[position]?.teamId !== teamId) return false;

  const groupMatches = matches.filter((m) => m.groupId === groupId);
  const unplayed = groupMatches.filter((m) => !m.played);
  if (unplayed.length === 0) return true;

  const myPoints = standings[position].points;

  // Check team above: can it be overtaken from below?
  // (we only care that this team stays at exactly `position`, so check both sides)
  const teamAbove = position > 0 ? standings[position - 1] : null;
  const teamBelow = position < standings.length - 1 ? standings[position + 1] : null;

  // Best-case points for team below: assume it wins all its remaining matches
  if (teamBelow) {
    const remainingForBelow = unplayed.filter(
      (m) => m.homeTeamId === teamBelow.teamId || m.awayTeamId === teamBelow.teamId,
    ).length;
    const bestPointsBelow = teamBelow.points + remainingForBelow * 3;
    // Worst-case points for current team: assume it loses all its remaining matches
    const remainingForMe = unplayed.filter(
      (m) => m.homeTeamId === teamId || m.awayTeamId === teamId,
    ).length;
    const worstPointsMe = myPoints; // losses give 0 points
    if (bestPointsBelow >= worstPointsMe) return false;
    // If equal points possible, tiebreakers could shift order — be conservative
  }

  // Worst-case for team above: assume it loses all remaining
  if (teamAbove) {
    const remainingForAbove = unplayed.filter(
      (m) => m.homeTeamId === teamAbove.teamId || m.awayTeamId === teamAbove.teamId,
    ).length;
    const worstPointsAbove = teamAbove.points;
    const remainingForMe = unplayed.filter(
      (m) => m.homeTeamId === teamId || m.awayTeamId === teamId,
    ).length;
    const bestPointsMe = myPoints + remainingForMe * 3;
    if (bestPointsMe > worstPointsAbove) return false;
  }

  return true;
}

/**
 * Generates playoff preview matches with correct times/fields/labels but
 * placeholder (null) team IDs. If a team's group position is mathematically
 * certain, the real teamId is filled in.
 *
 * Used to show the playoff schedule in the UI before group phase ends.
 */
export function getPlayoffPreview(tournament: Tournament): PlayoffMatch[] {
  if (tournament.playoffFormat === 'bracket') {
    const totalTeams = tournament.teams.length;
    const complete = isGroupPhaseComplete(tournament);
    if (complete) {
      return generateBracketPlayoff(tournament);
    }
    // Show structure with null teams (preview only)
    const placeholderSeeds: (string | null)[] = Array(totalTeams).fill(null);
    return generateBracketPlayoff(tournament, placeholderSeeds);
  }
  const { groups, teams, matches, fieldCount } = tournament;
  const rule = tournament.tiebreakerRule || 'head_to_head';
  if (groups.length < 2) return [];

  const groupSizes = groups.map((g) => teams.filter((t) => t.groupId === g.id).length);
  const maxLen = Math.max(...groupSizes);
  const minLen = Math.min(...groupSizes);
  if (maxLen === 0) return [];

  // Compute playoff start time (same logic as generatePlayoffBracket)
  const matchDuration = tournament.playoffMatchDurationMinutes ?? tournament.matchDurationMinutes ?? 11;
  const breakDuration = tournament.playoffBreakDurationMinutes ?? tournament.breakDurationMinutes ?? 3;
  const slotDuration = matchDuration + breakDuration;

  let playoffStartMinutes: number;
  if (tournament.playoffStartTime) {
    const [pH, pM] = tournament.playoffStartTime.split(":").map(Number);
    playoffStartMinutes = pH * 60 + pM;
  } else {
    const sortedGroupMatches = [...matches].sort((a, b) => a.order - b.order);
    const lastGroupMatch = sortedGroupMatches[sortedGroupMatches.length - 1];
    const lastGroupSlot = lastGroupMatch ? Math.floor(lastGroupMatch.order / fieldCount) : -1;
    const [startHours, startMinutes] = tournament.startTime.split(":").map(Number);
    const groupSlotDuration = tournament.matchDurationMinutes + tournament.breakDurationMinutes;
    playoffStartMinutes = startHours * 60 + startMinutes + (lastGroupSlot + 1) * groupSlotDuration;
  }

  const getTime = (i: number): string => {
    const slot = Math.floor(i / fieldCount);
    const total = playoffStartMinutes + slot * slotDuration;
    const h = Math.floor(total / 60).toString().padStart(2, "0");
    const m = (total % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  // Pre-compute standings for each group (for filling in certain positions)
  const standingsByGroup = groups.map((g) => calculateStandings(matches, teams, g.id, rule));
  const groupA = groups[0];
  const groupB = groups[1];
  const standingsA = standingsByGroup[0];
  const standingsB = standingsByGroup[1];

  // Helper: returns teamId only if its position in its group is mathematically certain
  const certainTeamAt = (groupIdx: number, pos: number): string | null => {
    const standings = standingsByGroup[groupIdx];
    const candidate = standings[pos];
    if (!candidate) return null;
    const groupId = groups[groupIdx].id;
    return isPositionCertain(candidate.teamId, pos, matches, teams, groupId, rule) ? candidate.teamId : null;
  };

  const preview: PlayoffMatch[] = [];
  let idx = 0;

  // Preliminary round (when groups have unequal sizes)
  if (maxLen !== minLen) {
    const largerIdx = standingsA.length > standingsB.length ? 0 : 1;
    const smallerIdx = largerIdx === 0 ? 1 : 0;

    preview.push({
      id: generateId(),
      round: 10,
      position: 0,
      homeTeamId: certainTeamAt(largerIdx, maxLen - 1),
      awayTeamId: certainTeamAt(smallerIdx, minLen - 1),
      homeScore: null,
      awayScore: null,
      played: false,
      field: (idx % fieldCount) + 1,
      active: false,
      label: "Předkolo",
      scheduledTime: getTime(idx),
    });
    idx++;
  }

  // Placement matches: from least important (highest rank) to final
  for (let i = maxLen - 1; i >= 0; i--) {
    const placeStart = i * 2 + 1;
    const label = `O ${placeStart}.-${placeStart + 1}. místo`;

    let homeTeamId: string | null = null;
    let awayTeamId: string | null = null;

    if (maxLen !== minLen) {
      if (i < minLen - 1) {
        homeTeamId = certainTeamAt(0, i);
        awayTeamId = certainTeamAt(1, i);
      } else if (i === minLen - 1) {
        // The "extra" team from larger group plays here (winner of preliminary)
        // Leave both null — winner is decided by preliminary
      } else {
        continue;
      }
    } else {
      homeTeamId = certainTeamAt(0, i);
      awayTeamId = certainTeamAt(1, i);
    }

    preview.push({
      id: generateId(),
      round: i + 1,
      position: 0,
      homeTeamId,
      awayTeamId,
      homeScore: null,
      awayScore: null,
      played: false,
      field: (idx % fieldCount) + 1,
      active: false,
      label,
      scheduledTime: getTime(idx),
    });
    idx++;
  }

  return preview;
}

export function getTeamName(teams: Team[], teamId: string | null): string {
  if (!teamId) return "???";
  return teams.find((t) => t.id === teamId)?.name || "???";
}

export function getFieldColor(field: number): string {
  switch (field) {
    case 1:
      return "hsl(210, 80%, 55%)";
    case 2:
      return "hsl(25, 90%, 55%)";
    case 3:
      return "hsl(350, 75%, 55%)";
    default:
      return "hsl(0, 0%, 50%)";
  }
}

export function getFieldColorClass(field: number): string {
  switch (field) {
    case 1:
      return "bg-blue-500";
    case 2:
      return "bg-orange-500";
    case 3:
      return "bg-rose-500";
    default:
      return "bg-gray-500";
  }
}

export function isGroupPhaseComplete(tournament: Tournament): boolean {
  return tournament.matches.every((m) => m.played);
}

export function isPlayoffComplete(tournament: Tournament): boolean {
  return tournament.playoffMatches.length > 0 && tournament.playoffMatches.every((m) => m.played);
}

export function getWinner(tournament: Tournament): string | null {
  // New format: round === 1 is the 1st/2nd place match
  const finalMatch = tournament.playoffMatches.find((m) => m.round === 1 && m.played);
  if (!finalMatch || finalMatch.homeScore === null || finalMatch.awayScore === null) return null;
  return finalMatch.homeScore > finalMatch.awayScore ? finalMatch.homeTeamId : finalMatch.awayTeamId;
}

export function shiftTimeString(time: string, deltaMinutes: number): string {
  const [h, m] = time.split(':').map(Number);
  let total = h * 60 + m + deltaMinutes;
  total = ((total % 1440) + 1440) % 1440;
  const hh = Math.floor(total / 60).toString().padStart(2, '0');
  const mm = (total % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}
