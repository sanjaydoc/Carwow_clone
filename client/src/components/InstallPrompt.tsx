import { useEffect, useState } from 'react';

// The browser's `beforeinstallprompt` event (Chrome/Edge/Android). Not in the
// standard lib types, so we describe the bits we use.
interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'sp_pwa_dismissed';

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    // Already installed, or dismissed earlier this month → stay quiet.
    if (isStandalone()) return;
    try {
      const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (until && Date.now() < until) return;
    } catch { /* ignore */ }

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', onBIP);

    const onInstalled = () => setShow(false);
    window.addEventListener('appinstalled', onInstalled);

    // iOS Safari has no beforeinstallprompt — show a short "Add to Home Screen"
    // hint instead (only in the normal Safari tab, not once installed).
    if (isIos()) {
      setIosHint(true);
      setShow(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      // Snooze for 30 days.
      localStorage.setItem(DISMISS_KEY, String(Date.now() + 30 * 86400000));
    } catch { /* ignore */ }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === 'accepted') setShow(false);
    else dismiss();
    setDeferred(null);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[60] flex justify-center px-3 pt-3">
      <div className="flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-clay-200 bg-white p-3 shadow-[0_10px_30px_rgba(20,20,19,0.18)]">
        <img src="/pwa-192.png" alt="" className="h-11 w-11 flex-none rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink-900">Install StemCells Protocol</p>
          {iosHint ? (
            <p className="text-xs text-ink-700/70">
              Tap the Share icon, then <b>Add to Home Screen</b>.
            </p>
          ) : (
            <p className="text-xs text-ink-700/70">Add the app to your home screen for quick, full-screen access.</p>
          )}
        </div>
        {!iosHint && (
          <button
            onClick={install}
            className="flex-none rounded-full bg-clay-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-clay-600"
          >
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex-none grid h-8 w-8 place-items-center rounded-full text-ink-700/60 transition hover:bg-cream-100"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
