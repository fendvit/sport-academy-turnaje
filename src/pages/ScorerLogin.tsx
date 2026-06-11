import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import logo from '@/assets/logo_academy.svg';

export default function ScorerLogin() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [exists, setExists] = useState(false);
  const [fieldNum, setFieldNum] = useState<number>(0);

  useEffect(() => {
    if (!token) return;
    const stored = sessionStorage.getItem(`scorer_${token}`);
    if (stored === 'true') {
      navigate(`/scorer/${token}/dashboard`, { replace: true });
      return;
    }
    // Verify token exists (only non-sensitive columns)
    supabase.from('scorers').select('id, field').eq('token', token).maybeSingle().then(({ data }) => {
      if (data) {
        setExists(true);
        setFieldNum(data.field);
      }
      setLoading(false);
    });
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      // Verify PIN server-side via edge function
      const { data, error: fnError } = await supabase.functions.invoke('verify-scorer-pin', {
        body: { token: token!, pin },
      });

      if (fnError || !data?.valid) {
        setError('Nesprávný PIN');
        return;
      }

      sessionStorage.setItem(`scorer_${token}`, 'true');
      navigate(`/scorer/${token}/dashboard`, { replace: true });
    } catch {
      setError('Chyba při ověřování');
    }
  };

  if (loading) return null;

  if (!exists) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="py-8">
            <p className="text-muted-foreground">Neplatný odkaz zapisovatele.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <img src={logo} alt="Logo" className="mx-auto h-16 w-16 mb-2" />
          <CardTitle className="text-lg">Zapisovatel — Hřiště {fieldNum}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Zadejte PIN"
                value={pin}
                onChange={e => setPin(e.target.value)}
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              <Lock className="mr-2 h-4 w-4" /> Přihlásit se
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
