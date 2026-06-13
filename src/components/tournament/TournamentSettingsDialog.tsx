import { useEffect, useState } from 'react';
import { Tournament, TiebreakerRule, PlayoffFormat } from '@/types/tournament';
import { useTournament, RegenerateInput } from '@/contexts/TournamentContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Settings, Plus, Trash2, RotateCcw, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  tournament: Tournament;
}

export default function TournamentSettingsDialog({ tournament }: Props) {
  const { regenerateTournament, resetTournament, shiftMatchTimes, shiftPlayoffTimes } = useTournament();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [shifting, setShifting] = useState(false);
  const [shiftStart, setShiftStart] = useState(tournament.startTime);
  const [shiftPlayoff, setShiftPlayoff] = useState(tournament.playoffStartTime || '');

  // Form state
  const [name, setName] = useState(tournament.name);
  const [category, setCategory] = useState(tournament.category);
  const [date, setDate] = useState(tournament.date);
  const [fieldCount, setFieldCount] = useState(tournament.fieldCount);
  const [password, setPassword] = useState('');
  const [startTime, setStartTime] = useState(tournament.startTime);
  const [matchDuration, setMatchDuration] = useState(tournament.matchDurationMinutes);
  const [breakDuration, setBreakDuration] = useState(tournament.breakDurationMinutes);
  const [roundCount, setRoundCount] = useState(tournament.roundCount);
  const [playoffStartTime, setPlayoffStartTime] = useState(tournament.playoffStartTime || '');
  const [tiebreakerRule, setTiebreakerRule] = useState<TiebreakerRule>(tournament.tiebreakerRule);
  const [playoffFormat, setPlayoffFormat] = useState<PlayoffFormat>(tournament.playoffFormat || 'placement');
  const [playoffConsolationMatches, setPlayoffConsolationMatches] = useState<boolean>(tournament.playoffConsolationMatches || false);
  const [playoffMatchDuration, setPlayoffMatchDuration] = useState<number | ''>(tournament.playoffMatchDurationMinutes ?? '');
  const [playoffBreakDuration, setPlayoffBreakDuration] = useState<number | ''>(tournament.playoffBreakDurationMinutes ?? '');
  const [groupCount, setGroupCount] = useState(tournament.groups.length || 1);

  // teams: id-aware list (id null = new row)
  type Row = { id: string | null; name: string; groupIndex: number | null };
  const initialRows = (): Row[] => {
    const groupIdToIndex: Record<string, number> = {};
    tournament.groups.forEach((g, i) => { groupIdToIndex[g.id] = i; });
    return tournament.teams.map((t) => ({
      id: t.id,
      name: t.name,
      groupIndex: groupIdToIndex[t.groupId] ?? null,
    }));
  };
  const [rows, setRows] = useState<Row[]>(initialRows);

  // Reset form whenever dialog opens
  useEffect(() => {
    if (open) {
      setName(tournament.name);
      setCategory(tournament.category);
      setDate(tournament.date);
      setFieldCount(tournament.fieldCount);
      setPassword('');
      setStartTime(tournament.startTime);
      setMatchDuration(tournament.matchDurationMinutes);
      setBreakDuration(tournament.breakDurationMinutes);
      setRoundCount(tournament.roundCount);
      setPlayoffStartTime(tournament.playoffStartTime || '');
      setTiebreakerRule(tournament.tiebreakerRule);
      setPlayoffFormat(tournament.playoffFormat || 'placement');
      setPlayoffConsolationMatches(tournament.playoffConsolationMatches || false);
      setPlayoffMatchDuration(tournament.playoffMatchDurationMinutes ?? '');
      setPlayoffBreakDuration(tournament.playoffBreakDurationMinutes ?? '');
      setGroupCount(tournament.groups.length || 1);
      setRows(initialRows());
      setShiftStart(tournament.startTime);
      setShiftPlayoff(tournament.playoffStartTime || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const maxGroups = 6;

  const allGroupsAssigned = groupCount <= 1 || rows.every((r) => r.groupIndex !== null);
  const noGroupsAssigned = rows.every((r) => r.groupIndex === null);
  const groupsValid = allGroupsAssigned || noGroupsAssigned;
  const isValid =
    name.trim() &&
    category.trim() &&
    rows.every((r) => r.name.trim()) &&
    rows.length >= Math.max(2, groupCount * 2) &&
    groupCount >= 1 &&
    groupCount <= maxGroups &&
    groupsValid;

  const addRow = () => setRows([...rows, { id: null, name: '', groupIndex: null }]);
  const removeRow = (i: number) => {
    if (rows.length > 2) setRows(rows.filter((_, idx) => idx !== i));
  };
  const updateRowName = (i: number, v: string) => {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, name: v } : r)));
  };
  const updateRowGroup = (i: number, gi: number | null) => {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, groupIndex: gi } : r)));
  };

  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      const input: RegenerateInput = {
        name, category, date, fieldCount,
        password: password || undefined,
        startTime, matchDurationMinutes: matchDuration,
        breakDurationMinutes: breakDuration,
        roundCount, playoffStartTime: playoffStartTime || null,
        tiebreakerRule, groupCount,
        playoffFormat,
        playoffConsolationMatches,
        playoffMatchDurationMinutes: typeof playoffMatchDuration === 'number' ? playoffMatchDuration : null,
        playoffBreakDurationMinutes: typeof playoffBreakDuration === 'number' ? playoffBreakDuration : null,
        teams: rows.map((r) => ({ id: r.id, name: r.name, groupIndex: r.groupIndex })),
      };
      await regenerateTournament(input);
      toast({ title: 'Turnaj přeuložen', description: 'Rozpis byl vygenerován znovu.' });
      setOpen(false);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Uložení se nezdařilo.';
      toast({ title: 'Chyba', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleShiftStart = async () => {
    if (shifting || shiftStart === tournament.startTime) return;
    setShifting(true);
    try {
      await shiftMatchTimes(shiftStart);
      toast({ title: 'Časy posunuty', description: 'Všechny zápasy základní části byly posunuty.' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Chyba', description: e instanceof Error ? e.message : 'Posun se nezdařil.', variant: 'destructive' });
    } finally {
      setShifting(false);
    }
  };

  const handleShiftPlayoff = async () => {
    if (shifting || !shiftPlayoff || shiftPlayoff === (tournament.playoffStartTime || '')) return;
    setShifting(true);
    try {
      await shiftPlayoffTimes(shiftPlayoff);
      toast({ title: 'Časy playoff posunuty', description: 'Všechny playoff zápasy byly posunuty.' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Chyba', description: e instanceof Error ? e.message : 'Posun se nezdařil.', variant: 'destructive' });
    } finally {
      setShifting(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await resetTournament();
      toast({ title: 'Turnaj resetován', description: 'Výsledky vymazány a rozpis vygenerován znovu.' });
      setOpen(false);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Reset se nezdařil.';
      toast({ title: 'Chyba', description: msg, variant: 'destructive' });
    } finally {
      setResetting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Nastavení turnaje">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nastavení turnaje</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="rounded border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            Po uložení se rozpis vygeneruje znovu — všechny odehrané výsledky a playoff zápasy zmizí.
          </div>

          <div className="space-y-2">
            <Label>Název turnaje</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Kategorie</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Datum</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Počet hřišť</Label>
              <Select value={String(fieldCount)} onValueChange={(v) => setFieldCount(Number(v))}>
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
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Délka zápasu (min)</Label>
              <Input type="number" min={5} max={30} value={matchDuration} onChange={(e) => setMatchDuration(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Přestávka (min)</Label>
              <Input type="number" min={0} max={30} value={breakDuration} onChange={(e) => setBreakDuration(Number(e.target.value))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Heslo (volitelné — vyplňte jen pro změnu)</Label>
            <Input type="password" placeholder="Nechte prázdné pro zachování stávajícího" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Počet skupin</Label>
            <Select value={String(groupCount)} onValueChange={(v) => {
              const n = Number(v);
              setGroupCount(n);
              if (n === 1) setRows(rows.map((r) => ({ ...r, groupIndex: null })));
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: maxGroups }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} {n === 1 ? 'skupina' : n < 5 ? 'skupiny' : 'skupin'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Čas začátku playoff</Label>
            <Input type="time" value={playoffStartTime} onChange={(e) => setPlayoffStartTime(e.target.value)} />
            <p className="text-xs text-muted-foreground">Nechte prázdné — playoff naváže ihned po základní části.</p>
          </div>

          <div className="space-y-2">
            <Label>Počet odvetných zápasů</Label>
            <Select value={String(roundCount)} onValueChange={(v) => setRoundCount(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1× (každý s každým jednou)</SelectItem>
                <SelectItem value="2">2× (každý s každým dvakrát)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Pravidlo pro pořadí v tabulce</Label>
            <Select value={tiebreakerRule} onValueChange={(v) => setTiebreakerRule(v as TiebreakerRule)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="head_to_head">Vzájemný zápas → rozdíl skóre → vstřelené góly</SelectItem>
                <SelectItem value="goal_diff">Rozdíl skóre → vstřelené góly → vzájemný zápas</SelectItem>
                <SelectItem value="wins">Počet výher → vzájemný zápas → rozdíl skóre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Typ playoff</Label>
            <Select value={playoffFormat} onValueChange={(v) => setPlayoffFormat(v as PlayoffFormat)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="placement">Zápasy o umístění (1.-2., 3.-4., …)</SelectItem>
                <SelectItem value="bracket">Klasický pavouk (předkolo → ČF → SF → finále)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Délka playoff zápasu (min)</Label>
            <Input
              type="number"
              min={5}
              max={30}
              value={playoffMatchDuration}
              placeholder={`Stejné jako základní (${matchDuration})`}
              onChange={(e) => setPlayoffMatchDuration(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>Přestávka v playoff (min)</Label>
            <Input
              type="number"
              min={0}
              max={30}
              value={playoffBreakDuration}
              placeholder={`Stejné jako základní (${breakDuration})`}
              onChange={(e) => setPlayoffBreakDuration(e.target.value === '' ? '' : Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">Nechte prázdné — použije se hodnota ze základní části.</p>
          </div>


          <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3">
            <div>
              <Label className="text-sm font-semibold">Posun časů zápasů</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Posune všechny zápasy o rozdíl mezi novým a stávajícím časem. Pořadí, hřiště ani výsledky se nemění.
              </p>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Začátek základní části</Label>
                <Input type="time" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} />
              </div>
              <Button
                variant="outline"
                onClick={handleShiftStart}
                disabled={shifting || !shiftStart || shiftStart === tournament.startTime}
              >
                Posunout zápasy
              </Button>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Začátek playoff</Label>
                <Input
                  type="time"
                  value={shiftPlayoff}
                  onChange={(e) => setShiftPlayoff(e.target.value)}
                  disabled={tournament.playoffMatches.length === 0}
                />
              </div>
              <Button
                variant="outline"
                onClick={handleShiftPlayoff}
                disabled={
                  shifting ||
                  tournament.playoffMatches.length === 0 ||
                  !shiftPlayoff ||
                  shiftPlayoff === (tournament.playoffStartTime || '')
                }
              >
                Posunout playoff
              </Button>
            </div>
            {tournament.playoffMatches.length === 0 && (
              <p className="text-xs text-muted-foreground">Playoff ještě nebylo spuštěno.</p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Týmy ({rows.length})</Label>
              <Button variant="outline" size="sm" onClick={addRow}>
                <Plus className="mr-1 h-3 w-3" /> Přidat tým
              </Button>
            </div>
            {rows.map((r, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder={`Tým ${i + 1}`}
                  value={r.name}
                  onChange={(e) => updateRowName(i, e.target.value)}
                  className={groupCount > 1 ? 'flex-1' : undefined}
                />
                {groupCount > 1 && (
                  <Select
                    value={r.groupIndex !== null ? String(r.groupIndex) : ''}
                    onValueChange={(v) => updateRowGroup(i, v === '' ? null : Number(v))}
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
                {rows.length > 2 && (
                  <Button variant="ghost" size="icon" onClick={() => removeRow(i)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t">
            <Button onClick={handleSave} disabled={!isValid || saving} size="lg">
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Ukládám...' : 'Uložit a regenerovat'}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="lg" disabled={resetting}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset turnaje (vytvořit nový rozpis)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Resetovat turnaj?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Smažou se všechny výsledky, playoff zápasy a rozpis se vygeneruje znovu z aktuálních týmů a nastavení. Týmy a hráči zůstanou zachováni. Tato akce je nevratná.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Zrušit</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset}>Resetovat</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
