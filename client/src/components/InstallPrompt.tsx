import { useEffect, useState } from 'react';
import { usePwa } from '../context/PwaContext';

const DISMISS_KEY = 'sp_pwa_dismissed';

export default function InstallPrompt() {
  const { canInstall, isIos, standalone, promptInstall } = usePwa();
  const [snoozed, setSnoozed] = useState(true);

  useEffect(() => {
    try {
      const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
      setSnoozed(Boolean(until && Date.now() < until));
    } catch {
      setSnoozed(false);
    }
  }, []);

  const dismiss = () => {
    setSnoozed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + 30 * 86400000)); // 30 days
    } catch { /* ignore */ }
  };

  const install = async () => {
    const r = await promptInstall();
    if (r !== 'accepted') dismiss();
  };

  // Nothing to show if already installed, snoozed, or no way to install here.
  if (standalone || snoozed) return null;
  if (!canInstall && !isIos) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[60] flex justify-center px-3 pt-3">
      <div className="flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-clay-200 bg-white p-3 shadow-[0_10px_30px_rgba(20,20,19,0.18)]">
        <img src="/pwa-192.png" alt="" className="h-11 w-11 flex-none rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink-900">Install StemCells Protocol</p>
          {isIos && !canInstall ? (
            <p className="text-xs text-ink-700/70">
              Tap the Share icon, then <b>Add to Home Screen</b>.
            </p>
          ) : (
            <p className="text-xs text-ink-700/70">Install the StemCells Protocol app.</p>
          )}
        </div>
        {canInstall && (
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
