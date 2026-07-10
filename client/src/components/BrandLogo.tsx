import { useState } from 'react';

// Real manufacturer logos from the open car-logos dataset (served via
// raw.githubusercontent). Falls back to a lettered badge if a logo is missing.
const slug = (make: string) =>
  make.toLowerCase().replace(/\s+/g, '-').replace('š', 's');

const OVERRIDES: Record<string, string> = {
  MINI: 'mini',
  'Mercedes-Benz': 'mercedes-benz',
  'Land Rover': 'land-rover',
};

export default function BrandLogo({ make }: { make: string }) {
  const [failed, setFailed] = useState(false);
  const name = OVERRIDES[make] ?? slug(make);
  const src = `https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/${name}.png`;

  if (failed) {
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream-200 text-sm font-extrabold text-ink-700">
        {make.charAt(0)}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={`${make} logo`}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-9 w-9 shrink-0 object-contain"
    />
  );
}
