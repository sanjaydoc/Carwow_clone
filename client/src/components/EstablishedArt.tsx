import type { ReactNode } from 'react';

// On-brand, copyright-safe illustrations for the "Established therapies" rail.
// Each motif depicts the therapy's biological target (eye, neuron, blood cell,
// T-cell, joint, skin…) as a clean line glyph on a branded gradient tile —
// consistent with the site's therapy imagery, unique per card.

export type Motif =
  | 'stemcell' | 'rbc' | 'neuron' | 'eye' | 'tcell' | 'shield'
  | 'intestine' | 'vessel' | 'drop' | 'muscle' | 'joint' | 'skin';

const MOTIF: Record<Motif, ReactNode> = {
  // Budding stem cell (marrow / HSC)
  stemcell: (<>
    <circle cx="10" cy="13" r="6.5" /><circle cx="10" cy="13" r="2.4" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="6.5" r="2.4" />
  </>),
  // Red blood cell + sickle (sickle-cell / thalassaemia)
  rbc: (<>
    <ellipse cx="9" cy="13" rx="6" ry="4.2" /><circle cx="9" cy="13" r="1.5" fill="currentColor" stroke="none" />
    <path d="M16.5 6c3.4 1.8 4.2 6.7 1 9.6-.8-3.4-.8-6-3.2-8" />
  </>),
  // Motor neuron (SMA)
  neuron: (<>
    <circle cx="8" cy="12" r="3.4" /><path d="M8 8.6V5M8 15.4V19M4.6 10 2 8.5M4.6 14 2 15.5" />
    <path d="M11.4 12h4l4.2-2.6M15.4 12l4.2 2.6" /><circle cx="20.5" cy="9" r="1.4" /><circle cx="20.5" cy="15" r="1.4" />
  </>),
  // Eye (retinal / corneal)
  eye: (<>
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3.2" />
  </>),
  // T-cell with surface receptors (CAR-T)
  tcell: (<>
    <circle cx="12" cy="13" r="6" /><circle cx="12" cy="13" r="2" fill="currentColor" stroke="none" />
    <path d="M9 6.5 8 4.5M9 6.5l1.6-1.4M15 6.5l1-2M15 6.5l-1.6-1.4" />
  </>),
  // Shield (immune modulation / GvHD)
  shield: (<>
    <path d="M12 3.2 19 6v5c0 4.2-3 7.2-7 8.4C8 18.2 5 15.2 5 11V6z" /><path d="M9.2 12l2 2 3.6-3.8" />
  </>),
  // Coiled intestine (Crohn's)
  intestine: (<>
    <path d="M6 5c3.2 0 3.2 3.2 0 3.2S2.8 11.4 6 11.4s3.2 3.2 0 3.2 0 3.2 3 3.2h7" />
    <path d="M18 5v6" />
  </>),
  // Blood vessel with flowing cells (limb ischaemia)
  vessel: (<>
    <path d="M3 8c6-2 12-2 18 0M3 16c6 2 12 2 18 0" /><circle cx="8.5" cy="12" r="1.6" /><circle cx="13.5" cy="12" r="1.6" />
  </>),
  // Blood drop + clot cross (haemophilia)
  drop: (<>
    <path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z" /><path d="M9.8 14h4.4M12 11.8v4.4" />
  </>),
  // Muscle fibre bundle (Duchenne)
  muscle: (<>
    <path d="M3 7c5 2.4 13 2.4 18 0M3 12c5 2.4 13 2.4 18 0M3 17c5 2.4 13 2.4 18 0" />
  </>),
  // Knee joint + cartilage band (cartilage repair)
  joint: (<>
    <path d="M8 3c0 3.2 2 4.3 2 6.5M16 3c0 3.2-2 4.3-2 6.5M8 21c0-3.2 2-4.3 2-6.5M16 21c0-3.2-2-4.3-2-6.5" />
    <rect x="7" y="9.5" width="10" height="5" rx="2.5" />
  </>),
  // Skin layers (bioengineered skin)
  skin: (<>
    <path d="M3 7.5h18M3 12h18M3 16.5h18" /><circle cx="7" cy="9.7" r="0.9" fill="currentColor" stroke="none" /><circle cx="13" cy="14.2" r="0.9" fill="currentColor" stroke="none" />
  </>),
};

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export default function EstablishedArt({
  motif,
  accent,
  className = '',
}: {
  motif: Motif;
  accent: string;
  className?: string;
}) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ background: `linear-gradient(160deg, #ffffff 0%, ${hexA(accent, 0.1)} 55%, ${hexA(accent, 0.22)} 100%)` }}
    >
      <svg viewBox="0 0 320 128" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <circle cx="46" cy="26" r="26" fill={accent} opacity="0.08" />
        <circle cx="284" cy="104" r="34" fill={accent} opacity="0.08" />
        <circle cx="288" cy="30" r="9" fill={accent} opacity="0.12" />
      </svg>
      <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-white/85 shadow-sm backdrop-blur" style={{ color: accent }}>
        <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {MOTIF[motif]}
        </svg>
      </div>
    </div>
  );
}
