// Universal Synthesizer — turns a catalogue therapy (Car record, repurposed as a
// therapy) into a printable "therapy kit" recipe: the ORGANIC component (the cells
// or vesicles, derived from the patient's genome) and the INORGANIC component (the
// physical kit — vial, delivery device, disposables), plus print parameters and a
// simulated QC report. All deterministic + client-side; this is an investor demo,
// not a real manufacturing spec.

import type { Car } from '../types';

export type CellClass = 'MSC' | 'HSC' | 'iPSC' | 'Exosome' | 'Immune' | 'Other';

export interface OrganicSpec {
  cellClass: CellClass;
  productName: string;      // e.g. "Umbilical-cord MSC" / "MSC-derived exosomes"
  source: string;          // Autologous / Allogeneic
  dose: string;            // headline dose printed into the vial
  doseNumeric: string;     // the raw count, for the animation
  bioInkMl: number;        // volume of bio-ink extruded
  factors: string[];       // growth factors / media supplements co-printed
}

export interface InorganicItem { name: string; qty: string; material: string; }

export interface InorganicSpec {
  vial: string;
  delivery: string;        // device matched to the therapy's route
  items: InorganicItem[];
  polymerLayers: number;   // 3D-print layers for the kit hardware
}

export interface QCRow { label: string; value: string; pass: boolean; }

export interface PrintStage { key: string; label: string; detail: string; kind: 'genome' | 'organic' | 'inorganic' | 'qc' | 'done'; }

export interface KitRecipe {
  therapyId: number;
  therapyName: string;
  department: string;
  accent: string;
  organic: OrganicSpec;
  inorganic: InorganicSpec;
  qc: QCRow[];
  stages: PrintStage[];
  batchId: string;
  estSeconds: number;      // simulated print time
  personalized: boolean;   // genome supplied?
  patientId: string;
  route: string;
}

// tiny deterministic hash → stable pseudo-values so a given therapy+patient always
// prints the same batch. Not cryptographic; just for a repeatable demo.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0);
}
function pick<T>(seed: number, arr: T[]): T { return arr[seed % arr.length]; }
function between(seed: number, lo: number, hi: number, dp = 0): number {
  const v = lo + ((seed % 1000) / 1000) * (hi - lo);
  return Number(v.toFixed(dp));
}

export function cellClassOf(car: Car): CellClass {
  const bt = (car.body_type || '').toLowerCase();
  if (bt.includes('exosome')) return 'Exosome';
  if (bt.includes('ipsc')) return 'iPSC';
  if (bt.includes('hsc')) return 'HSC';
  if (bt.includes('msc')) return 'MSC';
  if (bt.includes('immune') || bt.includes('car') || bt.includes('nk') || bt.includes('t-cell')) return 'Immune';
  return 'Other';
}

function organicFor(car: Car, cls: CellClass, seed: number, personalized: boolean): OrganicSpec {
  const source = personalized
    ? 'Autologous (from patient genome)'
    : (car.fuel_type && /auto/i.test(car.fuel_type) ? 'Autologous' : 'Allogeneic (master cell bank)');
  const engine = car.engine || '';
  switch (cls) {
    case 'Exosome': {
      const parts = between(seed, 3, 9, 0); // ×10^11 particles
      return {
        cellClass: cls, productName: engine || 'MSC-derived exosomes', source,
        dose: `${parts} × 10¹¹ particles`, doseNumeric: `${parts}e11`,
        bioInkMl: between(seed >> 2, 2, 5, 1),
        factors: ['CD9 / CD63 / CD81 tetraspanins', 'miRNA cargo panel', 'Lyophilisation excipient'],
      };
    }
    case 'HSC': {
      const cd34 = between(seed, 2, 8, 1); // ×10^6 CD34+ /kg
      return {
        cellClass: cls, productName: engine || 'CD34+ haematopoietic stem cells', source,
        dose: `${cd34} × 10⁶ CD34+ / kg`, doseNumeric: `${cd34}e6/kg`,
        bioInkMl: between(seed >> 2, 10, 25, 0),
        factors: ['SCF · TPO · FLT3-L', 'Cryoprotectant (DMSO 10%)'],
      };
    }
    case 'iPSC': {
      const m = between(seed, 5, 20, 0);
      return {
        cellClass: cls, productName: engine || 'iPSC-derived lineage cells', source,
        dose: `${m} × 10⁶ differentiated cells`, doseNumeric: `${m}e6`,
        bioInkMl: between(seed >> 2, 3, 8, 1),
        factors: ['OSK reprogramming factors', 'Lineage induction cocktail', 'Residual-iPSC clearance step'],
      };
    }
    case 'Immune': {
      const m = between(seed, 50, 500, 0);
      return {
        cellClass: cls, productName: engine || 'Engineered immune cells', source,
        dose: `${m} × 10⁶ cells`, doseNumeric: `${m}e6`,
        bioInkMl: between(seed >> 2, 5, 15, 0),
        factors: ['Chimeric antigen receptor construct', 'IL-2 / IL-7 / IL-15 expansion', 'Activation beads'],
      };
    }
    case 'MSC':
    default: {
      const m = between(seed, 50, 200, 0);
      return {
        cellClass: cls === 'Other' ? 'Other' : 'MSC',
        productName: engine || 'Mesenchymal stromal cells', source,
        dose: `${m} × 10⁶ MSC / vial`, doseNumeric: `${m}e6`,
        bioInkMl: between(seed >> 2, 4, 10, 1),
        factors: ['Platelet-lysate media', 'FGF-2 / TGF-β', 'Cryoprotectant (DMSO 10%)'],
      };
    }
  }
}

