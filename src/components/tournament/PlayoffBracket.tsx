import { useState } from 'react';
import { PlayoffMatch, Team } from '@/types/tournament';
import { getTeamName, getFieldColorClass } from '@/utils/tournament';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Check, Trophy, Play, Minus, Pencil, Clock } from 'lucide-react';

interface Props {
  playoffMatches: PlayoffMatch[];
  teams: Team[];
  onUpdateScore?: (matchId: string, homeScore: number, awayScore: number) => void;
  onUpdateMatchScore?: (matchId: string, homeScore: number, awayScore: number) => void;
  onStartPlayoffMatch?: (matchId: string) => void;
  onReopenMatch?: (matchId: string) => void;
  isAdmin: boolean;
  isPreview?: boolean;
}

export default function PlayoffBracket({ playoffMatches, teams, onUpdateScore, onUpdateMatchScore, onStartPlayoffMatch, onReopenMatch, isAdmin, isPreview = false }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');

  const preliminary = playoffMatches.filter(m => m.round === 10).sort((a, b) => a.position - b.position);
  const getSortValue = (round: number) => {
    if (round === 11) return 9.5;
    if (round === 5) return 3.5;
    return round;
  };
  const placements = playoffMatches.filter(m => m.round !== 10).sort((a, b) => {
    const rDiff = getSortValue(b.round) - getSortValue(a.round);
    if (rDiff !== 0) return rDiff;
    return a.position - b.position;
  });

  const startEdit = (match: PlayoffMatch) => {
    setEditingId(match.id);
    setHomeScore(match.homeScore?.toString() || '0');
    setAwayScore(match.awayScore?.toString() || '0');
  };

  // Save score without finalizing (live update)
  const saveScore = (matchId: string) => {
    const h = parseInt(homeScore);
    const a = parseInt(awayScore);
    if (!isNaN(h) && !isNaN(a) && h >= 0 && a >= 0 && onUpdateMatchScore) {
      onUpdateMatchScore(matchId, h, a);
    }
  };

  // Confirm/finalize match
  const confirmMatch = (matchId: string) => {
    const h = parseInt(homeScore);
    const a = parseInt(awayScore);
    if (!isNaN(h) && !isNaN(a) && h >= 0 && a >= 0 && h !== a && onUpdateScore) {
      onUpdateScore(matchId, h, a);
      setEditingId(null);
    }
  };

  const quickGoal = (matchId: string, side: 'home' | 'away', delta: number) => {
    const match = playoffMatches.find(m => m.id === matchId);
    if (!match || !onUpdateMatchScore) return;
    const newHome = Math.max(0, (match.homeScore ?? 0) + (side === 'home' ? delta : 0));
    const newAway = Math.max(0, (match.awayScore ?? 0) + (side === 'away' ? delta : 0));
    onUpdateMatchScore(matchId, newHome, newAway);
  };

  const canEdit = (match: PlayoffMatch) => {
    return !isPreview && isAdmin && match.homeTeamId && match.awayTeamId && !match.played;
  };

  const canStart = (match: PlayoffMatch) => {
    return !isPreview && isAdmin && match.homeTeamId && match.awayTeamId && !match.played && !match.active && onStartPlayoffMatch;
  };

  const renderMatchCard = (match: PlayoffMatch) => {
    const homeName = getTeamName(teams, match.homeTeamId);
    const awayName = getTeamName(teams, match.awayTeamId);
    const isLive = match.active && !match.played;
    const winnerId = match.played && match.homeScore !== null && match.awayScore !== null
      ? (match.homeScore > match.awayScore ? match.homeTeamId : match.awayTeamId)
      : null;

    const label = match.label || (match.round === 10 ? 'Předkolo' : `O ${(match.round - 1) * 2 + 1}.-${(match.round - 1) * 2 + 2}. místo`);
    const icon = match.round === 1 ? '🏆 ' : match.round === 2 ? '🥉 ' : '';

    return (
      <div key={match.id} className={`rounded-xl border p-3 space-y-2 w-full transition-colors ${
        isLive ? 'border-primary bg-primary/10 ring-1 ring-primary/30' : 'bg-card'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">{icon}{label}</Badge>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${getFieldColorClass(match.field)}`}>
              Hř. {match.field}
            </span>
            {match.scheduledTime && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {match.scheduledTime}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {match.played && <Badge className="text-xs bg-primary/10 text-primary border-0">Dokončeno</Badge>}
          </div>
        </div>

        <div className="space-y-1">
          <div className={`flex items-center justify-between rounded-lg p-2 ${winnerId === match.homeTeamId ? 'bg-primary/10 font-bold' : 'bg-muted/50'}`}>
            <span className="text-sm">{homeName}</span>
            {isLive && !match.played && (match.homeScore !== null) && (
              <div className="flex items-center gap-1">
                {isAdmin && onUpdateMatchScore && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => quickGoal(match.id, 'home', -1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                )}
                <span className="text-sm font-bold">{match.homeScore}</span>
              </div>
            )}
            {match.played && match.homeScore !== null && <span className="text-sm font-bold">{match.homeScore}</span>}
          </div>
          <div className={`flex items-center justify-between rounded-lg p-2 ${winnerId === match.awayTeamId ? 'bg-primary/10 font-bold' : 'bg-muted/50'}`}>
            <span className="text-sm">{awayName}</span>
            {isLive && !match.played && (match.awayScore !== null) && (
              <div className="flex items-center gap-1">
                {isAdmin && onUpdateMatchScore && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => quickGoal(match.id, 'away', -1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                )}
                <span className="text-sm font-bold">{match.awayScore}</span>
              </div>
            )}
            {match.played && match.awayScore !== null && <span className="text-sm font-bold">{match.awayScore}</span>}
          </div>
        </div>

        {editingId === match.id && (
          <div className="flex items-center gap-2 pt-1">
            <Input type="number" min="0" className="w-16 text-center h-8" value={homeScore} onChange={e => setHomeScore(e.target.value)} />
            <span className="text-sm font-medium">:</span>
            <Input type="number" min="0" className="w-16 text-center h-8" value={awayScore} onChange={e => setAwayScore(e.target.value)} />
            <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => saveScore(match.id)}>
              Skóre
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={() => confirmMatch(match.id)}>
              Potvrdit
            </Button>
          </div>
        )}

        {canStart(match) && (
          <Button variant="outline" size="sm" className="w-full border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => onStartPlayoffMatch!(match.id)}>
            <Play className="h-3 w-3 mr-1" /> Spustit zápas
          </Button>
        )}

        {canEdit(match) && editingId !== match.id && (
          <Button variant="outline" size="sm" className="w-full" onClick={() => startEdit(match)}>
            Zadat skóre
          </Button>
        )}

        {match.played && isAdmin && onReopenMatch && editingId !== match.id && (
          <Button variant="outline" size="sm" className="w-full text-muted-foreground" onClick={() => {
            if (window.confirm('Opravdu chcete znovu otevřít tento zápas pro úpravu výsledku?')) {
              onReopenMatch(match.id);
            }
          }}>
            <Pencil className="h-3 w-3 mr-1" /> Upravit výsledek
          </Button>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4" />
          Playoff
        </CardTitle>
      </CardHeader>
      <CardContent>
        {playoffMatches.length > 0 ? (
          <div className="space-y-4 max-w-md mx-auto">
            {isPreview && (
              <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  Předběžný rozpis playoff. Týmy budou doplněny po dokončení skupin.
                </p>
              </div>
            )}
            {preliminary.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Předkolo</p>
                {preliminary.map(m => renderMatchCard(m))}
              </div>
            )}
            <div className="space-y-3">
              {placements.map(m => renderMatchCard(m))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Playoff bude vygenerován po dokončení skupinové fáze.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
