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

// A single bundled, professional clinical photo (operating theatre) is used for
// every therapy card when present. Drop the file at
//   client/public/therapy/theatre.jpg
// and it is served at `${BASE_URL}therapy/theatre.jpg`. If it is missing or
// fails to load, we fall back to a clean accent-tinted gradient + department
// glyph — so a card never breaks and never shows an irrelevant image.
const CLINICAL_PHOTO = `${import.meta.env.BASE_URL}therapy/theatre.jpg`;

export default function CarImage({ accent, className = '', make = '', model = '' }: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [make, model]);

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(160deg, #ffffff 0%, ${hexA(accent, 0.1)} 60%, ${hexA(accent, 0.2)} 100%)`,
      }}
    >
      {/* branded gradient + glyph — the backdrop and the fallback */}
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

      {/* bundled clinical photo on top; hides itself (revealing the glyph) if absent */}
      {!failed && (
        <img
          src={CLINICAL_PHOTO}
          alt="Clinical treatment"
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
