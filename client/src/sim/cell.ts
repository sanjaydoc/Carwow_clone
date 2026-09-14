// Cellular-outcome layer for the Simulator — an *illustrative reduced model*,
// NOT a molecular whole-cell simulation. Whole-genome sequencing is a blueprint,
// not a snapshot of a living cell's molecular state, and a true molecular sim of
// a human cell is not tractable (it has only ever been done for Mycoplasma
// genitalium, ~500 genes). So this does something honest and feasible instead:
//
//   option 1 — a VARIANT-INFORMED PATHWAY MODEL. A small, hand-built regulatory
//     network (senescence / oxidative-stress / stemness) whose *parameters* are
//     nudged by a handful of aging-relevant genotypes, and whose *initial state*
//     is set by the real methylation-derived signals the rest of the pipeline
//     already computes (epigenetic age, acceleration, coverage, rejuvenation /
//     regeneration index, tumorigenicity).
//   option 3 — the visualiser (SimRun's `cellular` step) animates the model's
//     output as a stylised "cell" — a cartoon driven by numbers, labelled as such.
//
// The network is run twice — untreated vs +therapy — and the difference is what
// the card shows. Everything here is deterministic and bounded to [0,1].

import type { Modality } from './catalog';

// ── variant layer (option 1, input) ────────────────────────────────────────
// We do NOT call variants live from raw WGS in the browser (that's a cluster
// job). For the demo genomes we ship a curated panel of the few genotypes that
// matter for these pathways; for any other/uploaded sample we synthesise an
// *illustrative* panel deterministically from the sample name — clearly flagged.
export interface Variant {
  gene: string; rsid: string; genotype: string; tone: 'protective' | 'risk' | 'neutral'; note: string;
}
interface ParamDelta { antiox?: number; ros_gain?: number; repair?: number; senes_prone?: number; clearance?: number; }

// gene → genotype → (parameter nudges + human note). Additive on the base rates.
const GENE_TABLE: Record<string, { rsid: string; alleles: Record<string, { d: ParamDelta; tone: Variant['tone']; note: string }> }> = {
  SOD2: {
    rsid: 'rs4880',
    alleles: {
      'Ala/Ala': { d: { antiox: 0.04 }, tone: 'protective', note: 'efficient mitochondrial antioxidant (higher ROS clearance)' },
      'Ala/Val': { d: {}, tone: 'neutral', note: 'intermediate antioxidant capacity' },
      'Val/Val': { d: { antiox: -0.04, ros_gain: 0.02 }, tone: 'risk', note: 'less efficient MnSOD import — higher oxidative load' },
    },
  },
  NQO1: {
    rsid: 'rs1800566',
    alleles: {
      'C/C': { d: {}, tone: 'neutral', note: 'normal quinone detox' },
      'C/T': { d: { antiox: -0.02 }, tone: 'risk', note: 'reduced NQO1 detox activity' },
      'T/T': { d: { antiox: -0.04 }, tone: 'risk', note: 'null NQO1 — weakest oxidative-stress defence' },
    },
  },
  APOE: {
    rsid: 'rs429358/rs7412',
    alleles: {
      'ε2/ε3': { d: { clearance: 0.02 }, tone: 'protective', note: 'favourable lipid/clearance profile' },
      'ε3/ε3': { d: {}, tone: 'neutral', note: 'reference APOE genotype' },
      'ε3/ε4': { d: { clearance: -0.02, ros_gain: 0.02 }, tone: 'risk', note: 'ε4 carrier — poorer clearance, more inflammatory load' },
    },
  },
  TP53: {
    rsid: 'rs1042522',
    alleles: {
      'Arg/Arg': { d: {}, tone: 'neutral', note: 'apoptosis-leaning P53 (R72)' },
      'Arg/Pro': { d: { senes_prone: 0.01 }, tone: 'neutral', note: 'mixed P53 codon-72' },
      'Pro/Pro': { d: { senes_prone: 0.03 }, tone: 'risk', note: 'senescence-leaning P53 (P72) — cells arrest rather than clear' },
    },
  },
  FOXO3: {
    rsid: 'rs2802292',
    alleles: {
      'G/G': { d: { repair: 0.04, senes_prone: -0.02 }, tone: 'protective', note: 'longevity-associated FOXO3 (stress resistance)' },
      'G/T': { d: { repair: 0.02 }, tone: 'protective', note: 'one longevity FOXO3 allele' },
      'T/T': { d: {}, tone: 'neutral', note: 'reference FOXO3' },
    },
  },
};
const GENE_ORDER = ['SOD2', 'NQO1', 'APOE', 'TP53', 'FOXO3'];

