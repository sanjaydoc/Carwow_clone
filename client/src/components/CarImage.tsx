import { useEffect, useState } from 'react';
import { DepartmentIcon } from './icons';

interface Props {
  accent: string;
  className?: string;
  bodyType?: string; // therapy category
  make?: string; // department
  model?: string; // therapy name
  year?: number;
  angle?: number;
}

// Real clinical photography per department (loads in the visitor's browser),
// layered over an accent-tinted gradient. If the photo fails to load we fall
// back to a clean department glyph — so a card never breaks.
//
// Photos come from a keyword image service, keyed to the department and made
// stable per-therapy via a deterministic `lock` seed.
const DEPT_TAGS: Record<string, string> = {
  'Age Rejuvenation': 'laboratory,science',
  Dental: 'dentist,dental',
  Orthopedics: 'orthopedic,knee',
  Cardiology: 'cardiology,heart',
  Gastroenterology: 'gastroenterology,medical',
  Neurology: 'neurology,brain',
  Pulmonology: 'lungs,respiratory',
  Cosmetic: 'skincare,cosmetic',
};

// Stable small integer from a string, so each therapy keeps the same photo.
function seed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
  return h;
}

function photoUrl(make: string, model: string): string {
  const tags = DEPT_TAGS[make] ?? 'medical,hospital';
  return `https://loremflickr.com/640/420/${tags}?lock=${seed(make + model)}`;
}

export default function CarImage({ accent, className = '', make = '', model = '' }: Props) {
  const [failed, setFailed] = useState(false);
  // Reset the error state if the therapy changes (component reuse across routes).
  useEffect(() => setFailed(false), [make, model]);

  const showPhoto = Boolean(make && model) && !failed;

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(160deg, #ffffff 0%, ${hexA(accent, 0.1)} 60%, ${hexA(accent, 0.2)} 100%)`,
      }}
    >
      {/* branded gradient + glyph — always present as the backdrop / fallback */}
      <svg
        viewBox="0 0 320 176"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <circle cx="44" cy="34" r="26" fill={accent} opacity="0.08" />
        <circle cx="280" cy="140" r="34" fill={accent} opacity="0.08" />
        <circle cx="286" cy="40" r="10" fill={accent} opacity="0.12" />
        <circle cx="40" cy="150" r="7" fill={accent} opacity="0.14" />
      </svg>
      <div
        className="relative grid h-20 w-20 place-items-center rounded-2xl bg-white/80 shadow-sm backdrop-blur"
        style={{ color: accent }}
      >
        <DepartmentIcon name={make} className="h-11 w-11" strokeWidth={1.6} />
      </div>

      {/* real clinical photo on top; hides itself (revealing the glyph) on error */}
      {showPhoto && (
        <img
          src={photoUrl(make, model)}
          alt={`${make} — ${model}`}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      )}
    </div>
  );
}

// Turn a #rrggbb hex into an rgba() string with the given alpha.
function hexA(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
