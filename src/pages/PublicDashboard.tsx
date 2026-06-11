import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTournament } from "@/contexts/TournamentContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GroupStandings from "@/components/tournament/GroupStandings";
import MatchList from "@/components/tournament/MatchList";
import PlayoffBracket from "@/components/tournament/PlayoffBracket";
import TeamRosters from "@/components/tournament/TeamRosters";
import { getWinner, getTeamName, getPlayoffPreview } from "@/utils/tournament";
import { Trophy, RefreshCw, Users, X } from "lucide-react";
import logo from "@/assets/logo_academy.svg";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function PublicDashboard() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { tournaments, tournament, players, loading, selectTournament } = useTournament();
  const [filterTeamId, setFilterTeamId] = useState<string | null>(() => {
    if (tournamentId) {
      return localStorage.getItem(`followTeam_${tournamentId}`);
    }
    return null;
  });
  const [teamSheetOpen, setTeamSheetOpen] = useState(false);

  useEffect(() => {
    if (tournamentId) {
      selectTournament(tournamentId);
      const saved = localStorage.getItem(`followTeam_${tournamentId}`);
      setFilterTeamId(saved);
    }
  }, [tournamentId, selectTournament]);

  // Persist team filter to localStorage
  useEffect(() => {
    if (tournamentId && filterTeamId) {
      localStorage.setItem(`followTeam_${tournamentId}`, filterTeamId);
    } else if (tournamentId) {
      localStorage.removeItem(`followTeam_${tournamentId}`);
    }
  }, [filterTeamId, tournamentId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Načítám turnaj...</p>
        </div>
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="text-center space-y-4">
          <img src={logo} alt="Academy logo" className="h-80 w-80 mx-auto" />
          <h1 className="text-2xl font-bold">Žádný aktivní turnaj</h1>
          <p className="text-muted-foreground">Turnaj zatím nebyl vytvořen.</p>
        </div>
      </div>
    );
  }

  const categories = tournaments.filter(t => !t.archived).map((t) => ({ id: t.id, name: t.name, category: t.category }));
  const showSwitcher = categories.length > 1;

  const winnerId = tournament ? getWinner(tournament) : null;
  const hasPlayoff = tournament ? tournament.playoffMatches.length > 0 : false;

  const filterTeamName = filterTeamId ? tournament?.teams.find((t) => t.id === filterTeamId)?.name || null : null;

  const rosterTeams = filterTeamId
    ? tournament?.teams.filter((t) => t.id === filterTeamId) || []
    : tournament?.teams || [];

  const rosterPlayers = filterTeamId ? players.filter((p) => p.teamId === filterTeamId) : players;

  // For team filter: only show groups the selected team belongs to
  const filteredGroups = filterTeamId
    ? tournament?.groups.filter((g) => tournament.teams.some((t) => t.id === filterTeamId && t.groupId === g.id)) || []
    : tournament?.groups || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-4xl px-4 py-3 flex flex-col items-center gap-1">
          <img src={logo} alt="Academy logo" className="h-16 w-auto" />
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold leading-tight text-center">{tournament?.name || "Turnaj"}</h1>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3 animate-spin" style={{ animationDuration: "3s" }} />
              Live
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {tournament?.date}
            {tournament?.category && tournament?.date && <span> · </span>}
            {tournament?.category && <span>— {tournament.category}</span>}
          </p>
        </div>
      </header>

      {/* Category switcher */}
      {showSwitcher && (
        <div className="border-b bg-card/50">
          <div className="mx-auto max-w-4xl px-4 py-2 flex gap-2 overflow-x-auto">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  selectTournament(c.id);
                  navigate(`/dashboard/${c.id}`);
                }}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  tournament?.id === c.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {c.category || c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {tournament && (
        <main className="mx-auto max-w-4xl p-4 space-y-4">
          {/* Team filter button */}
          {filterTeamId ? (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    Sledujete: <strong>{filterTeamName}</strong>
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setFilterTeamId(null)}>
                  <X className="h-4 w-4 mr-1" />
                  Zobrazit vše
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Sheet open={teamSheetOpen} onOpenChange={setTeamSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full py-6 text-base gap-3">
                  <Users className="h-5 w-5" />
                  Sledujte svůj tým
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[70vh] flex flex-col">
                <SheetHeader>
                  <SheetTitle>Vyberte svůj tým</SheetTitle>
                </SheetHeader>
                <div className="grid gap-2 mt-4 overflow-y-auto flex-1 min-h-0 pb-4">
                  {tournament.teams.map((team) => (
                    <Button
                      key={team.id}
                      variant="outline"
                      className="justify-start text-left py-4 text-base"
                      onClick={() => {
                        setFilterTeamId(team.id);
                        setTeamSheetOpen(false);
                      }}
                    >
                      {team.name}
                    </Button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          )}

          {winnerId && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex items-center justify-center gap-3 py-6">
                <Trophy className="h-10 w-10 text-primary" />
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">🎉 Vítěz turnaje 🎉</p>
                  <p className="text-2xl font-bold">{getTeamName(tournament.teams, winnerId)}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="standings" key={tournament.id}>
            <TabsList className="w-full">
              <TabsTrigger value="standings" className="flex-1">
                Tabulky
              </TabsTrigger>
              <TabsTrigger value="matches" className="flex-1">
                Zápasy
              </TabsTrigger>
              <TabsTrigger value="playoff" className="flex-1">
                Playoff
              </TabsTrigger>
              <TabsTrigger value="rosters" className="flex-1">
                Soupisky
              </TabsTrigger>
            </TabsList>

            <TabsContent value="standings" className="space-y-4 mt-4">
              {filteredGroups.map((group) => (
                <GroupStandings key={group.id} group={group} matches={tournament.matches} teams={tournament.teams} tiebreakerRule={tournament.tiebreakerRule} />
              ))}
            </TabsContent>

            <TabsContent value="matches" className="space-y-4 mt-4">
              <MatchList
                matches={tournament.matches}
                teams={tournament.teams}
                groups={tournament.groups}
                isAdmin={false}
                filterTeamId={filterTeamId}
              />
            </TabsContent>

            <TabsContent value="playoff" className="mt-4">
              {hasPlayoff ? (
                <PlayoffBracket playoffMatches={tournament.playoffMatches} teams={tournament.teams} isAdmin={false} playoffFormat={tournament.playoffFormat} />
              ) : (
                <PlayoffBracket playoffMatches={getPlayoffPreview(tournament)} teams={tournament.teams} isAdmin={false} isPreview playoffFormat={tournament.playoffFormat} />
              )}
            </TabsContent>

            <TabsContent value="rosters" className="mt-4">
              <TeamRosters teams={rosterTeams} players={rosterPlayers} isAdmin={false} />
            </TabsContent>
          </Tabs>
        </main>
      )}
    </div>
  );
}
