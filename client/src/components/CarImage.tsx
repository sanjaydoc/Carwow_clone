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

// Card photography, in priority order:
//   1. a real photo the clinic supplied, bundled at public/therapy/<file>
//   2. otherwise a license-clean Wikimedia Commons clinical photo (interim)
//   3. otherwise a clean accent-tinted gradient + department glyph (fallback)
// So a card never breaks and never shows an irrelevant image.

// Per-therapy bundled photos (checked first, keyed by therapy name).
const BY_MODEL: Record<string, string> = {
  'Hair Restoration Exosome': 'hair-exosome.jpg',
};

// Per-department bundled, clinic-supplied photos (added as they are provided).
const LOCAL: Record<string, string> = {
  'Age Rejuvenation': 'age-rejuvenation.jpg',
};

// Interim Wikimedia Commons photos for departments without a supplied image.
const COMMONS: Record<string, string> = {
  Dental: 'Surgeons in the operating room.jpg',
  Orthopedics: 'Operating room.jpg',
  Cardiology: 'Cardiac surgery operating room.jpg',
  Gastroenterology: 'Endoscopy Surgery.jpg',
  Neurology: 'Surgeons in the operating room.jpg',
  Pulmonology: 'Operating room.jpg',
  Cosmetic: 'Surgeons in the operating room.jpg',
};
const DEFAULT_PHOTO = 'Surgeons in the operating room.jpg';

function photoUrl(make: string, model: string): string {
  const base = import.meta.env.BASE_URL;
  if (BY_MODEL[model]) return `${base}therapy/${BY_MODEL[model]}`;
  if (LOCAL[make]) return `${base}therapy/${LOCAL[make]}`;
  const file = COMMONS[make] ?? DEFAULT_PHOTO;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=800`;
}

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

      {/* real clinical photo on top; hides itself (revealing the glyph) on error */}
      {Boolean(make) && !failed && (
        <img
          src={photoUrl(make, model)}
          alt={`${make} clinical treatment`}
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