function deviceForRoute(route: string): string {
  const r = (route || '').toLowerCase();
  if (r.includes('intra-articular') || r.includes('joint')) return 'Intra-articular injection syringe (22G)';
  if (r.includes('intrathecal') || r.includes('csf')) return 'Intrathecal delivery kit (spinal, 25G)';
  if (r.includes('intra-coronary') || r.includes('cardiac')) return 'Intra-coronary infusion catheter';
  if (r.includes('topical') || r.includes('scalp') || r.includes('facial')) return 'Micro-needle applicator array';
  if (r.includes('intra-') || r.includes('local')) return 'Local injection syringe (25G)';
  return 'IV infusion set + 100 mL carrier bag';
}

function inorganicFor(car: Car, cls: CellClass, seed: number): InorganicSpec {
  const route = car.transmission || 'IV infusion';
  const items: InorganicItem[] = [
    { name: 'Cryovial, sealed', qty: '1', material: 'USP-VI cyclic-olefin polymer' },
    { name: deviceForRoute(route), qty: '1', material: 'medical PP / PE + steel' },
    { name: 'Sterile transfer needles', qty: '2', material: 'stainless 316L' },
    { name: 'Alcohol swabs · gloves', qty: '4', material: 'nonwoven / nitrile' },
    { name: 'Cold-chain gel insert', qty: '1', material: 'phase-change gel' },
    { name: 'Batch label + QR passport', qty: '1', material: 'thermal film' },
  ];
  if (cls === 'Exosome') items.splice(1, 0, { name: 'Reconstitution diluent ampoule', qty: '1', material: 'borosilicate glass' });
  return {
    vial: cls === 'Exosome' ? 'Lyophilised 3 mL vial' : '5 mL cryovial',
    delivery: deviceForRoute(route),
    items,
    polymerLayers: between(seed, 180, 340, 0),
  };
}

function qcFor(seed: number, cls: CellClass): QCRow[] {
  const via = between(seed, 92, 99, 1);
  const endo = between(seed >> 3, 1, 4, 2) / 10; // EU/mL
  const potency = between(seed >> 5, 88, 112, 0);
  const dose = between(seed >> 7, 97, 103, 1);
  return [
    { label: 'Viability', value: `${via}%`, pass: via >= 90 },
    { label: 'Sterility (14-day)', value: 'No growth', pass: true },
    { label: 'Endotoxin', value: `${endo.toFixed(2)} EU/mL`, pass: endo < 0.5 },
    { label: 'Potency (rel. reference)', value: `${potency}%`, pass: potency >= 80 && potency <= 120 },
    { label: 'Dose accuracy', value: `${dose}%`, pass: dose >= 95 && dose <= 105 },
    { label: cls === 'iPSC' ? 'Residual iPSC (Lin28/Nanog)' : 'Identity (flow panel)', value: cls === 'iPSC' ? 'Below LoD' : 'Confirmed', pass: true },
  ];
}

function stagesFor(cls: CellClass, personalized: boolean): PrintStage[] {
  const organicLabel =
    cls === 'Exosome' ? 'Print exosome bio-ink into vial'
    : cls === 'iPSC' ? 'Reprogram → differentiate → bioprint cells'
    : cls === 'HSC' ? 'Mobilise → select CD34+ → bioprint'
    : cls === 'Immune' ? 'Engineer receptor → expand → bioprint'
    : 'Expand cells → bioprint into vial';
  return [
    { key: 'genome', kind: 'genome', label: personalized ? 'Read genome / methylation' : 'Load master cell bank', detail: personalized ? 'Deriving autologous cell line from the patient file' : 'No genome supplied — using allogeneic bank line' },
    { key: 'org1', kind: 'organic', label: 'Synthesise organic bio-ink', detail: 'Culturing living matter + growth factors' },
    { key: 'org2', kind: 'organic', label: organicLabel, detail: 'Extruding living cells at target dose' },
    { key: 'inorg', kind: 'inorganic', label: 'Fabricate inorganic kit', detail: 'Layer-by-layer print of vial, device & disposables' },
    { key: 'qc', kind: 'qc', label: 'Quality control + seal', detail: 'Viability · sterility · potency · dose' },
    { key: 'done', kind: 'done', label: 'Therapy kit ready', detail: 'Sealed, labelled, cold-chain packed' },
  ];
}

export function synthesize(
  car: Car,
  opts: { personalized: boolean; patientId?: string; age?: number | null },
): KitRecipe {
  const cls = cellClassOf(car);
  const seed = hash(`${car.id}:${car.model}:${opts.patientId || 'bank'}`);
  const organic = organicFor(car, cls, seed, opts.personalized);
  const inorganic = inorganicFor(car, cls, seed);
  const qc = qcFor(seed, cls);
  const stages = stagesFor(cls, opts.personalized);
  const batchId = `SP-${pick(seed, ['MSC', 'EXO', 'HSC', 'IPS', 'IMM'])}-${(seed % 900000 + 100000)}`;
  const estSeconds = between(seed, 40, 90, 0);
  return {
    therapyId: car.id,
    therapyName: `${car.make} · ${car.model}`,
    department: car.make,
    accent: car.accent,
    organic, inorganic, qc, stages, batchId, estSeconds,
    personalized: opts.personalized,
    patientId: opts.patientId || 'ALLO-BANK',
    route: car.transmission || 'IV infusion',
  };
}
