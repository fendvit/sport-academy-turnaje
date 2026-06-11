import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTournament } from '@/contexts/TournamentContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GroupStandings from '@/components/tournament/GroupStandings';
import MatchList from '@/components/tournament/MatchList';
import PlayoffBracket from '@/components/tournament/PlayoffBracket';
import TeamRosters from '@/components/tournament/TeamRosters';
import { getWinner, getTeamName } from '@/utils/tournament';
import { Trophy } from 'lucide-react';
import logo from '@/assets/logo_academy.svg';
import { Card, CardContent } from '@/components/ui/card';

export default function ScorerDashboard() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { tournaments, players, loading, selectTournament, tournament, updateMatch, updateMatchScore, updateMatchTime, updatePlayoffMatch, updatePlayoffMatchScore, startPlayoffMatch, reopenPlayoffMatch } = useTournament();
  const [scorerField, setScorerField] = useState<number | null>(null);
  const [scorerTournamentId, setScorerTournamentId] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!token) return;
    const stored = sessionStorage.getItem(`scorer_${token}`);
    if (stored !== 'true') {
      navigate(`/scorer/${token}`, { replace: true });
      return;
    }

    supabase.from('scorers').select('field, tournament_id').eq('token', token).maybeSingle().then(({ data }) => {
      if (!data) {
        navigate(`/scorer/${token}`, { replace: true });
        return;
      }
      setScorerField(data.field);
      setScorerTournamentId(data.tournament_id);
      setVerified(true);
    });
  }, [token, navigate]);

  useEffect(() => {
    if (scorerTournamentId && !loading) {
      selectTournament(scorerTournamentId);
    }
  }, [scorerTournamentId, loading, selectTournament]);

  if (!verified || loading || !tournament || scorerField === null) return null;

  const hasPlayoff = tournament.playoffMatches.length > 0;
  const winnerId = getWinner(tournament);

  const fieldMatches = tournament.matches.filter(m => m.field === scorerField);
  const fieldPlayoffMatches = tournament.playoffMatches.filter(m => m.field === scorerField);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Academy logo" className="h-12 w-12" />
            <div>
              <h1 className="text-lg font-bold leading-tight">
                {tournament.name}
                {tournament.category && (
                  <span className="ml-2 inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{tournament.category}</span>
                )}
              </h1>
              <p className="text-xs text-muted-foreground">Hřiště {scorerField} • {tournament.date}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-4 space-y-4">
        {winnerId && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center gap-3 py-4">
              <Trophy className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vítěz turnaje</p>
                <p className="text-xl font-bold">{getTeamName(tournament.teams, winnerId)} 🎉</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="matches" key={tournament.id}>
          <TabsList className="w-full">
            <TabsTrigger value="matches" className="flex-1">Zápasy</TabsTrigger>
            <TabsTrigger value="standings" className="flex-1">Tabulky</TabsTrigger>
            {hasPlayoff && <TabsTrigger value="playoff" className="flex-1">Playoff</TabsTrigger>}
            <TabsTrigger value="rosters" className="flex-1">Soupisky</TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="space-y-4 mt-4">
            <MatchList
              matches={fieldMatches}
              teams={tournament.teams}
              groups={tournament.groups}
              onUpdateScore={(id, h, a) => updateMatch(id, h, a)}
              onUpdateMatchScore={(id, h, a) => updateMatchScore(id, h, a)}
              onUpdateTime={(matchId, time) => updateMatchTime(matchId, time)}
              isAdmin
            />
          </TabsContent>

          <TabsContent value="standings" className="space-y-4 mt-4">
            {tournament.groups.map(group => (
              <GroupStandings
                key={group.id}
                group={group}
                matches={tournament.matches}
                teams={tournament.teams}
                tiebreakerRule={tournament.tiebreakerRule}
              />
            ))}
          </TabsContent>

          {hasPlayoff && (
            <TabsContent value="playoff" className="mt-4">
              <PlayoffBracket
                playoffMatches={fieldPlayoffMatches}
                teams={tournament.teams}
                onUpdateScore={(id, h, a) => updatePlayoffMatch(id, h, a)}
                onUpdateMatchScore={(id, h, a) => updatePlayoffMatchScore(id, h, a)}
                onStartPlayoffMatch={(id) => startPlayoffMatch(id)}
                onReopenMatch={(id) => reopenPlayoffMatch(id)}
                isAdmin
                playoffFormat={tournament.playoffFormat}
              />
            </TabsContent>
          )}

          <TabsContent value="rosters" className="mt-4">
            <TeamRosters
              teams={tournament.teams}
              players={players}
              isAdmin={false}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
