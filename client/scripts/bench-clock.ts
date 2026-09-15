/**
 * Validation benchmark for the epigenetic clock used by the StemCells Protocol
 * simulator. It reuses the EXACT production code (`predict` from src/sim/pipeline.ts)
 * so the numbers reported here are the numbers the site computes — this validates
 * the real tool, not a re-implementation.
 *
 * It runs the Horvath-2013 clock over a methylation BETA MATRIX (rows = CpG ids,
 * columns = samples) with known chronological ages, and reports how well predicted
 * DNAm age tracks real age: Pearson r, MAE, median error, per-sample table + CSV.
 *
 * Usage (run from the client/ folder):
 *   npx -y tsx scripts/bench-clock.ts --beta <matrix(.csv|.txt|.gz)> --ages <ages.csv>
 *   npx -y tsx scripts/bench-clock.ts --beta GSE40279_average_beta.txt.gz \
 *        --series-matrix GSE40279_series_matrix.txt.gz --out bench_gse40279.csv
 *
 *   --beta           beta matrix: first column = cg id, header row = sample ids,
 *                    remaining cells = beta (0-1, or 0-100 auto-scaled). .gz ok.
 *   --ages           simple ages file: two columns "sample_id,age" (header ok).
 *   --series-matrix  a GEO *_series_matrix.txt(.gz) to auto-extract ages instead.
 *   --out            results CSV path (default bench-clock-results.csv).
 * Provide EITHER --ages OR --series-matrix.
 */
import { createReadStream } from 'node:fs';
import { writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import COEFFS from '../src/sim/horvath-coeffs.json';
import { predict } from '../src/sim/pipeline';

// ---- clock CpG set (the 353 sites the production clock actually uses) ----
const CLOCK = new Set<string>(((COEFFS as any).sites as { cpg: string }[]).map((s) => s.cpg));

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function lineReader(path: string) {
  const raw = createReadStream(path);
  const stream = path.endsWith('.gz') ? raw.pipe(createGunzip()) : raw;
  return createInterface({ input: stream, crlfDelay: Infinity });
}

function splitCells(line: string): string[] {
  return line.includes('\t') ? line.split('\t') : line.split(',');
}
const unquote = (s: string) => s.trim().replace(/^"|"$/g, '');

// ---- ages from a simple two-column file ----
async function readAgesCsv(path: string): Promise<Map<string, number>> {
  const ages = new Map<string, number>();
  const rl = lineReader(path);
  let first = true;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const c = splitCells(line).map(unquote);
    if (first) { first = false; if (Number.isNaN(parseFloat(c[1]))) continue; } // skip header row
    const id = c[0];
    const age = parseFloat(c[1]);
    if (id && !Number.isNaN(age)) ages.set(id, age);
  }
  return ages;
}

// ---- ages from a GEO series_matrix (maps GSM accession -> age) ----
async function readAgesSeriesMatrix(path: string): Promise<Map<string, number>> {
  const ages = new Map<string, number>();
  let gsms: string[] = [];
  let titles: string[] = [];
  const rl = lineReader(path);
  for await (const line of rl) {
    if (line.startsWith('!Sample_geo_accession')) {
      gsms = splitCells(line).slice(1).map(unquote);
    } else if (line.startsWith('!Sample_title')) {
      titles = splitCells(line).slice(1).map(unquote);
    } else if (line.startsWith('!Sample_characteristics_ch1') && /age/i.test(line)) {
      const vals = splitCells(line).slice(1).map(unquote);
      vals.forEach((v, i) => {
        const m = v.match(/([-+]?\d+(?:\.\d+)?)/);
        if (!m) return;
        const a = parseFloat(m[1]);
        if (!(a > 0 && a < 130)) return;
        // map age by BOTH accession and title — beta-matrix columns may use either
        if (gsms[i]) ages.set(gsms[i], a);
        if (titles[i]) ages.set(titles[i], a);
      });
    }
  }
  return ages;
}

function pearson(a: number[], b: number[]): number {
  const n = a.length; if (n < 2) return NaN;
  const ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n;
  let cov = 0, va = 0, vb = 0;
  for (let i = 0; i < n; i++) { const da = a[i] - ma, db = b[i] - mb; cov += da * db; va += da * da; vb += db * db; }
  return (va === 0 || vb === 0) ? NaN : cov / Math.sqrt(va * vb);
}

