import { useMemo } from 'react';
import { Tournament } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Shield, TrendingUp, Target, Swords, AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getTeamName } from '@/utils/tournament';

interface TeamStats {
  teamId: string;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export default function TournamentStats({ tournament }: { tournament: Tournament }) {
  const stats = useMemo(() => {
    const map = new Map<string, TeamStats>();
    
    // Initialize map
    tournament.teams.forEach(t => {
      map.set(t.id, {
        teamId: t.id,
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      });
    });

    const allMatches = [
      ...tournament.matches,
      ...(tournament.playoffMatches || [])
    ].filter(m => m.played && m.homeTeamId && m.awayTeamId && m.homeScore !== null && m.awayScore !== null);

    allMatches.forEach(m => {
      const home = map.get(m.homeTeamId!);
      const away = map.get(m.awayTeamId!);
      if (!home || !away) return;

      const hScore = m.homeScore!;
      const aScore = m.awayScore!;

      // Update goals and matches played
      home.goalsFor += hScore;
      home.goalsAgainst += aScore;
      home.matchesPlayed += 1;
      
      away.goalsFor += aScore;
      away.goalsAgainst += hScore;
      away.matchesPlayed += 1;

      // Update win/loss/draw
      if (hScore > aScore) {
        home.wins += 1;
        home.points += 3;
        away.losses += 1;
      } else if (hScore < aScore) {
        away.wins += 1;
        away.points += 3;
        home.losses += 1;
      } else {
        home.draws += 1;
        home.points += 1;
        away.draws += 1;
        away.points += 1;
      }
    });

    // Calculate goal differences and convert to array
    const arr = Array.from(map.values()).map(s => ({
      ...s,
      goalDifference: s.goalsFor - s.goalsAgainst
    }));

    // Sort by overall performance (Points -> GD -> Goals For)
    return arr.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

  }, [tournament]);

  // If no matches have been played yet
  if (stats.length === 0 || stats.every(s => s.matchesPlayed === 0)) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground bg-card rounded-lg border border-dashed">
        <AlertCircle className="h-10 w-10 mb-4 opacity-30" />
        <h3 className="text-lg font-medium text-foreground mb-1">Zatím nebyly odehrány žádné zápasy</h3>
        <p className="text-sm max-w-sm mx-auto">
          Jakmile zadáte první výsledky do systému, na tomto místě se začnou generovat automatické statistiky a žebříčky týmů.
        </p>
      </div>
    );
  }

  // Find highlights
  const mostGoals = [...stats].sort((a, b) => b.goalsFor - a.goalsFor)[0];
  const leastGoals = [...stats].filter(s => s.matchesPlayed > 0).sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0];
  const mostWins = [...stats].sort((a, b) => b.wins - a.wins)[0];
  const bestDiff = [...stats].sort((a, b) => b.goalDifference - a.goalDifference)[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nejlepší ofenzíva</CardTitle>
            <Trophy className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate" title={getTeamName(tournament.teams, mostGoals.teamId)}>
              {getTeamName(tournament.teams, mostGoals.teamId)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {mostGoals.goalsFor} vstřelených gólů
            </p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/5 border-emerald-500/20 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nejlepší defenzíva</CardTitle>
            <Shield className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate" title={getTeamName(tournament.teams, leastGoals?.teamId || '')}>
              {leastGoals ? getTeamName(tournament.teams, leastGoals.teamId) : '-'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {leastGoals ? `Jen ${leastGoals.goalsAgainst} inkasovaných gólů` : '-'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/5 border-blue-500/20 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nejlepší skóre</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate" title={getTeamName(tournament.teams, bestDiff.teamId)}>
              {getTeamName(tournament.teams, bestDiff.teamId)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Rozdíl {bestDiff.goalDifference > 0 ? '+' : ''}{bestDiff.goalDifference}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/5 border-amber-500/20 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nejvíce výher</CardTitle>
            <Target className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate" title={getTeamName(tournament.teams, mostWins.teamId)}>
              {getTeamName(tournament.teams, mostWins.teamId)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {mostWins.wins} vítězných zápasů
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Swords className="h-5 w-5 text-muted-foreground" />
            Celkové statistiky (včetně Playoff)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[50px] text-center">#</TableHead>
                  <TableHead>Tým</TableHead>
                  <TableHead className="text-center" title="Odehrané zápasy">Z</TableHead>
                  <TableHead className="text-center text-emerald-700 dark:text-emerald-400" title="Výhry">V</TableHead>
                  <TableHead className="text-center text-amber-700 dark:text-amber-400" title="Remízy">R</TableHead>
                  <TableHead className="text-center text-rose-700 dark:text-rose-400" title="Prohry">P</TableHead>
                  <TableHead className="text-center" title="Vstřelené góly">VG</TableHead>
                  <TableHead className="text-center" title="Obdržené góly">OG</TableHead>
                  <TableHead className="text-center" title="Rozdíl skóre">+/-</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((team, index) => (
                  <TableRow key={team.teamId} className="transition-colors hover:bg-muted/50">
                    <TableCell className="text-center font-medium text-muted-foreground">
                      {index + 1}.
                    </TableCell>
                    <TableCell className="font-medium">
                      {getTeamName(tournament.teams, team.teamId)}
                    </TableCell>
                    <TableCell className="text-center">{team.matchesPlayed}</TableCell>
                    <TableCell className="text-center text-emerald-600 dark:text-emerald-500 font-medium">
                      {team.wins}
                    </TableCell>
                    <TableCell className="text-center text-amber-600 dark:text-amber-500 font-medium">
                      {team.draws}
                    </TableCell>
                    <TableCell className="text-center text-rose-600 dark:text-rose-500 font-medium">
                      {team.losses}
                    </TableCell>
                    <TableCell className="text-center">{team.goalsFor}</TableCell>
                    <TableCell className="text-center">{team.goalsAgainst}</TableCell>
                    <TableCell className={`text-center font-bold ${
                      team.goalDifference > 0 ? 'text-emerald-600 dark:text-emerald-500' :
                      team.goalDifference < 0 ? 'text-rose-600 dark:text-rose-500' : 'text-muted-foreground'
                    }`}>
                      {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
