// Generates client/src/api/staticData.ts from the canonical therapy catalogue
// (server/src/db/therapies.js) so the static/Pages dataset never drifts from
// the server seed. Run: node scripts/gen-staticdata.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { therapies } from '../server/src/db/therapies.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, '../client/src/api/staticData.ts');

const rows = therapies.map((t, i) => ({ id: i + 1, ...t }));

const body =
  `// AUTO-GENERATED demo dataset (mirrors the server seed) for the static/Pages build.\n` +
  `// Do not edit by hand — run \`node scripts/gen-staticdata.mjs\` to regenerate.\n` +
  `import type { Car } from '../types';\n\n` +
  `export const CARS: Car[] = ${JSON.stringify(rows, null, 2)};\n`;

writeFileSync(out, body, 'utf8');
console.log(`✅ Wrote ${rows.length} therapies to ${out}`);
