import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '@/contexts/TournamentContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import GroupStandings from '@/components/tournament/GroupStandings';
import MatchList from '@/components/tournament/MatchList';
import PlayoffBracket from '@/components/tournament/PlayoffBracket';
import QRCodeDisplay from '@/components/tournament/QRCodeDisplay';
import TeamRosters from '@/components/tournament/TeamRosters';
import TournamentExport from '@/components/tournament/TournamentExport';
import TournamentSettingsDialog from '@/components/tournament/TournamentSettingsDialog';
import ScorerManager from '@/components/tournament/ScorerManager';
import TournamentStats from '@/components/tournament/TournamentStats';
import { generatePlayoffBracket, isGroupPhaseComplete, getWinner, getTeamName, getPlayoffPreview } from '@/utils/tournament';
import { LogOut, Trophy, AlertCircle, Clock, Check, Archive, ArchiveRestore } from 'lucide-react';
import { Input } from '@/components/ui/input';
import logo from '@/assets/logo_academy.svg';
import { Card, CardContent } from '@/components/ui/card';

export default function AdminDashboard() {
  const { tournaments, tournament, players, loading, updateMatch, updateMatchScore, updateMatchTime, updatePlayoffMatch, updatePlayoffMatchScore, startPlayoffMatch, startPlayoff, deleteTournament, deleteTeam, updateTeamTrainer, reopenPlayoffMatch, isAdmin, logout, addPlayer, removePlayer, importPlayersCSV, reorderMatches, startTournament, updatePlayoffStartTime, selectTournament, archiveTournament } = useTournament();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!isAdmin || !tournament)) {
      navigate('/admin');
    }
  }, [isAdmin, tournament, navigate, loading]);

  const [playoffTime, setPlayoffTime] = useState(tournament?.playoffStartTime || '');
  const playoffTimeSynced = useRef(false);

  useEffect(() => {
    if (tournament && !playoffTimeSynced.current) {
      setPlayoffTime(tournament.playoffStartTime || '');
      playoffTimeSynced.current = true;
    }
  }, [tournament]);

  useEffect(() => {
    if (tournament) {
      setPlayoffTime(tournament.playoffStartTime || '');
    }
  }, [tournament?.playoffStartTime]);

  if (loading || !tournament) return null;

  const groupComplete = isGroupPhaseComplete(tournament);
  const hasPlayoff = tournament.playoffMatches.length > 0;
  const winnerId = getWinner(tournament);

  const handleStartPlayoff = async () => {
    const playoffMatches = generatePlayoffBracket(tournament);
    await startPlayoff(playoffMatches, 'playoff');
  };

  const handleResetTournament = async () => {
    if (window.confirm('Opravdu chcete smazat turnaj? Tato akce je nevratná.')) {
      await deleteTournament();
      navigate('/admin');
    }
  };

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
              <p className="text-xs text-muted-foreground">{tournament.date}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TournamentExport tournament={tournament} players={players} />
            <QRCodeDisplay tournamentId={tournament.id} />
            <TournamentSettingsDialog tournament={tournament} />
            <Button variant="ghost" size="icon" onClick={() => { logout(); navigate('/admin'); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {tournaments.filter(t => !t.archived).length > 1 && (
        <div className="border-b bg-card/50">
          <div className="mx-auto max-w-4xl px-4 py-2 flex gap-2 overflow-x-auto">
            {tournaments.filter(t => !t.archived).map(t => (
              <button
                key={t.id}
                onClick={() => selectTournament(t.id)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  tournament?.id === t.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {t.category || t.name}
              </button>
            ))}
          </div>
        </div>
      )}

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

        {groupComplete && !hasPlayoff && (
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-accent" />
                <span className="font-medium">Skupinová fáze dokončena!</span>
              </div>
              <Button onClick={handleStartPlayoff}>
                <Trophy className="mr-2 h-4 w-4" />
                Spustit playoff
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue={hasPlayoff ? 'playoff' : 'matches'} key={tournament.id}>
          <TabsList className="w-full">
            <TabsTrigger value="matches" className="flex-1">Zápasy</TabsTrigger>
            <TabsTrigger value="standings" className="flex-1">Tabulky</TabsTrigger>
            <TabsTrigger value="playoff" className="flex-1">Playoff</TabsTrigger>
            <TabsTrigger value="stats" className="flex-1">Statistiky</TabsTrigger>
            <TabsTrigger value="rosters" className="flex-1">Soupisky</TabsTrigger>
            <TabsTrigger value="scorers" className="flex-1">Zapisovatelé</TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="space-y-4 mt-4">
            <MatchList
              matches={tournament.matches}
              teams={tournament.teams}
              groups={tournament.groups}
              fieldCount={tournament.fieldCount}
              onUpdateScore={(id, h, a) => updateMatch(id, h, a)}
              onUpdateMatchScore={(id, h, a) => updateMatchScore(id, h, a)}
              onUpdateTime={(matchId, time) => updateMatchTime(matchId, time)}
              onReorderMatches={reorderMatches}
              onStartTournament={startTournament}
              isAdmin
            />
            <Card>
              <CardContent className="flex items-center gap-3 py-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Začátek playoff:</span>
                <Input
                  type="time"
                  className="w-32 h-8"
                  value={playoffTime}
                  onChange={(e) => setPlayoffTime(e.target.value)}
                  placeholder="Automaticky"
                />
                <Button
                  size="sm"
                  onClick={() => updatePlayoffStartTime(playoffTime || null)}
                  disabled={playoffTime === (tournament.playoffStartTime || '')}
                >
                  <Check className="mr-1 h-3 w-3" />
                  Potvrdit
                </Button>
                {(playoffTime || tournament.playoffStartTime) && (
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => { setPlayoffTime(''); updatePlayoffStartTime(null); }}>
                    Automaticky
                  </Button>
                )}
              </CardContent>
            </Card>
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

          <TabsContent value="playoff" className="mt-4 space-y-4">
            {hasPlayoff ? (
              <PlayoffBracket
                playoffMatches={tournament.playoffMatches}
                teams={tournament.teams}
                onUpdateScore={(id, h, a) => updatePlayoffMatch(id, h, a)}
                onUpdateMatchScore={(id, h, a) => updatePlayoffMatchScore(id, h, a)}
                onStartPlayoffMatch={(id) => startPlayoffMatch(id)}
                onReopenMatch={(id) => reopenPlayoffMatch(id)}
                isAdmin
                playoffFormat={tournament.playoffFormat}
              />
            ) : (
              <PlayoffBracket
                playoffMatches={getPlayoffPreview(tournament)}
                teams={tournament.teams}
                isAdmin={false}
                isPreview
                playoffFormat={tournament.playoffFormat}
              />
            )}
          </TabsContent>

          <TabsContent value="stats" className="mt-4">
            <TournamentStats tournament={tournament} />
          </TabsContent>

          <TabsContent value="rosters" className="mt-4">
            <TeamRosters
              teams={tournament.teams}
              players={players}
              isAdmin
              onAddPlayer={addPlayer}
              onRemovePlayer={removePlayer}
              onImportCSV={importPlayersCSV}
              onDeleteTeam={deleteTeam}
              onUpdateTrainer={updateTeamTrainer}
            />
          </TabsContent>

          <TabsContent value="scorers" className="mt-4">
            <ScorerManager />
          </TabsContent>
        </Tabs>

        <div className="pt-8 text-center space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => archiveTournament(tournament.id, !tournament.archived)}
          >
            {tournament.archived ? (
              <><ArchiveRestore className="mr-2 h-4 w-4" />Obnovit z archivu</>
            ) : (
              <><Archive className="mr-2 h-4 w-4" />Archivovat turnaj</>
            )}
          </Button>
          <div>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={handleResetTournament}>
              Smazat turnaj
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
