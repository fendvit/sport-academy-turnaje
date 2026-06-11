import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTournament } from "@/contexts/TournamentContext";
import { RefreshCw } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
  const { tournaments, loading } = useTournament();

  useEffect(() => {
    if (loading) return;
    const active = tournaments.filter(t => !t.archived);
    if (active.length > 0) {
      navigate(`/dashboard/${active[0].id}`, { replace: true });
    }
  }, [loading, tournaments, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tournaments.filter(t => !t.archived).length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Žádný turnaj není k dispozici.</p>
      </div>
    );
  }

  return null;
}
