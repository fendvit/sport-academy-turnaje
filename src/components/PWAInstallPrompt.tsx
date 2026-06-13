import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PWAInstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Zkontrolovat jestli už je nainstalováno
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      return;
    }

    // Zkontrolovat jestli to uživatel nedávno nezavřel
    const dismissedAt = localStorage.getItem('pwa_prompt_dismissed_at');
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 30) return;
    }

    // Detekce iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Zpoždění zobrazení, aby to neotravovalo hned
      setTimeout(() => setShow(true), 8000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Na iOS událost beforeinstallprompt neexistuje, ukážeme rovnou s prodlevou
    if (isIOSDevice) {
      setTimeout(() => setShow(true), 8000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('pwa_prompt_dismissed_at', Date.now().toString());
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center animate-in slide-in-from-bottom-5 fade-in duration-500">
      <Card className="w-full max-w-sm shadow-xl border-primary/20 bg-card/95 backdrop-blur-sm">
        <CardContent className="p-4 flex gap-3 items-start relative">
          <button 
            onClick={handleDismiss} 
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-1 transition-colors"
            aria-label="Zavřít"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="bg-primary/10 p-2 rounded-xl flex-shrink-0 mt-1">
            <Download className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 pr-5">
            <h3 className="font-semibold text-sm mb-1">Přidat na plochu</h3>
            {isIOS ? (
              <div className="text-xs text-muted-foreground leading-relaxed">
                Pro rychlý přístup k výsledkům klikněte dole na ikonu sdílení <Share className="inline h-3 w-3 mx-0.5 align-text-bottom" /> a vyberte <strong>"Přidat na plochu"</strong>.
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  Nainstalujte si aplikaci pro okamžitý přístup k výsledkům turnajů.
                </p>
                <Button size="sm" onClick={handleInstall} className="w-full h-8 text-xs font-medium">
                  Nainstalovat aplikaci
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
