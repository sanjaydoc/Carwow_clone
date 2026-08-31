import { useEffect, useRef, useState } from 'react';
import { createLabBand, DARK, LIGHT, STEP_CAPTIONS, type LabBand } from '../lib/labBand';

const TITLES = ['Sample', 'Sequence', 'Analyse', 'Vector', 'Molecules', 'Safety'];

/**
 * Animated "live lab activity" band for the Simulator header.
 * - `step` (0–5): progress-driven active scene (local pipeline).
 * - `autoplay`: cycle the scenes on a timer (public demo, no live progress).
 * - `dark`: use the dark palette (for the dark hero on the public page).
 * Hovering a pip previews that step's scene. Purely decorative; additive.
 */
export default function SimHeaderBand({
  step = 0, autoplay = false, dark = false,
}: { step?: number; autoplay?: boolean; dark?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bandRef = useRef<LabBand | null>(null);
  const [shown, setShown] = useState(0);
  const [preview, setPreview] = useState<number | null>(null);

  // create once
  useEffect(() => {
    if (!canvasRef.current) return;
    const band = createLabBand(canvasRef.current, {
      palette: dark ? DARK : LIGHT,
      onStep: (i) => setShown(i),
    });
    bandRef.current = band;
    return () => band.destroy();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { bandRef.current?.setPalette(dark ? DARK : LIGHT); }, [dark]);
  useEffect(() => { if (!autoplay) bandRef.current?.setStep(step); }, [step, autoplay]);

  // autoplay: advance the active scene on a timer
  useEffect(() => {
    if (!autoplay) return;
    let i = 0; bandRef.current?.setStep(0);
    const id = setInterval(() => { i = (i + 1) % 6; bandRef.current?.setStep(i); }, 2600);
    return () => clearInterval(id);
  }, [autoplay]);

  const sub = dark ? 'text-white/50' : 'text-ink-700/50';

  return (
    <div className="w-full">
      <div className={`relative w-full overflow-hidden rounded-xl ${dark ? 'bg-white/[0.03] ring-1 ring-white/10' : 'bg-cream-100 ring-1 ring-ink-900/5'}`}
           style={{ height: 128 }}>
        <canvas ref={canvasRef} className="block h-full w-full" />
        <span className={`pointer-events-none absolute left-3 bottom-2 font-mono text-[10px] uppercase tracking-wider ${sub}`}>
          {STEP_CAPTIONS[shown]}
        </span>
        <span className={`pointer-events-none absolute right-3 top-2.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest ${sub}`}>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 sim-live-dot" /> live
        </span>
      </div>

      {/* pip rail — progress + hover preview */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {TITLES.map((t, i) => {
          const state = i === (preview ?? shown) ? 'active' : i < step ? 'done' : 'idle';
          const base = dark ? 'border-white/15 text-white/60' : 'border-ink-900/10 text-ink-700/60';
          const cls = state === 'active'
            ? 'border-clay-500 text-clay-600 bg-clay-500/10'
            : state === 'done'
              ? (dark ? 'border-white/25 text-white/80' : 'border-clay-500/30 text-ink-800')
              : base;
          return (
            <button
              key={t}
              type="button"
              onMouseEnter={() => { setPreview(i); bandRef.current?.setPreview(i); }}
              onMouseLeave={() => { setPreview(null); bandRef.current?.setPreview(null); }}
              onFocus={() => { setPreview(i); bandRef.current?.setPreview(i); }}
              onBlur={() => { setPreview(null); bandRef.current?.setPreview(null); }}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${cls}`}
            >
              <span className="tabular-nums opacity-70">{i + 1}</span>{t}
            </button>
          );
        })}
      </div>
      <style>{`.sim-live-dot{animation:simlivepulse 2.4s infinite}@keyframes simlivepulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,.5)}70%{box-shadow:0 0 0 6px transparent}100%{box-shadow:0 0 0 0 transparent}}@media (prefers-reduced-motion:reduce){.sim-live-dot{animation:none}}`}</style>
    </div>
  );
}
