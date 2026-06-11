import { useState } from 'react';
import { useTournament } from '@/contexts/TournamentContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ScorerManager() {
  const { tournament, scorers, addScorer, removeScorer } = useTournament();
  const { toast } = useToast();
  const [newField, setNewField] = useState('');
  const [newPin, setNewPin] = useState('');

  if (!tournament) return null;

  const usedFields = new Set(scorers.map(s => s.field));
  const availableFields = Array.from({ length: tournament.fieldCount }, (_, i) => i + 1)
    .filter(f => !usedFields.has(f));

  const handleAdd = async () => {
    if (!newField || !newPin.trim()) return;
    await addScorer(parseInt(newField), newPin.trim());
    setNewField('');
    setNewPin('');
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/scorer/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Odkaz zkopírován', description: 'Odkaz pro zapisovatele byl zkopírován do schránky.' });
  };

  return (
    <div className="space-y-4">
      {scorers.length > 0 && (
        <div className="space-y-2">
          {scorers.map(s => (
            <Card key={s.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <span className="font-medium">Hřiště {s.field}</span>
                  <span className="ml-3 text-sm text-muted-foreground">PIN: {s.pin}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyLink(s.token)}>
                    <Copy className="h-3 w-3 mr-1" /> Kopírovat odkaz
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeScorer(s.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {availableFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Přidat zapisovatele</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Select value={newField} onValueChange={setNewField}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Hřiště" />
                </SelectTrigger>
                <SelectContent>
                  {availableFields.map(f => (
                    <SelectItem key={f} value={String(f)}>Hřiště {f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="PIN"
                value={newPin}
                onChange={e => setNewPin(e.target.value)}
                className="w-[120px]"
              />
              <Button onClick={handleAdd} disabled={!newField || !newPin.trim()}>
                <Plus className="h-4 w-4 mr-1" /> Přidat
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {scorers.length === 0 && availableFields.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">Žádná hřiště k dispozici.</p>
      )}
    </div>
  );
}
