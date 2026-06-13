import { useRef, useState } from 'react';
import { Tournament, Player, PlayoffMatch } from '@/types/tournament';

import { calculateStandings, getTeamName, getPlayoffPreview } from '@/utils/tournament';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
  tournament: Tournament;
  players: Player[];
}

type ExportMode = 'standings' | 'playoff' | 'schedule';

export default function TournamentExport({ tournament, players }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<ExportMode>('standings');

  const doExport = async (exportMode: ExportMode) => {
    setMode(exportMode);
    await new Promise(r => setTimeout(r, 100));
    if (!ref.current) return;
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(ref.current, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
    });
    const link = document.createElement('a');
    const suffixMap = { standings: 'tabulky', playoff: 'playoff', schedule: 'rozpis' };
    link.download = `${tournament.name.replace(/\s+/g, '_')}_${suffixMap[exportMode]}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const firstPlaceMatch = tournament.playoffMatches.find(m => m.round === 1 && m.played);
  const secondPlaceMatch = tournament.playoffMatches.find(m => m.round === 2 && m.played);

  const winnerId = firstPlaceMatch && firstPlaceMatch.homeScore !== null && firstPlaceMatch.awayScore !== null
    ? (firstPlaceMatch.homeScore > firstPlaceMatch.awayScore ? firstPlaceMatch.homeTeamId : firstPlaceMatch.awayTeamId) : null;
  const runnerId = firstPlaceMatch && firstPlaceMatch.homeScore !== null && firstPlaceMatch.awayScore !== null
    ? (firstPlaceMatch.homeScore > firstPlaceMatch.awayScore ? firstPlaceMatch.awayTeamId : firstPlaceMatch.homeTeamId) : null;
  const thirdId = secondPlaceMatch && secondPlaceMatch.homeScore !== null && secondPlaceMatch.awayScore !== null
    ? (secondPlaceMatch.homeScore > secondPlaceMatch.awayScore ? secondPlaceMatch.homeTeamId : secondPlaceMatch.awayTeamId) : null;

  const hasPlayoff = tournament.playoffMatches.length > 0;
  const sortedMatches = [...tournament.matches].sort((a, b) => a.order - b.order);

  // Pre-process playoff labels to rename consolations to Playdown
  let consIndex = 1;
  const playoffWithLabels = (hasPlayoff ? [...tournament.playoffMatches] : getPlayoffPreview(tournament))
    .map(m => {
      if (m.round === 12 || m.round === 6) {
        return { ...m, label: 'Finále Playdown' };
      }
      if (m.round === 11 || m.round === 5) {
        return { ...m, label: `Playdown ${consIndex++}` };
      }
      return m;
    });

  // Sort for schedule: strictly by scheduled time first
  const sortedPlayoffForSchedule = [...playoffWithLabels].sort((a, b) => {
    if (a.scheduledTime && b.scheduledTime) {
      if (a.scheduledTime < b.scheduledTime) return -1;
      if (a.scheduledTime > b.scheduledTime) return 1;
      return a.field - b.field;
    }
    if (a.scheduledTime) return -1;
    if (b.scheduledTime) return 1;
    if (a.round === 10 && b.round !== 10) return -1;
    if (a.round !== 10 && b.round === 10) return 1;
    return b.round - a.round;
  });
  const preliminary = sortedPlayoffForSchedule.filter(m => m.round === 10);
  const placements = sortedPlayoffForSchedule.filter(m => m.round !== 10);

  const headerBlock = (
    <div style={{ textAlign: 'center', marginBottom: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: '#283877' }}>{tournament.name}</h1>
      {tournament.category && <p style={{ fontSize: 26, fontWeight: 700, color: '#283877', margin: '6px 0 0' }}>{tournament.category}</p>}
      <p style={{ fontSize: 14, color: '#666', margin: '4px 0 0' }}>{tournament.date}</p>
    </div>
  );

  const podiumBlock = winnerId && (
    <div style={{ textAlign: 'center', marginBottom: 24, padding: 16, background: '#f0f7f8', borderRadius: 12 }}>
      <p style={{ fontSize: 12, color: '#666', margin: '0 0 8px' }}>Výsledky</p>
      <p style={{ fontSize: 22, fontWeight: 700 }}>🥇 {getTeamName(tournament.teams, winnerId)}</p>
      {runnerId && <p style={{ fontSize: 18, margin: '4px 0' }}>🥈 {getTeamName(tournament.teams, runnerId)}</p>}
      {thirdId && <p style={{ fontSize: 16, margin: '4px 0' }}>🥉 {getTeamName(tournament.teams, thirdId)}</p>}
    </div>
  );

  const footerBlock = (
    <p style={{ fontSize: 10, color: '#999', textAlign: 'center', marginTop: 16 }}>
      Sport Academy - Sportem budujeme správné návyky
    </p>
  );

  const renderPlayoffMatch = (match: typeof tournament.playoffMatches[0]) => {
    const homeName = getTeamName(tournament.teams, match.homeTeamId);
    const awayName = getTeamName(tournament.teams, match.awayTeamId);
    const mWinnerId = match.played && match.homeScore !== null && match.awayScore !== null
      ? (match.homeScore > match.awayScore ? match.homeTeamId : match.awayTeamId) : null;
    const label = match.label || (match.round === 10 ? 'Předkolo' : `O ${(match.round - 1) * 2 + 1}.-${(match.round - 1) * 2 + 2}. místo`);

    return (
      <div key={match.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, background: '#fff', marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
          <span>{label}</span>
          {match.field > 0 && <span style={{ color: '#999', fontWeight: 400 }}>Hřiště {match.field}</span>}
        </div>
        <div style={{
          padding: '4px 8px', borderRadius: 4, marginBottom: 2,
          background: mWinnerId === match.homeTeamId ? '#e8f5e9' : '#f9f9f9',
          fontWeight: mWinnerId === match.homeTeamId ? 700 : 400,
          display: 'flex', justifyContent: 'space-between', fontSize: 13
        }}>
          <span>{homeName}</span>
          {match.played && <span style={{ fontWeight: 700 }}>{match.homeScore}</span>}
        </div>
        <div style={{
          padding: '4px 8px', borderRadius: 4,
          background: mWinnerId === match.awayTeamId ? '#e8f5e9' : '#f9f9f9',
          fontWeight: mWinnerId === match.awayTeamId ? 700 : 400,
          display: 'flex', justifyContent: 'space-between', fontSize: 13
        }}>
          <span>{awayName}</span>
          {match.played && <span style={{ fontWeight: 700 }}>{match.awayScore}</span>}
        </div>
      </div>
    );
  };

  const groupNameMap: Record<string, string> = {};
  tournament.groups.forEach(g => { groupNameMap[g.id] = g.name; });

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" /> Exportovat PNG
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => doExport('standings')}>
            Tabulky + výherce
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => doExport('schedule')}>
            Rozpis zápasů
          </DropdownMenuItem>
          {hasPlayoff && (
            <DropdownMenuItem onClick={() => doExport('playoff')}>
              Playoff + výherce
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hidden export content */}
      <div className="fixed left-[-9999px] top-0">
        <div ref={ref} style={{ width: 800, padding: 40, fontFamily: 'Inter, sans-serif', background: '#fff', color: '#283877' }}>
          {headerBlock}
          {(mode === 'standings' || mode === 'playoff') && podiumBlock}

          {mode === 'standings' && (
            <>
              {tournament.groups.map(group => {
                const standings = calculateStandings(tournament.matches, tournament.teams, group.id, tournament.tiebreakerRule);
                return (
                  <div key={group.id} style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{group.name}</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                          <th style={{ textAlign: 'left', padding: '6px 8px' }}>#</th>
                          <th style={{ textAlign: 'left', padding: '6px 8px' }}>Tým</th>
                          <th style={{ textAlign: 'center', padding: '6px 4px' }}>Z</th>
                          <th style={{ textAlign: 'center', padding: '6px 4px' }}>V</th>
                          <th style={{ textAlign: 'center', padding: '6px 4px' }}>R</th>
                          <th style={{ textAlign: 'center', padding: '6px 4px' }}>P</th>
                          <th style={{ textAlign: 'center', padding: '6px 4px' }}>Skóre</th>
                          <th style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 700 }}>B</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((s, i) => (
                          <tr key={s.teamId} style={{ borderBottom: '1px solid #f0f0f0', background: i < 2 ? '#f0f7f8' : 'transparent' }}>
                            <td style={{ padding: '6px 8px', fontWeight: 500 }}>{i + 1}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 500 }}>{s.teamName}</td>
                            <td style={{ textAlign: 'center', padding: '6px 4px' }}>{s.played}</td>
                            <td style={{ textAlign: 'center', padding: '6px 4px' }}>{s.wins}</td>
                            <td style={{ textAlign: 'center', padding: '6px 4px' }}>{s.draws}</td>
                            <td style={{ textAlign: 'center', padding: '6px 4px' }}>{s.losses}</td>
                            <td style={{ textAlign: 'center', padding: '6px 4px' }}>{s.goalsFor}:{s.goalsAgainst}</td>
                            <td style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 700 }}>{s.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </>
          )}

          {mode === 'schedule' && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Rozpis zápasů</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'center', padding: '6px 8px' }}>Čas</th>
                    <th style={{ textAlign: 'center', padding: '6px 4px' }}>Hřiště</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Skupina</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px' }}>Domácí</th>
                    <th style={{ textAlign: 'center', padding: '6px 4px' }}>Skóre</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Hosté</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const fc = tournament.fieldCount;
                    const slotDuration = tournament.matchDurationMinutes + tournament.breakDurationMinutes;
                    const [sH, sM] = tournament.startTime.split(':').map(Number);
                    const startMin = sH * 60 + sM;
                    const formatSlotTime = (slot: number) => {
                      const tot = startMin + slot * slotDuration;
                      const h = Math.floor(tot / 60).toString().padStart(2, '0');
                      const mm = (tot % 60).toString().padStart(2, '0');
                      return `${h}:${mm}`;
                    };
                    // Group matches by slot
                    const bySlot: Record<number, Record<number, typeof sortedMatches[0]>> = {};
                    let maxSlot = -1;
                    for (const m of sortedMatches) {
                      const s = Math.floor(m.order / fc);
                      if (!bySlot[s]) bySlot[s] = {};
                      bySlot[s][m.field] = m;
                      if (s > maxSlot) maxSlot = s;
                    }
                    type Row = { kind: 'match'; m: typeof sortedMatches[0] } | { kind: 'free'; slot: number; field: number };
                    const rows: Row[] = [];
                    for (let s = 0; s <= maxSlot; s++) {
                      for (let f = 1; f <= fc; f++) {
                        const m = bySlot[s]?.[f];
                        if (m) rows.push({ kind: 'match', m });
                        else rows.push({ kind: 'free', slot: s, field: f });
                      }
                    }
                    return rows.map((row, i) => {
                      const bg = i % 2 === 0 ? '#fafafa' : '#fff';
                      if (row.kind === 'free') {
                        return (
                          <tr key={`free-${row.slot}-${row.field}`} style={{ borderBottom: '1px solid #f0f0f0', background: bg }}>
                            <td style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 500, color: '#bbb' }}>{formatSlotTime(row.slot)}</td>
                            <td style={{ textAlign: 'center', padding: '6px 4px', color: '#bbb' }}>{row.field}</td>
                            <td style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, color: '#bbb' }}></td>
                            <td colSpan={3} style={{ textAlign: 'center', padding: '6px 8px', fontStyle: 'italic', color: '#bbb' }}>Volný slot</td>
                          </tr>
                        );
                      }
                      const m = row.m;
                      return (
                        <tr key={m.id} style={{ borderBottom: '1px solid #f0f0f0', background: bg }}>
                          <td style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 500 }}>{m.scheduledTime || '-'}</td>
                          <td style={{ textAlign: 'center', padding: '6px 4px' }}>{m.field}</td>
                          <td style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, color: '#888' }}>{groupNameMap[m.groupId] || ''}</td>
                          <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 500 }}>{getTeamName(tournament.teams, m.homeTeamId)}</td>
                          <td style={{ textAlign: 'center', padding: '6px 4px', fontWeight: 700 }}>
                            {m.played && m.homeScore !== null && m.awayScore !== null ? `${m.homeScore}:${m.awayScore}` : '-:-'}
                          </td>
                          <td style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500 }}>{getTeamName(tournament.teams, m.awayTeamId)}</td>
                        </tr>
                      );
                    });
                  })()}
                  {/* Playoff matches separator */}
                  {sortedPlayoffForSchedule.length > 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '10px 8px 6px', fontWeight: 700, fontSize: 14, color: '#283877', borderBottom: '2px solid #283877' }}>
                        Playoff
                      </td>
                    </tr>
                  )}
                  {sortedPlayoffForSchedule.map((pm, i) => (
                    <tr key={pm.id} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#f0f7f8' : '#fff' }}>
                      <td style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 500 }}>{pm.scheduledTime || '-'}</td>
                      <td style={{ textAlign: 'center', padding: '6px 4px' }}>{pm.field}</td>
                      <td style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, color: '#888' }}>{pm.label || 'Playoff'}</td>
                      <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 500, color: '#999' }}>{pm.homeTeamId ? getTeamName(tournament.teams, pm.homeTeamId) : '?'}</td>
                      <td style={{ textAlign: 'center', padding: '6px 4px', fontWeight: 700 }}>
                        {pm.played && pm.homeScore !== null && pm.awayScore !== null ? `${pm.homeScore}:${pm.awayScore}` : '-:-'}
                      </td>
                      <td style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500, color: '#999' }}>{pm.awayTeamId ? getTeamName(tournament.teams, pm.awayTeamId) : '?'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {mode === 'playoff' && (
            <div style={{ maxWidth: 400, margin: '0 auto' }}>
              {preliminary.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#999', marginBottom: 4 }}>PŘEDKOLO</p>
                  {preliminary.map(m => renderPlayoffMatch(m))}
                </div>
              )}
              {placements.map(m => renderPlayoffMatch(m))}
            </div>
          )}

          {footerBlock}
        </div>
      </div>
    </div>
  );
}
