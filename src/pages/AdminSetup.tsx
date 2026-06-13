import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '@/contexts/TournamentContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { generateGroups, assignTeamsToGroups, generateAllMatches, assignMatchTimes } from '@/utils/tournament';
import { Tournament, Team, TiebreakerRule, PlayoffFormat } from '@/types/tournament';
import { Trash2, Plus, ArrowRight } from 'lucide-react';
import logo from '@/assets/logo_academy.svg';

export default function AdminSetup() {
  const { saveTournament } = useTournament();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [fieldCount, setFieldCount] = useState(2);
  const [password, setPassword] = useState('');
  const [teamNames, setTeamNames] = useState<string[]>(['', '', '', '']);
  const [teamGroups, setTeamGroups] = useState<(number | null)[]>([null, null, null, null]);
  const [groupCount, setGroupCount] = useState(1);
  const [startTime, setStartTime] = useState('09:00');
  const [matchDuration, setMatchDuration] = useState(12);
  const [breakDuration, setBreakDuration] = useState(3);
  const [roundCount, setRoundCount] = useState(1);
  const [playoffStartTime, setPlayoffStartTime] = useState('');
  const [tiebreakerRule, setTiebreakerRule] = useState<TiebreakerRule>('head_to_head');
  const [playoffFormat, setPlayoffFormat] = useState<PlayoffFormat>('placement');
  const [playoffConsolationMatches, setPlayoffConsolationMatches] = useState(false);
  const [playoffMatchDuration, setPlayoffMatchDuration] = useState<number | ''>('');
  const [playoffBreakDuration, setPlayoffBreakDuration] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  const addTeam = () => {
    setTeamNames([...teamNames, '']);
    setTeamGroups([...teamGroups, null]);
  };

  const removeTeam = (index: number) => {
    if (teamNames.length > 2) {
      setTeamNames(teamNames.filter((_, i) => i !== index));
      setTeamGroups(teamGroups.filter((_, i) => i !== index));
    }
  };

  const updateTeam = (index: number, value: string) => {
    const updated = [...teamNames];
    updated[index] = value;
    setTeamNames(updated);
  };

  const updateTeamGroup = (index: number, groupIndex: number | null) => {
    const updated = [...teamGroups];
    updated[index] = groupIndex;
    setTeamGroups(updated);
  };

  const maxGroups = 6;

  const allGroupsAssigned = groupCount <= 1 || teamGroups.every(g => g !== null);
  const noGroupsAssigned = teamGroups.every(g => g === null);
  const groupsValid = allGroupsAssigned || noGroupsAssigned;
  const isValid = name.trim() && password.trim() && category.trim() && teamNames.every(t => t.trim()) && teamNames.length >= Math.max(2, groupCount * 2) && groupCount >= 1 && groupCount <= maxGroups && groupsValid;

  const handleCreate = async () => {
    if (!isValid || saving) return;
    setSaving(true);

    const groups = generateGroups(groupCount);
    
    let assignedTeams: Team[];
    const teams = teamNames.map(n => ({ id: crypto.randomUUID(), name: n.trim(), groupId: '' }));
    
    if (groupCount > 1 && teamGroups.every(g => g !== null)) {
      assignedTeams = teams.map((t, i) => ({ ...t, groupId: groups[teamGroups[i]!].id }));
    } else {
      assignedTeams = assignTeamsToGroups(teams, groups);
    }
    
    try {
      const rawMatches = generateAllMatches(assignedTeams, groups, fieldCount, roundCount);
      const matches = assignMatchTimes(rawMatches, startTime, matchDuration, fieldCount, breakDuration);

      const tournament: Tournament = {
        id: crypto.randomUUID(),
        name: name.trim(),
        date,
        fieldCount,
        password: password.trim(),
        phase: 'group',
        category: category.trim(),
        teams: assignedTeams,
        groups,
        matches,
        playoffMatches: [],
        matchDurationMinutes: matchDuration,
        breakDurationMinutes: breakDuration,
        startTime,
        roundCount,
        playoffStartTime: playoffStartTime || null,
        archived: false,
        tiebreakerRule,
        playoffFormat,
        playoffConsolationMatches,
        playoffMatchDurationMinutes: typeof playoffMatchDuration === 'number' ? playoffMatchDuration : null,
        playoffBreakDurationMinutes: typeof playoffBreakDuration === 'number' ? playoffBreakDuration : null,
      };
      await saveTournament(tournament);
      sessionStorage.setItem('florbal_admin', 'true');
      setSaving(false);
      navigate('/admin/dashboard');
    } catch (err: any) {
      console.error('Error in handleCreate:', err);
      setSaving(false);
      alert(err.message || 'Došlo k chybě při vytváření turnaje. Zkontrolujte prosím připojení a zkuste to znovu.');
    }
  };

  const teamsPerGroup = Math.ceil(teamNames.length / groupCount);
  const matchesPerGroup = (teamsPerGroup * (teamsPerGroup - 1)) / 2 * roundCount;
  const totalMatches = matchesPerGroup * groupCount;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <img src={logo} alt="Academy logo" className="h-12 w-12" />
              Nový turnaj
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Název turnaje</Label>
              <Input placeholder="Např. Jarní florbalový turnaj 2026" value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Kategorie</Label>
              <Input placeholder="Např. Mladší, Starší, U10, U12..." value={category} onChange={e => setCategory(e.target.value)} />
              <p className="text-xs text-muted-foreground">Rodiče uvidí přepínač kategorií na dashboardu</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Datum</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Počet hřišť</Label>
                <Select value={String(fieldCount)} onValueChange={v => setFieldCount(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hřiště</SelectItem>
                    <SelectItem value="2">2 hřiště</SelectItem>
                    <SelectItem value="3">3 hřiště</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Čas začátku</Label>
                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Délka zápasu (min)</Label>
                <Input type="number" min={5} max={30} value={matchDuration} onChange={e => setMatchDuration(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Přestávka (min)</Label>
                <Input type="number" min={0} max={30} value={breakDuration} onChange={e => setBreakDuration(Number(e.target.value))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Heslo pro administraci</Label>
              <Input type="password" placeholder="Sdílené heslo" value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Počet skupin</Label>
              <Select value={String(groupCount)} onValueChange={v => {
                const newCount = Number(v);
                setGroupCount(newCount);
                if (newCount === 1) setTeamGroups(teamGroups.map(() => null));
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: maxGroups }, (_, i) => i + 1).map(n => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {n === 1 ? 'skupina' : n < 5 ? 'skupiny' : 'skupin'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                ~{teamsPerGroup} týmů na skupinu • ~{matchesPerGroup} zápasů na skupinu • {totalMatches} zápasů celkem
              </p>
            </div>

            <div className="space-y-2">
              <Label>Začátek playoff (čas nebo minuty po skupinách)</Label>
              <Input
                type="text"
                value={playoffStartTime}
                onChange={e => setPlayoffStartTime(e.target.value)}
                placeholder="např. 10 (minut po) nebo 13:00"
              />
              <p className="text-xs text-muted-foreground">
                Můžete zadat pevnou hodinu (např. 13:00) nebo pauzu v minutách (např. 10). Nechte prázdné pro přímé navázání.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Počet odvetných zápasů</Label>
              <Select value={String(roundCount)} onValueChange={v => setRoundCount(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1× (každý s každým jednou)</SelectItem>
                  <SelectItem value="2">2× (každý s každým dvakrát)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Pravidlo pro pořadí v tabulce</Label>
              <Select value={tiebreakerRule} onValueChange={v => setTiebreakerRule(v as TiebreakerRule)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="head_to_head">Vzájemný zápas → rozdíl skóre → vstřelené góly</SelectItem>
                  <SelectItem value="goal_diff">Rozdíl skóre → vstřelené góly → vzájemný zápas</SelectItem>
                  <SelectItem value="wins">Počet výher → vzájemný zápas → rozdíl skóre</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Po vytvoření turnaje pravidlo nelze měnit. Vždy se nejprve řadí podle bodů.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Typ playoff</Label>
              <Select value={playoffFormat} onValueChange={v => setPlayoffFormat(v as PlayoffFormat)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="placement">Zápasy o umístění (1.-2., 3.-4., …)</SelectItem>
                  <SelectItem value="bracket">Klasický pavouk (předkolo → ČF → SF → finále)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Klasický pavouk: 5v12, 6v11, 7v10, 8v9; vítězové k seedu 1–4 do čtvrtfinále.
              </p>
            </div>

            {playoffFormat === 'bracket' && (
              <div className="flex items-center space-x-2">
                <Switch 
                  id="consolation-matches" 
                  checked={playoffConsolationMatches} 
                  onCheckedChange={setPlayoffConsolationMatches} 
                />
                <Label htmlFor="consolation-matches" className="font-normal">
                  Vygenerovat útěchové zápasy pro poražené z předkola a čtvrtfinále
                </Label>
              </div>
            )}

            <div className="space-y-2">
              <Label>Délka playoff zápasu (min)</Label>
              <Input
                type="number"
                min={5}
                max={30}
                value={playoffMatchDuration}
                placeholder={`Stejné jako základní (${matchDuration})`}
                onChange={e => setPlayoffMatchDuration(e.target.value === '' ? '' : Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Nechte prázdné — použije se délka základního zápasu.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Přestávka v playoff (min)</Label>
              <Input
                type="number"
                min={0}
                max={30}
                value={playoffBreakDuration}
                placeholder={`Stejné jako základní (${breakDuration})`}
                onChange={e => setPlayoffBreakDuration(e.target.value === '' ? '' : Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Nechte prázdné — použije se hodnota ze základní části.
              </p>
            </div>


            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Týmy ({teamNames.length})</Label>
                <Button variant="outline" size="sm" onClick={addTeam}>
                  <Plus className="mr-1 h-3 w-3" /> Přidat tým
                </Button>
              </div>
              {teamNames.map((teamName, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={`Tým ${i + 1}`}
                    value={teamName}
                    onChange={e => updateTeam(i, e.target.value)}
                    className={groupCount > 1 ? 'flex-1' : undefined}
                  />
                  {groupCount > 1 && (
                    <Select
                      value={teamGroups[i] !== null ? String(teamGroups[i]) : ''}
                      onValueChange={v => updateTeamGroup(i, v === '' ? null : Number(v))}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue placeholder="Skupina" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: groupCount }, (_, gi) => (
                          <SelectItem key={gi} value={String(gi)}>
                            Sk. {String.fromCharCode(65 + gi)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {teamNames.length > 2 && (
                    <Button variant="ghost" size="icon" onClick={() => removeTeam(i)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}
              {groupCount > 1 && (
                <p className="text-xs text-muted-foreground">
                  Vyberte skupinu pro každý tým, nebo nechte prázdné pro automatické rozdělení.
                </p>
              )}
            </div>

            <Button onClick={handleCreate} disabled={!isValid || saving} className="w-full" size="lg">
              {saving ? 'Vytvářím...' : 'Vytvořit turnaj'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