// curated panels for the shipped demo genomes (keyed by a substring of the sample name)
const CURATED: { match: RegExp; panel: Record<string, string> }[] = [
  { match: /sample1|chronic[_-]?kidney|ckd/i, panel: { SOD2: 'Val/Val', NQO1: 'C/T', APOE: 'ε3/ε4', TP53: 'Pro/Pro', FOXO3: 'T/T' } },
  { match: /sample2|multiple[_-]?sclerosis|\bms\b/i, panel: { SOD2: 'Ala/Val', NQO1: 'C/C', APOE: 'ε3/ε3', TP53: 'Arg/Pro', FOXO3: 'G/T' } },
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function resolvePanel(sample: string): { panel: Record<string, string>; source: 'curated' | 'illustrative' } {
  for (const c of CURATED) if (c.match.test(sample || '')) return { panel: c.panel, source: 'curated' };
  // deterministic illustrative panel from the sample name
  const panel: Record<string, string> = {};
  GENE_ORDER.forEach((g, i) => {
    const alleles = Object.keys(GENE_TABLE[g].alleles);
    panel[g] = alleles[hash(`${sample}:${g}:${i}`) % alleles.length];
  });
  return { panel, source: 'illustrative' };
}

interface Params { antiox: number; ros_gain: number; repair: number; senes_prone: number; clearance: number; }
const BASE_PARAMS: Params = { antiox: 0.14, ros_gain: 0.10, repair: 0.16, senes_prone: 0.10, clearance: 0.05 };

function buildVariants(sample: string): { variants: Variant[]; params: Params; source: 'curated' | 'illustrative' } {
  const { panel, source } = resolvePanel(sample);
  const params: Params = { ...BASE_PARAMS };
  const variants: Variant[] = [];
  for (const gene of GENE_ORDER) {
    const genotype = panel[gene];
    const info = GENE_TABLE[gene].alleles[genotype];
    if (!info) continue;
    for (const [k, v] of Object.entries(info.d)) (params as any)[k] += v as number;
    variants.push({ gene, rsid: GENE_TABLE[gene].rsid, genotype, tone: info.tone, note: info.note });
  }
  // keep every rate positive & sane
  (Object.keys(params) as (keyof Params)[]).forEach((k) => { params[k] = Math.max(0.01, params[k]); });
  return { variants, params, source };
}

// ── the pathway model (option 1, engine) ────────────────────────────────────
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const T = 24; // integration steps (illustrative timescale)

export interface CellState { ros: number; damage: number; p16: number; sen: number; sasp: number; prolif: number; stem: number; }
export interface Endpoint { sen: number; ros: number; sasp: number; prolif: number; stem: number; damage: number; }

function simulate(init: CellState, p: Params, therapy: null | { eff: number; modality: Modality }): { series: CellState[]; end: CellState } {
  let s = { ...init };
  const series: CellState[] = [{ ...s }];
  const isReprog = therapy?.modality === 'reprogramming';
  for (let t = 0; t < T; t++) {
    const ros = s.ros, damage = s.damage, p16 = s.p16, sen = s.sen, sasp = s.sasp, stem = s.stem;
    const ageLoad = 0.5 + 0.5 * damage;
    // therapy terms (0 when untreated)
    const eff = therapy ? therapy.eff : 0;
    const tRos = therapy ? (isReprog ? 0.06 : 0.11) * eff * ros : 0;                 // antioxidant relief
    const tDmg = therapy ? (isReprog ? 0.11 : 0.04) * eff * damage : 0;             // reprogramming resets damage
    const tSen = therapy ? (isReprog ? 0.06 : 0.055) * eff * sen : 0;               // senolytic clearance
    const tSasp = therapy ? (isReprog ? 0.15 : 0.5) * eff : 0;                      // anti-inflammatory (MSC/exosome strong)
    const tStem = therapy ? (isReprog ? 0.10 : 0.03) * eff : 0;                     // stemness / youthful reset

    const nros = clamp01(ros + p.ros_gain * ageLoad - p.antiox * ros - tRos);
    const ndamage = clamp01(damage + 0.20 * nros - p.repair * damage - tDmg);
    const p53 = clamp01(1.2 * ndamage);
    const np16 = clamp01(p16 + p.senes_prone * (0.5 * p53 + 0.5 * sasp) - 0.08 * p16);
    const nsen = clamp01(sen + 0.12 * np16 * (1 - sen) - p.clearance * sen - tSen);
    const nsasp = clamp01(0.7 * nsen + 0.3 * nros - tSasp);
    const nprolif = clamp01(0.2 + 0.6 * (1 - nsen) - 0.2 * np16 + (isReprog ? 0.15 * eff : 0.10 * eff));
    const nstem = clamp01(stem - 0.02 * ndamage + tStem * (0.92 - stem));

    s = { ros: nros, damage: ndamage, p16: np16, sen: nsen, sasp: nsasp, prolif: nprolif, stem: nstem };
    series.push({ ...s });
  }
  return { series, end: s };
}

// ── public API ──────────────────────────────────────────────────────────────
export interface HeadlineMetric { key: string; label: string; untreated: number; treated: number; delta: number; better: 'down' | 'up'; }
export interface CellularOutcome {
  ok: boolean;
  modality: Modality;
  sample: string;
  tissue_key: string;
  variant_source: 'curated' | 'illustrative';
  variants: Variant[];
  pathways: string[];
  drivers: string[];                       // top methylation drivers (gene names) for context
  senescent_series: { untreated: number[]; treated: number[] }; // 0-100, for a sparkline
  endpoint: { untreated: Endpoint; treated: Endpoint; delta: Endpoint };
  headline: HeadlineMetric[];
  basis: string;
  disclaimer: string;
}

export interface CellularInput {
  modality: Modality;
  tissueKey: string;
  sample: string;
  dnamAge: number;
  ageAccel: number | null;
  coverage: number;               // 0-1
  rejuvenationIndex?: number;     // 0-100 (reprogramming)
  regenerationIndex?: number;     // 0-100 (cell therapy)
  cycles?: number;
  drivers?: string[];             // gene names of top methylation targets
}

export function buildCellular(inp: CellularInput): CellularOutcome {
  const modality = inp.modality;
  const isReprog = modality === 'reprogramming';
  const { variants, params, source } = buildVariants(inp.sample || 'patient');

  // initial cell state from the REAL methylation-derived signals
  const gap = Math.max(0, (inp.dnamAge || 20) - 20);          // years above youthful setpoint
  const accel = Math.max(0, inp.ageAccel ?? 0);
  const ageLoad = Math.min(1, gap / 60);
  const sen0 = clamp01(0.05 + ageLoad * 0.7 + accel / 60);
  const ros0 = clamp01(0.20 + ageLoad * 0.4 + accel / 50 + (params.ros_gain - BASE_PARAMS.ros_gain));
  const damage0 = clamp01(0.15 + 0.5 * ros0 + 0.3 * sen0);
  const stem0 = clamp01(0.9 - ageLoad * 0.75);
  const init: CellState = {
    ros: ros0, damage: damage0, p16: clamp01(0.4 * sen0 + 0.2), sen: sen0,
    sasp: clamp01(0.7 * sen0 + 0.3 * ros0), prolif: clamp01(0.2 + 0.6 * (1 - sen0)), stem: stem0,
  };

  // therapy strength from the already-computed index, compounding with cycles
  const cycles = Math.max(1, Math.min(Math.trunc(inp.cycles || 1), 10));
  const idx = (isReprog ? inp.rejuvenationIndex : inp.regenerationIndex) ?? 40;
  const base = Math.max(0.2, Math.min(0.9, idx / 100));
  const eff = base * (1 - Math.pow(1 - 0.45, cycles)) / (1 - Math.pow(1 - 0.45, 10)); // 0..~base, diminishing

  const untreated = simulate(init, params, null);
  const treated = simulate(init, params, { eff, modality });

  const pct = (x: number) => Math.round(x * 100);
  const ep = (e: CellState): Endpoint => ({ sen: pct(e.sen), ros: pct(e.ros), sasp: pct(e.sasp), prolif: pct(e.prolif), stem: pct(e.stem), damage: pct(e.damage) });
  const u = ep(untreated.end), tr = ep(treated.end);
  const delta: Endpoint = { sen: tr.sen - u.sen, ros: tr.ros - u.ros, sasp: tr.sasp - u.sasp, prolif: tr.prolif - u.prolif, stem: tr.stem - u.stem, damage: tr.damage - u.damage };

  const headline: HeadlineMetric[] = isReprog
    ? [
        { key: 'stem', label: 'Youthful epigenetic state', untreated: u.stem, treated: tr.stem, delta: delta.stem, better: 'up' },
        { key: 'sen', label: 'Senescent-cell load', untreated: u.sen, treated: tr.sen, delta: delta.sen, better: 'down' },
        { key: 'damage', label: 'DNA damage', untreated: u.damage, treated: tr.damage, delta: delta.damage, better: 'down' },
        { key: 'ros', label: 'Oxidative stress', untreated: u.ros, treated: tr.ros, delta: delta.ros, better: 'down' },
      ]
    : [
        { key: 'sen', label: 'Senescent-cell load', untreated: u.sen, treated: tr.sen, delta: delta.sen, better: 'down' },
        { key: 'sasp', label: 'Inflammation (SASP)', untreated: u.sasp, treated: tr.sasp, delta: delta.sasp, better: 'down' },
        { key: 'ros', label: 'Oxidative stress', untreated: u.ros, treated: tr.ros, delta: delta.ros, better: 'down' },
        { key: 'prolif', label: 'Proliferative capacity', untreated: u.prolif, treated: tr.prolif, delta: delta.prolif, better: 'up' },
      ];

  const pathways = isReprog
    ? ['Oxidative-stress / DNA-damage', 'p53 → p16 senescence', 'Epigenetic reprogramming (OSK) reset']
    : ['Oxidative-stress / DNA-damage', 'p16 senescence → SASP inflammation', 'MSC / exosome paracrine repair'];

  return {
    ok: true,
    modality, sample: inp.sample || 'patient', tissue_key: inp.tissueKey || 'systemic',
    variant_source: source,
    variants,
    pathways,
    headline,
    drivers: (inp.drivers || []).slice(0, 5),
    senescent_series: {
      untreated: untreated.series.map((s) => pct(s.sen)),
      treated: treated.series.map((s) => pct(s.sen)),
    },
    endpoint: { untreated: u, treated: tr, delta },
    basis: `Illustrative variant-informed pathway model — a small senescence / oxidative-stress network whose starting state is set by this sample's epigenetic age (${Math.round(inp.dnamAge)} yr), acceleration and coverage (${Math.round((inp.coverage || 0) * 100)}%), whose rate parameters are nudged by ${variants.length} aging-relevant ${source === 'curated' ? 'curated genotypes' : 'illustrative genotypes'}, and whose therapy strength (${Math.round(eff * 100)}%) is taken from the ${isReprog ? 'rejuvenation' : 'regeneration'} index over ${cycles} cycle${cycles > 1 ? 's' : ''}. Run untreated vs +therapy.`,
    disclaimer: source === 'curated'
      ? 'Reduced pathway model, not a molecular whole-cell simulation. Genotypes are a demo panel; projections are model estimates, not measured outcomes.'
      : 'Reduced pathway model, not a molecular whole-cell simulation. Genotypes here are illustrative (not called from your file — that needs whole-genome sequencing); projections are model estimates, not measured outcomes.',
  };
}

export function summarizeCellular(c: CellularOutcome): string {
  const top = c.headline[0];
  const dir = top.better === 'up' ? 'raises' : 'lowers';
  const moves = c.headline
    .map((m) => `${m.label} ${m.untreated}%→${m.treated}%`)
    .join(', ');
  return `Cellular-outcome layer (${c.variant_source} genotype panel, ${c.variants.length} variants): reduced ${c.modality === 'reprogramming' ? 'reprogramming' : 'repair'} pathway model — therapy ${dir} ${top.label.toLowerCase()} (${top.untreated}%→${top.treated}%). Endpoint: ${moves}. Illustrative reduced model, not a molecular whole-cell simulation.`;
}
