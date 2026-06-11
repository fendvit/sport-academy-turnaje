import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode } from 'lucide-react';

interface Props {
  tournamentId: string;
}

export default function QRCodeDisplay({ tournamentId }: Props) {
  const dashboardUrl = `${window.location.origin}/dashboard/${tournamentId}`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>QR kód pro rodiče</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="rounded-xl border p-4 bg-white">
            <QRCodeSVG value={dashboardUrl} size={220} />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Naskenujte QR kód pro přístup k live výsledkům turnaje
          </p>
          <code className="text-xs text-muted-foreground break-all text-center">
            {dashboardUrl}
          </code>
        </div>
      </DialogContent>
    </Dialog>
  );
}
