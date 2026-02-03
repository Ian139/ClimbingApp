'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface DeferredPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPrompt | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('climbset-install-dismissed') === '1';
    if (dismissed) return;

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as DeferredPrompt);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsVisible(false);
    sessionStorage.setItem('climbset-install-dismissed', '1');
    if (choice.outcome === 'dismissed') return;
  };

  const handleDismiss = () => {
    sessionStorage.setItem('climbset-install-dismissed', '1');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="mb-3 rounded-xl border border-border/50 bg-card/80 px-4 py-2 text-sm text-foreground flex items-center justify-between gap-3">
      <span>Install ClimbSet for a faster, app-like experience.</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleDismiss}>
          Not now
        </Button>
        <Button size="sm" onClick={handleInstall}>
          Install
        </Button>
      </div>
    </div>
  );
}
