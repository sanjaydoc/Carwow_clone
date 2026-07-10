import { useEffect, useState } from 'react';
import { getCarPhoto } from '../api/carPhotos';

interface Props {
  accent: string;
  className?: string;
  bodyType?: string;
  make?: string;
  model?: string;
  year?: number;
  angle?: number;
}

// Studio-style car render from the imagin.studio CDN (clean per-model imagery,
// the same style used by sites like Carwow).
function imaginUrl(make: string, model: string, year?: number, angle = 23) {
  const params = new URLSearchParams({
    customer: 'hrjavascript-mastery',
    make: make.toLowerCase().replace(/\s+/g, '-'),
    modelFamily: model.toLowerCase().replace(/\s+/g, '-'),
    zoomType: 'fullscreen',
    angle: String(angle),
  });
  if (year) params.set('modelYear', String(year));
  return `https://cdn.imagin.studio/getImage?${params.toString()}`;
}

// Real car imagery with graceful degradation:
//   1. imagin.studio studio render (transparent, per-model)
//   2. Wikipedia/Wikimedia real photo (on failure)
//   3. clean vector illustration (last resort / decorative use)
export default function CarImage({
  accent,
  className = '',
  bodyType = 'Hatchback',
  make,
  model,
  year,
  angle,
}: Props) {
  const [imaginFailed, setImaginFailed] = useState(false);
  const [wikiSrc, setWikiSrc] = useState<string | null | undefined>(undefined);
  const [wikiFailed, setWikiFailed] = useState(false);

  useEffect(() => {
    if (imaginFailed && make && model && wikiSrc === undefined) {
      getCarPhoto(make, model).then(setWikiSrc).catch(() => setWikiSrc(null));
    }
  }, [imaginFailed, make, model, wikiSrc]);

  const showImagin = Boolean(make && model) && !imaginFailed;
  const showWiki = Boolean(make && model) && imaginFailed && Boolean(wikiSrc) && !wikiFailed;

  return (
    <div className={`relative overflow-hidden bg-gradient-to-b from-white to-cream-200 ${className}`}>
      {showImagin ? (
        <img
          src={imaginUrl(make!, model!, year, angle)}
          alt={`${make} ${model}`}
          loading="lazy"
          onError={() => setImaginFailed(true)}
          className="h-full w-full object-contain p-2"
          draggable={false}
        />
      ) : showWiki ? (
        <img
          src={wikiSrc!}
          alt={`${make} ${model}`}
          loading="lazy"
          onError={() => setWikiFailed(true)}
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <Illustration accent={accent} bodyType={bodyType} />
      )}
    </div>
  );
}

function Illustration({ accent, bodyType }: { accent: string; bodyType: string }) {
  const tall = bodyType === 'SUV' || bodyType === 'Estate';
  const roofY = tall ? 26 : 32;
  return (
    <svg
      viewBox="0 0 320 170"
      className="h-full w-full"
      role="img"
      aria-label="Car illustration"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={`body-${accent}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.95" />
          <stop offset="100%" stopColor={accent} />
        </linearGradient>
      </defs>
      <ellipse cx="160" cy="140" rx="118" ry="12" fill={accent} opacity="0.12" />
      <g>
        <path
          d={`M40 120 L48 92 C52 80 60 74 74 74 L${tall ? 116 : 120} 74
             L${tall ? 150 : 158} ${roofY + 22} C${tall ? 154 : 162} ${roofY + 8} ${tall ? 164 : 172} ${roofY} ${tall ? 182 : 188} ${roofY}
             L214 ${roofY} C232 ${roofY} 244 ${roofY + 10} 250 ${roofY + 24}
             L262 74 C280 76 292 84 296 100 L300 120 C300 126 296 130 290 130
             L50 130 C44 130 40 126 40 120 Z`}
          fill={`url(#body-${accent})`}
        />
        <path d={`M118 72 L${tall ? 150 : 156} ${roofY + 20} L184 ${roofY + 20} L184 72 Z`} fill="#FFFFFF" opacity="0.85" />
        <path d={`M192 72 L192 ${roofY + 4} L212 ${roofY + 4} C226 ${roofY + 4} 234 ${roofY + 12} 238 ${roofY + 22} L242 72 Z`} fill="#FFFFFF" opacity="0.85" />
        <line x1="188" y1="74" x2="188" y2="126" stroke="#141413" strokeOpacity="0.12" strokeWidth="2" />
        <rect x="288" y="102" width="12" height="10" rx="3" fill="#FFF7E6" />
      </g>
      <g>
        <circle cx="102" cy="130" r="22" fill="#141413" />
        <circle cx="102" cy="130" r="10" fill="#F0EEE6" />
        <circle cx="228" cy="130" r="22" fill="#141413" />
        <circle cx="228" cy="130" r="10" fill="#F0EEE6" />
      </g>
    </svg>
  );
}
