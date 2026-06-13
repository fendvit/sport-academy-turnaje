import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import logo from '@/assets/logo_academy.svg';

const GLOBAL_ADMIN_PIN_HASH = '9f692f0ff57b904813387cb84a6febf58f0c65fa652f9ddf33ea1b6e2fb373c0';

async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export default function GlobalAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const authStatus = sessionStorage.getItem('global_admin_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    setChecking(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const hash = await sha256(pin);
    if (hash === GLOBAL_ADMIN_PIN_HASH) {
      sessionStorage.setItem('global_admin_auth', 'true');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Nesprávný PIN');
      setPin('');
    }
  };

  if (checking) return null;

  if (isAuthenticated) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <img src={logo} alt="Academy logo" className="h-16 w-16" />
          </div>
          <CardTitle className="text-2xl">Vstup do administrace</CardTitle>
          <CardDescription>Zadejte hlavní administrátorský PIN</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Zadejte PIN"
                  value={pin}
                  onChange={(e) => { setPin(e.target.value); setError(''); }}
                  className="pl-10 text-center tracking-widest text-lg"
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
            </div>
            <Button type="submit" className="w-full" size="lg">
              Pokračovat
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
