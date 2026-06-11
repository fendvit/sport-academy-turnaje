export interface Tournament {
  id: string;
  name: string;
  date: string;
  fieldCount: number;
  password?: string;
  phase: 'setup' | 'group' | 'playoff' | 'finished';
  category: string;
  teams: Team[];
  groups: Group[];
  matches: Match[];
  playoffMatches: PlayoffMatch[];
  matchDurationMinutes: number;
  breakDurationMinutes: number;
  startTime: string;
  roundCount: number;
  playoffStartTime?: string | null;
  archived: boolean;
  tiebreakerRule: TiebreakerRule;
  playoffFormat: PlayoffFormat;
  playoffMatchDurationMinutes: number | null;
  playoffConsolationMatches?: boolean;
}

export type TiebreakerRule = 'head_to_head' | 'goal_diff' | 'wins';

export type PlayoffFormat = 'placement' | 'bracket';

export interface Team {
  id: string;
  name: string;
  groupId: string;
  trainer?: string | null;
}

export interface Group {
  id: string;
  name: string;
}

export interface Match {
  id: string;
  groupId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  field: number;
  order: number;
  played: boolean;
  scheduledTime: string | null;
  active: boolean;
}

export interface PlayoffMatch {
  id: string;
  round: number; // 10 = preliminary, 1 = 1st/2nd, 2 = 3rd/4th, 3 = 5th/6th, etc.
  position: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  played: boolean;
  field: number;
  active: boolean;
  label?: string; // e.g. "O 1.-2. místo"
  scheduledTime: string | null;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  number: number | null;
}

export interface Scorer {
  id: string;
  tournamentId: string;
  field: number;
  pin?: string;
  token: string;
}

export interface TeamStanding {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}