async function main() {
  const betaPath = arg('beta');
  const agesPath = arg('ages');
  const seriesPath = arg('series-matrix');
  const outPath = arg('out') || 'bench-clock-results.csv';
  if (!betaPath || (!agesPath && !seriesPath)) {
    console.error('usage: tsx scripts/bench-clock.ts --beta <matrix> (--ages <csv> | --series-matrix <geo>) [--out csv]');
    process.exit(2);
  }

  console.log(`clock: ${(COEFFS as any).clock || 'Horvath2013'} · ${CLOCK.size} CpGs`);
  const ages = seriesPath ? await readAgesSeriesMatrix(seriesPath) : await readAgesCsv(agesPath!);
  console.log(`ages loaded: ${ages.size} samples`);
  // normalized index (strip case + punctuation) for tolerant id matching
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normAges = new Map<string, number>();
  for (const [k, v] of ages) normAges.set(norm(k), v);

  // stream the matrix, keeping only clock CpG rows
  let samples: string[] = [];
  const betasBySample: Record<string, number>[] = [];
  let header = true;
  const rl = lineReader(betaPath);
  for await (const line of rl) {
    if (!line.trim()) continue;
    const cells = splitCells(line);
    if (header) {
      header = false;
      samples = cells.slice(1).map(unquote);
      for (let i = 0; i < samples.length; i++) betasBySample.push({});
      continue;
    }
    const cg = unquote(cells[0]);
    if (!CLOCK.has(cg)) continue;
    for (let i = 0; i < samples.length; i++) {
      let v = parseFloat(cells[i + 1]);
      if (Number.isNaN(v)) continue;
      if (v > 1.5) v = v / 100; // tolerate 0-100
      betasBySample[i][cg] = Math.min(1, Math.max(0, v));
    }
  }
  console.log(`matrix: ${samples.length} sample columns parsed`);

  // resolve sample -> age with a few fallbacks (exact, case-insensitive, strip suffix)
  const ageFor = (s: string): number | undefined => {
    if (ages.has(s)) return ages.get(s);
    const lc = s.toLowerCase();
    for (const [k, v] of ages) if (k.toLowerCase() === lc) return v;
    const base = s.replace(/\.(AVG_Beta|Detection\.Pval)$/i, '').replace(/^X/, '');
    if (ages.has(base)) return ages.get(base);
    const nv = normAges.get(norm(s)); if (nv != null) return nv;
    return undefined;
  };

  const rows: { sample: string; chrono: number; dnam: number; err: number; cov: number }[] = [];
  for (let i = 0; i < samples.length; i++) {
    const chrono = ageFor(samples[i]);
    if (chrono == null) continue;
    const betas = betasBySample[i];
    if (Object.keys(betas).length === 0) continue;
    const r = predict(betas, chrono);
    rows.push({ sample: samples[i], chrono, dnam: Math.round(r.dnamAge * 100) / 100, err: r.dnamAge - chrono, cov: r.coverage });
  }

  if (rows.length === 0) {
    console.error('No samples matched between the matrix and the ages. Check sample-id formats.');
    console.error('  first matrix sample ids : ' + samples.slice(0, 5).join(' | '));
    console.error('  first age keys          : ' + [...ages.keys()].slice(0, 5).join(' | '));
    process.exit(1);
  }

  const preds = rows.map((r) => r.dnam), actual = rows.map((r) => r.chrono);
  const r = pearson(preds, actual);
  const abs = rows.map((r) => Math.abs(r.err)).sort((a, b) => a - b);
  const mae = abs.reduce((s, x) => s + x, 0) / abs.length;
  const medae = abs[Math.floor(abs.length / 2)];
  const meanCov = rows.reduce((s, x) => s + x.cov, 0) / rows.length;

  writeFileSync(outPath, 'sample,chronological_age,dnam_age,error_years,cpg_coverage\n' +
    rows.map((r) => `${r.sample},${r.chrono},${r.dnam},${Math.round(r.err * 100) / 100},${Math.round(r.cov * 1000) / 1000}`).join('\n') + '\n');

  console.log('\n' + '='.repeat(56));
  console.log(`VALIDATION — predicted DNAm age vs chronological age`);
  console.log(`  samples evaluated : ${rows.length}`);
  console.log(`  mean CpG coverage : ${(meanCov * 100).toFixed(1)}%`);
  console.log(`  Pearson r         : ${r.toFixed(3)}`);
  console.log(`  MAE               : ${mae.toFixed(2)} yr`);
  console.log(`  median abs error  : ${medae.toFixed(2)} yr`);
  console.log('='.repeat(56));
  console.log(`per-sample CSV -> ${outPath}`);
  console.log(`(Horvath 2013 reports MAE ~3.6 yr on healthy cohorts — that is the target range.)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
