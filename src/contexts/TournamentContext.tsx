import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Tournament, Team, Group, Match, PlayoffMatch, Player, Scorer } from '@/types/tournament';
import { supabase } from '@/integrations/supabase/client';
import { assignMatchTimes, generateAllMatches, generateGroups, assignTeamsToGroups, shiftTimeString } from '@/utils/tournament';

export interface RegenerateInput {
  name: string;
  category: string;
  date: string;
  fieldCount: number;
  password?: string;
  startTime: string;
  matchDurationMinutes: number;
  breakDurationMinutes: number;
  roundCount: number;
  playoffStartTime: string | null;
  tiebreakerRule: Tournament['tiebreakerRule'];
  groupCount: number;
  playoffFormat: 'placement' | 'bracket';
  playoffMatchDurationMinutes: number | null;
  playoffConsolationMatches: boolean;
  teams: { id: string | null; name: string; groupIndex: number | null }[];
}

interface TournamentContextType {
  tournaments: Tournament[];
  allTournaments: Tournament[];
  tournament: Tournament | null;
  players: Player[];
  scorers: Scorer[];
  loading: boolean;
  selectTournament: (id: string) => void;
  setTournament: (t: Tournament | null) => void;
  saveTournament: (t: Tournament) => Promise<void>;
  updateMatch: (matchId: string, homeScore: number, awayScore: number) => Promise<void>;
  updateMatchScore: (matchId: string, homeScore: number, awayScore: number) => Promise<void>;
  updateMatchTime: (matchId: string, time: string) => Promise<void>;
  updatePlayoffMatch: (matchId: string, homeScore: number, awayScore: number) => Promise<void>;
  updatePlayoffMatchScore: (matchId: string, homeScore: number, awayScore: number) => Promise<void>;
  startPlayoffMatch: (matchId: string) => Promise<void>;
  startPlayoff: (playoffMatches: PlayoffMatch[], phase: string) => Promise<void>;
  deleteTournament: () => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  updateTeamTrainer: (teamId: string, trainer: string) => Promise<void>;
  updateTeamName: (teamId: string, name: string) => Promise<void>;
  reopenPlayoffMatch: (matchId: string) => Promise<void>;
  addPlayer: (teamId: string, name: string, number: number | null) => Promise<void>;
  removePlayer: (playerId: string) => Promise<void>;
  importPlayersCSV: (teamId: string, players: { name: string; number: number | null }[]) => Promise<void>;
  addScorer: (field: number, pin: string) => Promise<void>;
  removeScorer: (id: string) => Promise<void>;
  reorderMatches: (updates: { id: string; order: number }[]) => Promise<void>;
  startTournament: () => Promise<void>;
  updatePlayoffStartTime: (time: string | null) => Promise<void>;
  shiftMatchTimes: (newStartTime: string) => Promise<void>;
  shiftPlayoffTimes: (newPlayoffStartTime: string) => Promise<void>;
  archiveTournament: (id: string, archived: boolean) => Promise<void>;
  regenerateTournament: (input: RegenerateInput) => Promise<void>;
  resetTournament: () => Promise<void>;
  isAdmin: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const TournamentContext = createContext<TournamentContextType | null>(null);

const ADMIN_KEY = 'florbal_admin';

function playoffLabel(pm: any, format: 'placement' | 'bracket'): string {
  if (format === 'bracket') {
    if (pm.round === 10) return 'Předkolo';
    if (pm.round === 11) return 'O 9.-12. místo';
    if (pm.round === 4) return 'Čtvrtfinále';
    if (pm.round === 5) return 'O 5.-8. místo';
    if (pm.round === 3) return 'Semifinále';
    if (pm.round === 2) return 'O 3. místo';
    if (pm.round === 1) return 'Finále';
    return `Kolo ${pm.round}`;
  }
  return pm.round === 10 ? 'Předkolo' : `O ${(pm.round - 1) * 2 + 1}.-${(pm.round - 1) * 2 + 2}. místo`;
}

function dbToTournament(
  t: any,
  teams: any[],
  groups: any[],
  matches: any[],
  playoffMatches: any[]
): Tournament {
  const playoffFormat = (t.playoff_format as 'placement' | 'bracket') || 'placement';
  return {
    id: t.id,
    name: t.name,
    date: t.date,
    fieldCount: t.field_count,
    phase: t.phase as Tournament['phase'],
    category: t.category || '',
    matchDurationMinutes: t.match_duration_minutes ?? 12,
    breakDurationMinutes: t.break_duration_minutes ?? 3,
    startTime: t.start_time || '09:00',
    roundCount: t.round_count ?? 1,
    playoffStartTime: t.playoff_start_time || null,
    archived: t.archived ?? false,
    tiebreakerRule: (t.tiebreaker_rule as Tournament['tiebreakerRule']) || 'head_to_head',
    playoffFormat,
    playoffMatchDurationMinutes: t.playoff_match_duration_minutes ?? null,
    playoffBreakDurationMinutes: t.playoff_break_duration_minutes ?? null,
    playoffConsolationMatches: t.playoff_consolation_matches ?? false,
    assignFieldsByGroup: t.assign_fields_by_group ?? false,
    teams: teams.map(tm => ({ id: tm.id, name: tm.name, groupId: tm.group_id, trainer: tm.trainer || null })),
    groups: groups.map(g => ({ id: g.id, name: g.name })),
    matches: matches.map(m => ({
      id: m.id,
      groupId: m.group_id,
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
      homeScore: m.home_score,
      awayScore: m.away_score,
      field: m.field,
      order: m.match_order,
      played: m.played,
      scheduledTime: m.scheduled_time || null,
      active: m.active ?? false,
    })),
    playoffMatches: playoffMatches.map(pm => ({
      id: pm.id,
      round: pm.round,
      position: pm.position,
      homeTeamId: pm.home_team_id,
      awayTeamId: pm.away_team_id,
      homeScore: pm.home_score,
      awayScore: pm.away_score,
      played: pm.played,
      field: pm.field,
      active: pm.active ?? false,
      label: playoffLabel(pm, playoffFormat),
      scheduledTime: pm.scheduled_time || null,
    })),
  };
}

export function TournamentProvider({ children }: { children: React.ReactNode }) {
  const [tournamentList, setTournamentList] = useState<{ id: string; name: string; date: string; phase: string; category: string; archived: boolean; field_count: number; match_duration_minutes: number; break_duration_minutes: number; start_time: string; round_count: number; playoff_start_time: string | null; tiebreaker_rule: string; playoff_format: string; playoff_match_duration_minutes: number | null; playoff_break_duration_minutes: number | null; playoff_consolation_matches: boolean; assign_fields_by_group: boolean }[]>([]);
  const [detailCache, setDetailCache] = useState<Record<string, Tournament>>({});
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [allScorers, setAllScorers] = useState<Scorer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load lightweight tournament list
  const loadTournamentList = useCallback(async () => {
    const { data } = await supabase
      .from('tournaments')
      .select('id, name, date, created_at, phase, field_count, category, match_duration_minutes, break_duration_minutes, start_time, round_count, playoff_start_time, archived, tiebreaker_rule, playoff_format, playoff_match_duration_minutes, playoff_consolation_matches, assign_fields_by_group')
      .order('created_at', { ascending: false });

    if (!data || data.length === 0) {
      setTournamentList([]);
      setLoading(false);
      return;
    }

    setTournamentList(data);

    if (!selectedId && data.length > 0) {
      setSelectedId(data[0].id);
    }

    setLoading(false);
  }, [selectedId]);

  // Load detail for a specific tournament
  const loadTournamentDetail = useCallback(async (tournamentId: string) => {
    const tMeta = tournamentList.find(t => t.id === tournamentId);
    if (!tMeta) return;

    const [teamsRes, groupsRes, matchesRes, playoffRes, playersRes, scorersRes] = await Promise.all([
      supabase.from('teams').select('*').eq('tournament_id', tournamentId),
      supabase.from('groups').select('*').eq('tournament_id', tournamentId),
      supabase.from('matches').select('*').eq('tournament_id', tournamentId).order('match_order'),
      supabase.from('playoff_matches').select('*').eq('tournament_id', tournamentId),
      supabase.from('players').select('*').eq('tournament_id', tournamentId),
      supabase.from('scorers').select('id, tournament_id, field, token, created_at').eq('tournament_id', tournamentId),
    ]);

    const detail = dbToTournament(
      tMeta,
      teamsRes.data || [],
      groupsRes.data || [],
      matchesRes.data || [],
      playoffRes.data || [],
    );

    setDetailCache(prev => ({ ...prev, [tournamentId]: detail }));
    setAllPlayers((playersRes.data || []).map(p => ({
      id: p.id,
      teamId: p.team_id,
      name: p.name,
      number: p.number,
    })));
    setAllScorers((scorersRes.data || []).map(s => ({
      id: s.id,
      tournamentId: s.tournament_id,
      field: s.field,
      token: s.token,
    })));
  }, [tournamentList]);

  // Initial load
  useEffect(() => {
    loadTournamentList();
    const adminSession = sessionStorage.getItem(ADMIN_KEY);
    if (adminSession === 'true') setIsAdmin(true);
  }, [loadTournamentList]);

  // Load detail when selectedId changes
  useEffect(() => {
    if (selectedId && tournamentList.length > 0) {
      loadTournamentDetail(selectedId);
    }
  }, [selectedId, tournamentList, loadTournamentDetail]);

  // Realtime: tournament list changes
  useEffect(() => {
    const channel = supabase
      .channel('tournament-list-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, () => loadTournamentList())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadTournamentList]);

  // Realtime: detail changes scoped to selected tournament
  useEffect(() => {
    if (!selectedId) return;
    const channel = supabase
      .channel(`tournament-detail-${selectedId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${selectedId}` }, () => loadTournamentDetail(selectedId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playoff_matches', filter: `tournament_id=eq.${selectedId}` }, () => loadTournamentDetail(selectedId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `tournament_id=eq.${selectedId}` }, () => loadTournamentDetail(selectedId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups', filter: `tournament_id=eq.${selectedId}` }, () => loadTournamentDetail(selectedId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `tournament_id=eq.${selectedId}` }, () => loadTournamentDetail(selectedId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scorers', filter: `tournament_id=eq.${selectedId}` }, () => loadTournamentDetail(selectedId))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedId, loadTournamentDetail]);

  // Build allTournaments from tournamentList + detailCache
  const allTournaments = useMemo(() => {
    return tournamentList.map(t => {
      if (detailCache[t.id]) return detailCache[t.id];
      // Lightweight placeholder for non-loaded tournaments
      return dbToTournament(t, [], [], [], []);
    });
  }, [tournamentList, detailCache]);

  const tournament = useMemo(() =>
    detailCache[selectedId || ''] || null,
    [detailCache, selectedId]
  );

  const players = useMemo(() => {
    if (!tournament) return [];
    const teamIds = new Set(tournament.teams.map(t => t.id));
    return allPlayers.filter(p => teamIds.has(p.teamId));
  }, [tournament, allPlayers]);

  const scorers = useMemo(() => {
    if (!tournament) return [];
    return allScorers.filter(s => s.tournamentId === tournament.id);
  }, [tournament, allScorers]);

  const selectTournament = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const saveTournament = useCallback(async (t: Tournament) => {
    const { error: tErr } = await supabase
      .from('tournaments')
      .insert({
        id: t.id, name: t.name, date: t.date,
        field_count: t.fieldCount, password: t.password, phase: t.phase,
        category: t.category,
        match_duration_minutes: t.matchDurationMinutes,
        break_duration_minutes: t.breakDurationMinutes,
        start_time: t.startTime,
        round_count: t.roundCount,
        playoff_start_time: t.playoffStartTime || null,
        tiebreaker_rule: t.tiebreakerRule || 'head_to_head',
        playoff_format: t.playoffFormat || 'placement',
        playoff_match_duration_minutes: t.playoffMatchDurationMinutes,
        playoff_break_duration_minutes: t.playoffBreakDurationMinutes,
        playoff_consolation_matches: t.playoffConsolationMatches,
        assign_fields_by_group: t.assignFieldsByGroup,
      })
      .select().single();

    if (tErr) { 
      console.error('Tournament insert error:', tErr); 
      throw tErr; 
    }

    try {
      if (t.groups.length > 0) {
        const { error: gErr } = await supabase.from('groups').insert(
          t.groups.map(g => ({ id: g.id, tournament_id: t.id, name: g.name }))
        );
        if (gErr) throw gErr;
      }

      if (t.teams.length > 0) {
        const { error: tmErr } = await supabase.from('teams').insert(
          t.teams.map(tm => ({ id: tm.id, tournament_id: t.id, name: tm.name, group_id: tm.groupId }))
        );
        if (tmErr) throw tmErr;
      }

      if (t.matches.length > 0) {
        const { error: mErr } = await supabase.from('matches').insert(
          t.matches.map(m => ({
            id: m.id, tournament_id: t.id, group_id: m.groupId,
            home_team_id: m.homeTeamId, away_team_id: m.awayTeamId,
            home_score: m.homeScore, away_score: m.awayScore,
            field: m.field, match_order: m.order, played: m.played,
            scheduled_time: m.scheduledTime, active: m.active,
          }))
        );
        if (mErr) throw mErr;
      }

      setSelectedId(t.id);
    } catch (err) {
      console.error('Error saving tournament related data:', err);
      throw err;
    }
  }, []);

  // Finalize match: set played=true, deactivate, activate next on same field
  const updateMatch = useCallback(async (matchId: string, homeScore: number, awayScore: number) => {
    if (!tournament) return;
    
    // Set played, deactivate
    await supabase
      .from('matches')
      .update({ home_score: homeScore, away_score: awayScore, played: true, active: false })
      .eq('id', matchId);

    // Activate next unplayed match on the same field
    const match = tournament.matches.find(m => m.id === matchId);
    if (match) {
      const nextOnField = tournament.matches
        .filter(m => m.field === match.field && !m.played && m.id !== matchId)
        .sort((a, b) => a.order - b.order)[0];
      if (nextOnField) {
        await supabase
          .from('matches')
          .update({ active: true })
          .eq('id', nextOnField.id);
      }
    }
  }, [tournament]);

  // Live score update (no finalize)
  const updateMatchScore = useCallback(async (matchId: string, homeScore: number, awayScore: number) => {
    await supabase
      .from('matches')
      .update({ home_score: homeScore, away_score: awayScore })
      .eq('id', matchId);
  }, []);

  const updateMatchTime = useCallback(async (matchId: string, time: string) => {
    await supabase
      .from('matches')
      .update({ scheduled_time: time })
      .eq('id', matchId);
  }, []);

  // Finalize playoff match: set played=true, deactivate
  const updatePlayoffMatch = useCallback(async (matchId: string, homeScore: number, awayScore: number) => {
    if (!tournament) return;

    await supabase
      .from('playoff_matches')
      .update({ home_score: homeScore, away_score: awayScore, played: true, active: false })
      .eq('id', matchId);

    const updatedPlayoff = tournament.playoffMatches.map(m =>
      m.id === matchId ? { ...m, homeScore, awayScore, played: true, active: false } : m
    );

    const finishedMatch = updatedPlayoff.find(m => m.id === matchId);

    if (finishedMatch && tournament.playoffFormat === 'bracket') {
      // Bracket propagation
      const winnerId = homeScore > awayScore ? finishedMatch.homeTeamId : finishedMatch.awayTeamId;
      const loserId = homeScore > awayScore ? finishedMatch.awayTeamId : finishedMatch.homeTeamId;

      const setSlot = async (round: number, position: number, isHome: boolean, teamId: string | null) => {
        const target = updatedPlayoff.find(x => x.round === round && x.position === position);
        if (!target || !teamId) return;
        const update = isHome ? { home_team_id: teamId } : { away_team_id: teamId };
        await supabase.from('playoff_matches').update(update).eq('id', target.id);
      };

      if (finishedMatch.round === 10) {
        // Pre-round → QF: standard seeding crossing (0->3, 1->2, 2->1, 3->0)
        // P0 (5v12) feeds QF3 (4th seed)
        // P1 (6v11) feeds QF2 (3rd seed)
        // P2 (7v10) feeds QF1 (2nd seed)
        // P3 (8v9) feeds QF0 (1st seed)
        const qfPosition = 3 - finishedMatch.position;
        await setSlot(4, qfPosition, false, winnerId);
        // Consolation for pre-round losers (round 11)
        if (tournament.playoffConsolationMatches) {
           if (finishedMatch.position === 0) await setSlot(11, 0, true, loserId);
           else if (finishedMatch.position === 3) await setSlot(11, 0, false, loserId);
           else if (finishedMatch.position === 1) await setSlot(11, 1, true, loserId);
           else if (finishedMatch.position === 2) await setSlot(11, 1, false, loserId);
        }
      } else if (finishedMatch.round === 4) {
        // QF → SF: pos0↔SF0(home), pos3↔SF0(away), pos1↔SF1(home), pos2↔SF1(away)
        const map: Record<number, [number, boolean]> = {
          0: [0, true], 3: [0, false], 1: [1, true], 2: [1, false],
        };
        const m = map[finishedMatch.position];
        if (m) await setSlot(3, m[0], m[1], winnerId);

        // Consolation for QF losers (round 5)
        if (tournament.playoffConsolationMatches) {
           if (finishedMatch.position === 0) await setSlot(5, 0, true, loserId);
           else if (finishedMatch.position === 3) await setSlot(5, 0, false, loserId);
           else if (finishedMatch.position === 1) await setSlot(5, 1, true, loserId);
           else if (finishedMatch.position === 2) await setSlot(5, 1, false, loserId);
        }
      } else if (finishedMatch.round === 11) {
        if (tournament.playoffConsolationMatches) {
          await setSlot(12, 0, finishedMatch.position === 0, winnerId);
        }
      } else if (finishedMatch.round === 5) {
        if (tournament.playoffConsolationMatches) {
          await setSlot(6, 0, finishedMatch.position === 0, winnerId);
        }
      } else if (finishedMatch.round === 3) {
        // SF → Final (winners) + 3rd place (losers)
        await setSlot(1, 0, finishedMatch.position === 0, winnerId);
        await setSlot(2, 0, finishedMatch.position === 0, loserId);
      }
    } else if (finishedMatch && finishedMatch.round === 10) {
      // Legacy placement preliminary
      const winnerId = homeScore > awayScore ? finishedMatch.homeTeamId : finishedMatch.awayTeamId;
      const targetMatch = updatedPlayoff.find(m => m.round !== 10 && m.awayTeamId === null);
      if (targetMatch && winnerId) {
        await supabase.from('playoff_matches').update({ away_team_id: winnerId }).eq('id', targetMatch.id);
      }
    }

    const allDone = updatedPlayoff.every(m => m.played);
    if (allDone) {
      await supabase.from('tournaments').update({ phase: 'finished' }).eq('id', tournament.id);
    }
  }, [tournament]);

  // Live score update for playoff (no finalize) — with optimistic update
  const updatePlayoffMatchScore = useCallback(async (matchId: string, homeScore: number, awayScore: number) => {
    if (tournament) {
      setDetailCache(prev => {
        const t = prev[tournament.id];
        if (!t) return prev;
        return { ...prev, [tournament.id]: {
          ...t,
          playoffMatches: t.playoffMatches.map(m =>
            m.id === matchId ? { ...m, homeScore, awayScore } : m
          ),
        }};
      });
    }
    await supabase
      .from('playoff_matches')
      .update({ home_score: homeScore, away_score: awayScore })
      .eq('id', matchId);
  }, [tournament]);

  // Start a playoff match (set active=true) — field-scoped
  const startPlayoffMatch = useCallback(async (matchId: string) => {
    if (!tournament) return;
    const match = tournament.playoffMatches.find(m => m.id === matchId);
    if (!match) return;

    // Optimistic update
    setDetailCache(prev => {
      const t = prev[tournament.id];
      if (!t) return prev;
      return { ...prev, [tournament.id]: {
        ...t,
        playoffMatches: t.playoffMatches.map(m => {
          if (m.id === matchId) return { ...m, active: true };
          if (m.field === match.field && !m.played) return { ...m, active: false };
          return m;
        }),
      }};
    });

    // Only deactivate unplayed matches on the SAME field
    await supabase
      .from('playoff_matches')
      .update({ active: false })
      .eq('tournament_id', tournament.id)
      .eq('field', match.field)
      .eq('played', false);
    // Activate this one
    await supabase
      .from('playoff_matches')
      .update({ active: true })
      .eq('id', matchId);
  }, [tournament]);

  const startPlayoff = useCallback(async (playoffMatches: PlayoffMatch[], phase: string) => {
    if (!tournament) return;

    // Delete any existing playoff matches first to prevent duplicates
    await supabase.from('playoff_matches').delete().eq('tournament_id', tournament.id);

    await supabase.from('playoff_matches').insert(
      playoffMatches.map(pm => ({
        id: pm.id, tournament_id: tournament.id,
        round: pm.round, position: pm.position,
        home_team_id: pm.homeTeamId, away_team_id: pm.awayTeamId,
        home_score: pm.homeScore, away_score: pm.awayScore,
        played: pm.played, field: pm.field, active: pm.active ?? false,
        scheduled_time: pm.scheduledTime || null,
      }))
    );

    await supabase.from('tournaments').update({ phase }).eq('id', tournament.id);
  }, [tournament]);

  const deleteTournament = useCallback(async () => {
    if (!tournament) return;
    await supabase.from('tournaments').delete().eq('id', tournament.id);
    setTournamentList(prev => prev.filter(t => t.id !== tournament.id));
    setDetailCache(prev => { const next = { ...prev }; delete next[tournament.id]; return next; });
    setSelectedId(null);
  }, [tournament]);

  const deleteTeam = useCallback(async (teamId: string) => {
    if (!tournament) return;

    // Delete matches involving this team
    await supabase
      .from('matches')
      .delete()
      .eq('tournament_id', tournament.id)
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);

    // Delete players of this team
    await supabase
      .from('players')
      .delete()
      .eq('team_id', teamId);

    // Delete the team
    await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);

    // Re-index remaining matches
    const { data: remainingMatches } = await supabase
      .from('matches')
      .select('id, match_order')
      .eq('tournament_id', tournament.id)
      .order('match_order');

    if (remainingMatches && remainingMatches.length > 0) {
      // Recalculate times
      const reindexed = remainingMatches.map((m, i) => ({
        id: m.id,
        order: i,
        field: (i % tournament.fieldCount) + 1,
      }));

      // Compute new times
      const [hours, minutes] = tournament.startTime.split(':').map(Number);
      const slotDuration = tournament.matchDurationMinutes + tournament.breakDurationMinutes;

      await Promise.all(
        reindexed.map(m => {
          const slot = Math.floor(m.order / tournament.fieldCount);
          const totalMinutes = hours * 60 + minutes + slot * slotDuration;
          const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
          const min = (totalMinutes % 60).toString().padStart(2, '0');
          return supabase.from('matches').update({
            match_order: m.order,
            field: m.field,
            scheduled_time: `${h}:${min}`,
          }).eq('id', m.id);
        })
      );
    }
  }, [tournament]);

  const addPlayer = useCallback(async (teamId: string, name: string, number: number | null) => {
    if (!tournament) return;
    await supabase.from('players').insert({
      team_id: teamId, tournament_id: tournament.id, name, number,
    });
  }, [tournament]);

  const removePlayer = useCallback(async (playerId: string) => {
    await supabase.from('players').delete().eq('id', playerId);
  }, []);

  const importPlayersCSV = useCallback(async (teamId: string, playersList: { name: string; number: number | null }[]) => {
    if (!tournament) return;
    await supabase.from('players').insert(
      playersList.map(p => ({
        team_id: teamId, tournament_id: tournament.id, name: p.name, number: p.number,
      }))
    );
  }, [tournament]);

  const addScorer = useCallback(async (field: number, pin: string) => {
    if (!tournament) return;
    await supabase.from('scorers').insert({
      tournament_id: tournament.id, field, pin,
    });
  }, [tournament]);

  const removeScorer = useCallback(async (id: string) => {
    await supabase.from('scorers').delete().eq('id', id);
  }, []);

  const reorderMatches = useCallback(async (updates: { id: string; order: number }[]) => {
    if (!tournament) return;
    
    // Update orders and fields
    await Promise.all(
      updates.map(u => {
        const field = (u.order % tournament.fieldCount) + 1;
        return supabase.from('matches').update({ match_order: u.order, field }).eq('id', u.id);
      })
    );

    // Recalculate times for all unplayed matches
    const { data: allMatches } = await supabase
      .from('matches')
      .select('id, match_order, played')
      .eq('tournament_id', tournament.id)
      .order('match_order');

    if (allMatches) {
      const [hours, minutes] = tournament.startTime.split(':').map(Number);
      const slotDuration = tournament.matchDurationMinutes + tournament.breakDurationMinutes;

      await Promise.all(
        allMatches.map(m => {
          const slot = Math.floor(m.match_order / tournament.fieldCount);
          const totalMinutes = hours * 60 + minutes + slot * slotDuration;
          const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
          const min = (totalMinutes % 60).toString().padStart(2, '0');
          return supabase.from('matches').update({
            scheduled_time: `${h}:${min}`,
          }).eq('id', m.id);
        })
      );
    }
  }, [tournament]);

  const startTournament = useCallback(async () => {
    if (!tournament) return;
    
    // Activate the first unplayed match on each field
    const unplayed = tournament.matches
      .filter(m => !m.played)
      .sort((a, b) => a.order - b.order);

    const activatedFields = new Set<number>();
    for (const match of unplayed) {
      if (!activatedFields.has(match.field)) {
        await supabase
          .from('matches')
          .update({ active: true })
          .eq('id', match.id);
        activatedFields.add(match.field);
      }
    }
  }, [tournament]);

  const updateTeamTrainer = useCallback(async (teamId: string, trainer: string) => {
    await supabase.from('teams').update({ trainer: trainer || null }).eq('id', teamId);
  }, []);

  const updateTeamName = useCallback(async (teamId: string, name: string) => {
    if (!tournament) return;
    await supabase.from('teams').update({ name }).eq('id', teamId);
    setDetailCache(prev => {
      const t = prev[tournament.id];
      if (!t) return prev;
      return {
        ...prev,
        [tournament.id]: {
          ...t,
          teams: t.teams.map(team => team.id === teamId ? { ...team, name } : team),
        }
      };
    });
  }, [tournament]);

  const reopenPlayoffMatch = useCallback(async (matchId: string) => {
    if (!tournament) return;
    const match = tournament.playoffMatches.find(m => m.id === matchId);
    if (!match) return;

    // Optimistic update
    setDetailCache(prev => {
      const t = prev[tournament.id];
      if (!t) return prev;
      return { ...prev, [tournament.id]: {
        ...t,
        playoffMatches: t.playoffMatches.map(m => {
          if (m.id === matchId) return { ...m, played: false, active: true };
          if (m.field === match.field && !m.played) return { ...m, active: false };
          return m;
        }),
      }};
    });

    // Deactivate other unplayed matches on same field first
    await supabase
      .from('playoff_matches')
      .update({ active: false })
      .eq('tournament_id', tournament.id)
      .eq('field', match.field)
      .eq('played', false);
    // Reopen this one
    await supabase
      .from('playoff_matches')
      .update({ played: false, active: true })
      .eq('id', matchId);
  }, [tournament]);

  const updatePlayoffStartTime = useCallback(async (time: string | null) => {
    if (!tournament) return;
    await supabase
      .from('tournaments')
      .update({ playoff_start_time: time || null })
      .eq('id', tournament.id);
    // If playoff matches exist, recalculate their times
    if (tournament.playoffMatches.length > 0) {
      const matchDuration = tournament.playoffMatchDurationMinutes ?? tournament.matchDurationMinutes;
      const breakDuration = tournament.playoffBreakDurationMinutes ?? tournament.breakDurationMinutes;
      const slotDuration = matchDuration + breakDuration;
      const { fieldCount } = tournament;

      let playoffStartMinutes: number;
      if (time) {
        const [pH, pM] = time.split(':').map(Number);
        playoffStartMinutes = pH * 60 + pM;
      } else {
        const sortedGroupMatches = [...tournament.matches].sort((a, b) => a.order - b.order);
        const lastGroupMatch = sortedGroupMatches[sortedGroupMatches.length - 1];
        const lastGroupSlot = lastGroupMatch ? Math.floor(lastGroupMatch.order / fieldCount) : -1;
        const [sH, sM] = tournament.startTime.split(':').map(Number);
        const groupSlotDur = tournament.matchDurationMinutes + tournament.breakDurationMinutes;
        playoffStartMinutes = sH * 60 + sM + (lastGroupSlot + 1) * groupSlotDur;
      }

      // Sort matches: preliminary first, then descending round
      const sorted = [...tournament.playoffMatches].sort((a, b) => {
        if (a.round === 10 && b.round !== 10) return -1;
        if (a.round !== 10 && b.round === 10) return 1;
        return b.round - a.round;
      });

      for (let i = 0; i < sorted.length; i++) {
        const slot = Math.floor(i / fieldCount);
        const totalMinutes = playoffStartMinutes + slot * slotDuration;
        const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
        const m = (totalMinutes % 60).toString().padStart(2, '0');
        await supabase.from('playoff_matches').update({ scheduled_time: `${h}:${m}` }).eq('id', sorted[i].id);
      }
    }
  }, [tournament]);

  const shiftMatchTimes = useCallback(async (newStartTime: string) => {
    if (!tournament) return;
    const [oh, om] = tournament.startTime.split(':').map(Number);
    const [nh, nm] = newStartTime.split(':').map(Number);
    const delta = (nh * 60 + nm) - (oh * 60 + om);
    await supabase.from('tournaments').update({ start_time: newStartTime }).eq('id', tournament.id);
    if (delta === 0) return;
    const toUpdate = tournament.matches.filter(m => m.scheduledTime);
    await Promise.all(toUpdate.map(m =>
      supabase.from('matches').update({ scheduled_time: shiftTimeString(m.scheduledTime!, delta) }).eq('id', m.id)
    ));
    // also shift playoff start time reference if set
    if (tournament.playoffStartTime) {
      const newPlayoff = shiftTimeString(tournament.playoffStartTime, delta);
      await supabase.from('tournaments').update({ playoff_start_time: newPlayoff }).eq('id', tournament.id);
      const playoffToUpdate = tournament.playoffMatches.filter(m => m.scheduledTime);
      await Promise.all(playoffToUpdate.map(m =>
        supabase.from('playoff_matches').update({ scheduled_time: shiftTimeString(m.scheduledTime!, delta) }).eq('id', m.id)
      ));
    }
  }, [tournament]);

  const shiftPlayoffTimes = useCallback(async (newPlayoffStartTime: string) => {
    if (!tournament) return;
    if (tournament.playoffMatches.length === 0) return;
    // Determine current reference time
    let refTime = tournament.playoffStartTime;
    if (!refTime) {
      const sorted = [...tournament.playoffMatches]
        .filter(m => m.scheduledTime)
        .sort((a, b) => (a.scheduledTime! < b.scheduledTime! ? -1 : 1));
      refTime = sorted[0]?.scheduledTime || null;
    }
    if (!refTime) {
      await supabase.from('tournaments').update({ playoff_start_time: newPlayoffStartTime }).eq('id', tournament.id);
      return;
    }
    const [oh, om] = refTime.split(':').map(Number);
    const [nh, nm] = newPlayoffStartTime.split(':').map(Number);
    const delta = (nh * 60 + nm) - (oh * 60 + om);
    await supabase.from('tournaments').update({ playoff_start_time: newPlayoffStartTime }).eq('id', tournament.id);
    if (delta === 0) return;
    const toUpdate = tournament.playoffMatches.filter(m => m.scheduledTime);
    await Promise.all(toUpdate.map(m =>
      supabase.from('playoff_matches').update({ scheduled_time: shiftTimeString(m.scheduledTime!, delta) }).eq('id', m.id)
    ));
  }, [tournament]);

  const login = useCallback(async (password: string): Promise<boolean> => {
    if (!tournament) return false;
    try {
      const { data, error } = await supabase.rpc('verify_tournament_password', {
        _tournament_id: tournament.id, _password: password,
      });
      if (error || !data) return false;
      setIsAdmin(true);
      sessionStorage.setItem(ADMIN_KEY, 'true');
      return true;
    } catch {
      return false;
    }
  }, [tournament]);

  const logout = useCallback(() => {
    setIsAdmin(false);
    sessionStorage.removeItem(ADMIN_KEY);
  }, []);

  const setTournament = useCallback((t: Tournament | null) => {
    if (t) setSelectedId(t.id);
    else setSelectedId(null);
  }, []);

  const archiveTournament = useCallback(async (id: string, archived: boolean) => {
    await supabase.from('tournaments').update({ archived }).eq('id', id);
  }, []);

  const regenerateTournament = useCallback(async (input: RegenerateInput) => {
    if (!tournament) return;
    const tid = tournament.id;

    const newGroups: Group[] = generateGroups(input.groupCount);

    const newTeams: Team[] = input.teams.map((row) => {
      const id = row.id ?? crypto.randomUUID();
      let groupId = '';
      if (input.groupCount === 1) {
        groupId = newGroups[0].id;
      } else if (row.groupIndex !== null && row.groupIndex !== undefined) {
        groupId = newGroups[row.groupIndex].id;
      }
      return { id, name: row.name.trim(), groupId };
    });

    if (input.groupCount > 1) {
      const unassigned = newTeams.filter((t) => !t.groupId);
      if (unassigned.length > 0) {
        const distributed = assignTeamsToGroups(unassigned, newGroups);
        unassigned.forEach((t, i) => { t.groupId = distributed[i].groupId; });
      }
    }

    const rawMatches = generateAllMatches(newTeams, newGroups, input.fieldCount, input.roundCount, input.assignFieldsByGroup);
    const newMatches = assignMatchTimes(
      rawMatches, input.startTime, input.matchDurationMinutes,
      input.fieldCount, input.breakDurationMinutes,
    );

    const keptTeamIds = new Set(newTeams.map((t) => t.id));
    const removedTeamIds = tournament.teams.map((t) => t.id).filter((id) => !keptTeamIds.has(id));

    // 1. Delete matches
    await supabase.from('matches').delete().eq('tournament_id', tid);
    await supabase.from('playoff_matches').delete().eq('tournament_id', tid);

    // 2. Insert new groups
    const { error: gErr } = await supabase.from('groups').insert(newGroups.map((g) => ({ id: g.id, tournament_id: tid, name: g.name })));
    if (gErr) console.error('Error inserting groups:', gErr);

    // 3. Upsert teams (updates group_id for kept teams, inserts new teams)
    const { error: tErr } = await supabase.from('teams').upsert(newTeams.map((tm) => ({
      id: tm.id, tournament_id: tid, name: tm.name, group_id: tm.groupId,
    })));
    if (tErr) console.error('Error upserting teams:', tErr);

    // 4. Delete removed teams and their players
    if (removedTeamIds.length > 0) {
      await supabase.from('players').delete().in('team_id', removedTeamIds);
      await supabase.from('teams').delete().in('id', removedTeamIds);
    }

    // 5. Delete old groups
    const newGroupIds = newGroups.map(g => g.id);
    const { error: dgErr } = await supabase.from('groups').delete().eq('tournament_id', tid).not('id', 'in', newGroupIds);
    if (dgErr) console.error('Error deleting old groups:', dgErr);

    await supabase.from('tournaments').update({
      name: input.name.trim(),
      category: input.category.trim(),
      date: input.date,
      field_count: input.fieldCount,
      start_time: input.startTime,
      match_duration_minutes: input.matchDurationMinutes,
      break_duration_minutes: input.breakDurationMinutes,
      round_count: input.roundCount,
      playoff_start_time: input.playoffStartTime || null,
      tiebreaker_rule: input.tiebreakerRule,
      playoff_format: input.playoffFormat,
      playoff_match_duration_minutes: input.playoffMatchDurationMinutes,
      playoff_break_duration_minutes: input.playoffBreakDurationMinutes,
      playoff_consolation_matches: input.playoffConsolationMatches,
      phase: 'group',
    }).eq('id', tid);

    if (input.password && input.password.trim()) {
      await supabase.from('tournaments').update({ password: input.password.trim() }).eq('id', tid);
    }

    // 6. Insert new matches
    if (newMatches.length > 0) {
      const { error: mErr } = await supabase.from('matches').insert(newMatches.map((m) => ({
        id: m.id, tournament_id: tid, group_id: m.groupId,
        home_team_id: m.homeTeamId, away_team_id: m.awayTeamId,
        home_score: null, away_score: null,
        field: m.field, match_order: m.order, played: false,
        scheduled_time: m.scheduledTime, active: false,
      })));
      if (mErr) console.error('Error inserting matches:', mErr);
    }

    await loadTournamentList();
    await loadTournamentDetail(tid);
  }, [tournament, loadTournamentList, loadTournamentDetail]);

  const resetTournament = useCallback(async () => {
    if (!tournament) return;
    const tid = tournament.id;

    const rawMatches = generateAllMatches(
      tournament.teams,
      tournament.groups,
      tournament.fieldCount,
      tournament.roundCount,
      tournament.assignFieldsByGroup
    );
    const newMatches = assignMatchTimes(
      rawMatches, tournament.startTime, tournament.matchDurationMinutes,
      tournament.fieldCount, tournament.breakDurationMinutes,
    );

    await supabase.from('matches').delete().eq('tournament_id', tid);
    await supabase.from('playoff_matches').delete().eq('tournament_id', tid);
    await supabase.from('tournaments').update({ phase: 'group' }).eq('id', tid);

    if (newMatches.length > 0) {
      await supabase.from('matches').insert(newMatches.map((m) => ({
        id: m.id, tournament_id: tid, group_id: m.groupId,
        home_team_id: m.homeTeamId, away_team_id: m.awayTeamId,
        home_score: null, away_score: null,
        field: m.field, match_order: m.order, played: false,
        scheduled_time: m.scheduledTime, active: false,
      })));
    }

    await loadTournamentDetail(tid);
  }, [tournament, loadTournamentDetail]);

  return (
    <TournamentContext.Provider value={{
      tournaments: isAdmin ? allTournaments : allTournaments.filter(t => !t.archived), allTournaments, tournament, players, scorers, loading,
      selectTournament, setTournament, saveTournament,
      updateMatch, updateMatchScore, updateMatchTime, updatePlayoffMatch, updatePlayoffMatchScore, startPlayoffMatch, startPlayoff,
      deleteTournament, deleteTeam, updateTeamTrainer, updateTeamName, reopenPlayoffMatch,
      addPlayer, removePlayer, importPlayersCSV,
      addScorer, removeScorer, reorderMatches, startTournament, updatePlayoffStartTime, shiftMatchTimes, shiftPlayoffTimes,
      archiveTournament, regenerateTournament, resetTournament, isAdmin, login, logout
    }}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error('useTournament must be used within TournamentProvider');
  return ctx;
}
