import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '@/contexts/TournamentContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Lock, Plus, RefreshCw, ArchiveRestore, Archive } from 'lucide-react';
import logo from '@/assets/logo_academy.svg';
import type { Tournament } from '@/types/tournament';

export default function AdminLogin() {
  const { allTournaments: tournaments, loading, login, selectTournament, archiveTournament } = useTournament();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [tab, setTab] = useState<'active' | 'archive'>('active');

  const activeTournaments = useMemo(() => tournaments.filter(t => !t.archived), [tournaments]);
  const archivedTournaments = useMemo(() => tournaments.filter(t => t.archived), [tournaments]);

  const selectedTournament = tournaments.find(t => t.id === selectedTournamentId) || null;

  const handleSelectTournament = (id: string) => {
    setSelectedTournamentId(id);
    selectTournament(id);
    setPassword('');
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament) return;
    const success = await login(password);
    if (success) {
      navigate('/admin/dashboard');
    } else {
      setError('Nesprávné heslo');
    }
  };

  const renderTournamentRow = (t: Tournament, mode: 'active' | 'archive') => (
    <div key={t.id} className="flex items-center gap-2">
      <button
        onClick={() => handleSelectTournament(t.id)}
        className={`flex-1 text-left rounded-lg border p-3 transition-colors ${
          selectedTournamentId === t.id
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
      >
        <div className="font-medium">{t.name}</div>
        <div className="text-sm text-muted-foreground">
          {t.category && <span className="mr-2 inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{t.category}</span>}
          {t.date} • {t.phase === 'finished' ? 'Dokončen' : t.phase === 'playoff' ? 'Playoff' : 'Skupiny'}
        </div>
      </button>
      {mode === 'archive' ? (
        <Button
          variant="ghost"
          size="icon"
          title="Obnovit z archivu"
          onClick={(e) => { e.stopPropagation(); archiveTournament(t.id, false); }}
        >
          <ArchiveRestore className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          title="Archivovat turnaj"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Archivovat turnaj „${t.name}"?`)) archiveTournament(t.id, true);
          }}
        >
          <Archive className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const visibleList = tab === 'active' ? activeTournaments : archivedTournaments;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <img src={logo} alt="Academy logo" className="h-16 w-16" />
          </div>
          <CardTitle className="text-2xl">Florbalový turnaj</CardTitle>
          <CardDescription>
            {tournaments.length > 0
              ? 'Vyberte turnaj a zadejte heslo pro přístup do administrace'
              : 'Zatím není vytvořen žádný turnaj'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tournaments.length > 0 ? (
            <div className="space-y-4">
              <Tabs value={tab} onValueChange={(v) => { setTab(v as 'active' | 'archive'); setSelectedTournamentId(null); }}>
                <TabsList className="w-full">
                  <TabsTrigger value="active" className="flex-1">
                    Aktivní ({activeTournaments.length})
                  </TabsTrigger>
                  <TabsTrigger value="archive" className="flex-1">
                    Archiv ({archivedTournaments.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-2 mt-4">
                  {activeTournaments.length > 0 ? (
                    activeTournaments.map(t => renderTournamentRow(t, 'active'))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Žádné aktivní turnaje
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="archive" className="space-y-2 mt-4">
                  {archivedTournaments.length > 0 ? (
                    archivedTournaments.map(t => renderTournamentRow(t, 'archive'))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Žádné archivované turnaje
                    </p>
                  )}
                </TabsContent>
              </Tabs>

              {/* Password entry for selected tournament */}
              {selectedTournament && visibleList.some(t => t.id === selectedTournament.id) && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="Heslo"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(''); }}
                        className="pl-10"
                        autoFocus
                      />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                  </div>
                  <Button type="submit" className="w-full" size="lg">
                    Přihlásit se
                  </Button>
                </form>
              )}

              <div className="pt-2">
                <Button variant="outline" onClick={() => navigate('/admin/setup')} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Vytvořit nový turnaj
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => navigate('/admin/setup')} className="w-full" size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Vytvořit nový turnaj
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
