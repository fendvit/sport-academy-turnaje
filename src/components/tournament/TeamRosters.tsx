import { useState, useRef } from 'react';
import { Team, Player } from '@/types/tournament';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Upload, Users, UserCheck, Pencil } from 'lucide-react';

interface Props {
  teams: Team[];
  players: Player[];
  isAdmin: boolean;
  onAddPlayer?: (teamId: string, name: string, number: number | null) => Promise<void>;
  onRemovePlayer?: (playerId: string) => Promise<void>;
  onImportCSV?: (teamId: string, players: { name: string; number: number | null }[]) => Promise<void>;
  onDeleteTeam?: (teamId: string) => Promise<void>;
  onUpdateTrainer?: (teamId: string, trainer: string) => Promise<void>;
  onUpdateTeamName?: (teamId: string, name: string) => Promise<void>;
}

export default function TeamRosters({ teams, players, isAdmin, onAddPlayer, onRemovePlayer, onImportCSV, onDeleteTeam, onUpdateTrainer, onUpdateTeamName }: Props) {
  const [addingTeamId, setAddingTeamId] = useState<string | null>(null);
  const [editingTeamNameId, setEditingTeamNameId] = useState<string | null>(null);
  const [teamNameValue, setTeamNameValue] = useState('');
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [importTeamId, setImportTeamId] = useState<string | null>(null);
  const [editingTrainerTeamId, setEditingTrainerTeamId] = useState<string | null>(null);
  const [trainerValue, setTrainerValue] = useState('');

  const handleAdd = async (teamId: string) => {
    if (!newName.trim() || !onAddPlayer) return;
    await onAddPlayer(teamId, newName.trim(), newNumber ? parseInt(newNumber) : null);
    setNewName('');
    setNewNumber('');
  };

  const handleCSV = (teamId: string) => {
    setImportTeamId(teamId);
    fileRef.current?.click();
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!onDeleteTeam) return;
    if (window.confirm(`Opravdu chcete smazat tým "${teamName}"? Budou smazány i všechny jeho zápasy a hráči. Zbývající zápasy budou přeuspořádány.`)) {
      await onDeleteTeam(teamId);
    }
  };

  const startEditTrainer = (team: Team) => {
    setEditingTrainerTeamId(team.id);
    setTrainerValue(team.trainer || '');
  };

  const saveTrainer = async (teamId: string) => {
    if (onUpdateTrainer) {
      await onUpdateTrainer(teamId, trainerValue.trim());
    }
    setEditingTrainerTeamId(null);
  };

  const startEditTeamName = (team: Team) => {
    setEditingTeamNameId(team.id);
    setTeamNameValue(team.name);
  };

  const saveTeamName = async (teamId: string) => {
    if (onUpdateTeamName && teamNameValue.trim()) {
      await onUpdateTeamName(teamId, teamNameValue.trim());
    }
    setEditingTeamNameId(null);
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importTeamId || !onImportCSV) return;

    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    const parsed: { name: string; number: number | null }[] = [];

    for (const line of lines) {
      const parts = line.split(/[,;]/).map(s => s.trim());
      if (!parts[0]) continue;
      if (parts[0].toLowerCase() === 'name' || parts[0].toLowerCase() === 'jméno') continue;
      const num = parts[1] ? parseInt(parts[1]) : null;
      parsed.push({ name: parts[0], number: isNaN(num as number) ? null : num });
    }

    if (parsed.length > 0) {
      await onImportCSV(importTeamId, parsed);
    }
    e.target.value = '';
    setImportTeamId(null);
  };

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={onFileChange} />
      {teams.map(team => {
        const teamPlayers = players.filter(p => p.teamId === team.id).sort((a, b) => {
          if (a.number !== null && b.number !== null) return a.number - b.number;
          if (a.number !== null) return -1;
          if (b.number !== null) return 1;
          return a.name.localeCompare(b.name);
        });

        return (
          <Card key={team.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {editingTeamNameId === team.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        className="h-6 text-sm py-0 px-2"
                        value={teamNameValue}
                        onChange={e => setTeamNameValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveTeamName(team.id)}
                        autoFocus
                      />
                      <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => saveTeamName(team.id)}>
                        Uložit
                      </Button>
                    </div>
                  ) : (
                    <>
                      {team.name}
                      {isAdmin && onUpdateTeamName && (
                        <Button variant="ghost" size="icon" className="h-5 w-5 -ml-1" onClick={() => startEditTeamName(team)}>
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      )}
                    </>
                  )}
                  <Badge variant="secondary" className="text-xs">{teamPlayers.length} hráčů</Badge>
                </CardTitle>
                {isAdmin && (
                  <div className="flex gap-1">
                    {onDeleteTeam && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => handleDeleteTeam(team.id, team.name)}>
                        <Trash2 className="h-3 w-3 mr-1" /> Smazat tým
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleCSV(team.id)}>
                      <Upload className="h-3 w-3 mr-1" /> CSV
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setAddingTeamId(addingTeamId === team.id ? null : team.id)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Přidat
                    </Button>
                  </div>
                )}
              </div>
              {/* Trainer display/edit */}
              <div className="flex items-center gap-2 mt-1">
                <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                {editingTrainerTeamId === team.id ? (
                  <div className="flex items-center gap-1 flex-1">
                    <Input
                      placeholder="Jméno trenéra"
                      className="h-7 text-xs flex-1"
                      value={trainerValue}
                      onChange={e => setTrainerValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveTrainer(team.id)}
                      autoFocus
                    />
                    <Button size="sm" className="h-7 text-xs" onClick={() => saveTrainer(team.id)}>
                      Uložit
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground">
                      Trenér: {team.trainer || '—'}
                    </span>
                    {isAdmin && onUpdateTrainer && (
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => startEditTrainer(team)}>
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {addingTeamId === team.id && isAdmin && (
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Jméno hráče"
                    className="h-8 text-sm"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdd(team.id)}
                  />
                  <Input
                    placeholder="#"
                    type="number"
                    className="h-8 text-sm w-16"
                    value={newNumber}
                    onChange={e => setNewNumber(e.target.value)}
                  />
                  <Button size="sm" className="h-8" onClick={() => handleAdd(team.id)}>
                    Přidat
                  </Button>
                </div>
              )}
              {teamPlayers.length === 0 ? (
                <p className="text-xs text-muted-foreground py-1">Žádní hráči</p>
              ) : (
                <div className="grid grid-cols-2 gap-1">
                  {teamPlayers.map(p => (
                    <div key={p.id} className="flex items-center gap-2 text-sm rounded-md px-2 py-1 bg-muted/30">
                      {p.number !== null && (
                        <span className="text-xs font-bold text-muted-foreground w-5 text-right">#{p.number}</span>
                      )}
                      <span className="flex-1 truncate">{p.name}</span>
                      {isAdmin && onRemovePlayer && (
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onRemovePlayer(p.id)}>
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
