import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// The browser's `beforeinstallprompt` event (Chrome/Edge/Android). Not in the
// standard lib types, so we describe the bits we use.
interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaCtx {
  canInstall: boolean; // a native install prompt is available right now
  isIos: boolean; // iOS Safari (needs manual Add to Home Screen)
  standalone: boolean; // already running as an installed app
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

function isStandalone(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true)
  );
}

function isIosDevice(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window as any).MSStream
  );
}

const Ctx = createContext<PwaCtx>({
  canInstall: false,
  isIos: false,
  standalone: false,
  promptInstall: async () => 'unavailable',
});

export function PwaProvider({ children }: { children: ReactNode }) {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [standalone, setStandalone] = useState(isStandalone());

  useEffect(() => {
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setStandalone(true);
    };
    window.addEventListener('beforeinstallprompt', onBIP);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferred) return 'unavailable';
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // A used prompt can't be reused; Chrome fires a fresh event next time.
    setDeferred(null);
    return outcome;
  };

  return (
    <Ctx.Provider value={{ canInstall: !!deferred, isIos: isIosDevice(), standalone, promptInstall }}>
      {children}
    </Ctx.Provider>
  );
}

export const usePwa = () => useContext(Ctx);
