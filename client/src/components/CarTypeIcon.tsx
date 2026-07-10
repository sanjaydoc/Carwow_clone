// Clean line-art body-type silhouettes, in the style of carwow's
// "Browse by car type" tiles. Stroke-only outlines, no fill.

const wheels = (
  <>
    <circle cx="36" cy="50" r="8" />
    <circle cx="88" cy="50" r="8" />
  </>
);

const PATHS: Record<string, string> = {
  // taller, boxy cabin
  SUV: 'M8,50 L10,32 Q11,25 19,25 L38,25 L48,15 Q52,12 60,12 L86,12 Q94,12 98,19 L106,27 L114,32 L116,50',
  // sloped tailgate
  Hatchback: 'M8,50 L11,36 Q12,30 20,30 L40,30 L50,19 Q54,15 62,15 L80,16 Q88,18 92,26 L104,32 L114,37 L116,50',
  // three-box with boot
  Saloon: 'M8,50 L11,38 L30,38 L46,23 Q50,19 60,19 L76,19 Q84,20 88,28 L106,38 L116,40 L116,50',
  // low two-box sloping roof
  Coupe: 'M8,50 L14,37 L36,26 Q48,16 66,16 Q86,18 98,30 L110,37 L116,41 L116,50',
  // long roof to the rear
  Estate: 'M8,50 L10,34 Q11,27 19,27 L42,27 L52,16 Q56,12 64,12 L100,12 Q108,12 110,20 L114,30 L116,36 L116,50',
  // tall MPV cabin
  'People carriers': 'M8,50 L9,30 Q10,20 22,20 L42,18 L50,13 Q54,11 60,11 L96,12 Q104,13 106,22 L112,34 L116,40 L116,50',
  // very low, long bonnet
  'Sports cars': 'M6,50 L16,40 L42,31 Q64,20 88,25 Q104,28 114,38 L118,42 L118,50',
  // open top with windscreen only
  Convertibles: 'M8,50 L16,38 L42,33 L50,25 L57,33 L96,33 Q106,34 110,40 L116,44 L116,50',
};

export default function CarTypeIcon({ type, className = '' }: { type: string; className?: string }) {
  const d = PATHS[type] ?? PATHS.Hatchback;
  return (
    <svg
      viewBox="0 0 124 64"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={`${type} icon`}
    >
      <path d={d} />
      {wheels}
      <circle cx="36" cy="50" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="88" cy="50" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
