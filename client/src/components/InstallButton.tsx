import { usePwa } from '../context/PwaContext';

// Manual "Install app" trigger. Renders nothing when the app is already
// installed or the browser has no install prompt available (e.g. iOS Safari,
// where users install via Share → Add to Home Screen).
export default function InstallButton({ className }: { className?: string }) {
  const { canInstall, standalone, promptInstall } = usePwa();
  if (standalone || !canInstall) return null;
  return (
    <button
      type="button"
      onClick={() => promptInstall()}
      className={
        className ||
        'inline-flex items-center gap-2 rounded-full bg-clay-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-clay-600'
      }
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v12M7 11l5 5 5-5M5 21h14" />
      </svg>
      Install app
    </button>
  );
}
