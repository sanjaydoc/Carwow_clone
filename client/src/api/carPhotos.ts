// Fetches a real, model-specific car photo for a given make/model using the
// Wikipedia REST summary API (CORS-enabled, no API key). The image itself is
// served from Wikimedia Commons. Results are cached in-memory and in
// localStorage so we only hit the network once per model.

const memCache = new Map<string, string | null>();

// Wikipedia article titles for models whose "<make> <model>" doesn't map
// cleanly to the right article.
const TITLE_OVERRIDES: Record<string, string> = {
  'Ford Puma': 'Ford Puma (crossover)',
  'Skoda Octavia': 'Škoda Octavia',
  'Mercedes-Benz GLC': 'Mercedes-Benz GLC-Class',
  'Land Rover Defender': 'Land Rover Defender (L663)',
  'MINI Cooper': 'Mini Hatch',
  'Volkswagen ID.3': 'Volkswagen ID.3',
};

function upscale(url: string): string {
  // Wikimedia thumbnails look like .../330px-Name.jpg — bump to 800px.
  return url.replace(/\/\d+px-/, '/800px-');
}

export async function getCarPhoto(make: string, model: string): Promise<string | null> {
  const key = `${make} ${model}`;
  if (memCache.has(key)) return memCache.get(key) ?? null;

  const lsKey = `carphoto:${key}`;
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(lsKey) : null;
  if (stored !== null) {
    const val = stored || null;
    memCache.set(key, val);
    return val;
  }

  const title = TITLE_OVERRIDES[key] ?? key;
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) throw new Error('not found');
    const data = await res.json();
    const thumb: string | undefined = data?.thumbnail?.source;
    const url = thumb ? upscale(thumb) : null;
    memCache.set(key, url);
    try {
      localStorage.setItem(lsKey, url ?? '');
    } catch {
      /* ignore quota */
    }
    return url;
  } catch {
    memCache.set(key, null);
    return null;
  }
}
