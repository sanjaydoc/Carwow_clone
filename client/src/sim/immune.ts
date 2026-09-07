// Step 8 — Immune & Adverse-Event Safety Envelope.
//
// The r/stemcells reality: most reported harms from MSC / cell therapy are NOT
// tumorigenicity (that's the iPSC/OSK concern of Step 7) — they're inflammatory,
// embolic, immune and procedural events (swelling, pain, infusion reactions,
// IBMIR clotting, disease flares, infection). This module estimates a
// per-patient, per-therapy RELATIVE risk across those classes.
//
// Two-layer model (see the approved table):
//   Layer 1 — clinical:  route/tissue baseline × comorbidity modifiers
//   Layer 2 — epigenetic: age-acceleration (inflammaging proxy) personalizes it
//   × dose/cycles.
//
// Comorbidities are chosen from a DEPARTMENT-GROUPED taxonomy of named
// conditions (CONDITIONS). Each condition maps to one or more mechanistic
// risk BUCKETS (BUCKET_MULT); many conditions can be selected, and their
// buckets are unioned (each bucket applies once — no double counting).
//
// HONESTY (hard boundary — mirrored in the UI/PDF): a methylation file is NOT a
// genotype, so this CANNOT see HLA type or clotting variants, and it cannot see
// the product/clinic. It gives a RELATIVE, probabilistic read (never a yes/no
// verdict) plus the tests to ask a clinician for. Not medical advice.
//
// Parity target: simulator-backend/app/scoring/immune.py (identical tables/formula).

// ---- adverse-event classes -------------------------------------------------
export type AEKey = 'local' | 'infusion' | 'embolic' | 'immune' | 'conditioning' | 'procedural';

export const AE_LABEL: Record<AEKey, string> = {
  local: 'Local inflammatory',
  infusion: 'Infusion / systemic reaction',
  embolic: 'Pulmonary embolic / clotting (IBMIR)',
  immune: 'Immune reaction / disease flare',
  conditioning: 'Conditioning toxicity + infection',
  procedural: 'Procedural / access',
};

const AE_SYMPTOMS: Record<AEKey, string[]> = {
  local: ['injection-site pain', 'swelling / effusion', 'stiffness', 'warmth (transient synovitis)'],
  infusion: ['fever / chills', 'fatigue', 'headache', 'nausea', 'flushing'],
  embolic: ['breathlessness / chest tightness', 'clotting activation (IBMIR)', 'rare pulmonary embolism'],
  immune: ['immune reaction', 'flare of the underlying disease', 'allo-sensitization (anti-HLA antibodies)'],
  conditioning: ['cytopenias', 'neutropenic fever', 'mucositis', 'hair loss', 'serious infection'],
  procedural: ['procedure-site pain / bruising', 'transient fever', 'procedural infection'],
};

// Route-specific procedural symptom wording (overrides the generic list above).
const PROCEDURAL_BY_TISSUE: Record<string, string[]> = {
  cns: ['post-lumbar-puncture headache', 'back pain', 'nausea', 'rare arachnoiditis / meningitis'],
  heart: ['access-site bruising / bleeding', 'transient arrhythmia', 'coronary microembolism'],
  pancreas: ['abdominal pain', 'pancreatitis (intra-ductal)', 'procedural infection'],
  joint: ['injection-site pain', 'rare septic arthritis'],
  retina: ['ocular discomfort', 'raised eye pressure', 'rare endophthalmitis'],
};

// ---- Layer 1a: route/tissue baseline weights (0..1) per class --------------
type Weights = Partial<Record<AEKey, number>>;
const TISSUE_BASELINE: Record<string, Weights> = {
  joint:    { local: 0.45, procedural: 0.20, immune: 0.12 },
  skin:     { local: 0.35, procedural: 0.18, immune: 0.10 },
  systemic: { infusion: 0.40, embolic: 0.35, immune: 0.18, procedural: 0.06 },
  liver:    { infusion: 0.38, embolic: 0.34, immune: 0.16, procedural: 0.10 },
  kidney:   { infusion: 0.42, embolic: 0.30, immune: 0.16, procedural: 0.08 },
  pancreas: { infusion: 0.35, embolic: 0.28, procedural: 0.30, immune: 0.16 },
  heart:    { procedural: 0.38, embolic: 0.36, infusion: 0.24, immune: 0.12 },
  lung:     { embolic: 0.42, infusion: 0.30, local: 0.20, procedural: 0.12 },
  cns:      { procedural: 0.42, infusion: 0.24, immune: 0.20, local: 0.16 },
  immune:   { conditioning: 0.60, immune: 0.40, infusion: 0.26, embolic: 0.18 },
  bone:     { local: 0.38, procedural: 0.28, immune: 0.12 },
  muscle:   { infusion: 0.32, embolic: 0.28, local: 0.20, immune: 0.12 },
  gut:      { infusion: 0.32, immune: 0.26, procedural: 0.22, embolic: 0.18 },
  retina:   { procedural: 0.40, local: 0.24, immune: 0.18 },
};

// ---- Layer 1b: mechanistic risk buckets (multipliers per class) ------------
const BUCKET_MULT: Record<string, Weights> = {
  diabetes:          { local: 1.4, procedural: 1.5, embolic: 1.2 },
  ckd:               { infusion: 1.5, embolic: 1.2, procedural: 1.2 },
  copd:              { embolic: 1.8, procedural: 1.2, infusion: 1.1 },
  respiratory:       { embolic: 1.4, infusion: 1.1 },
  cirrhosis:         { embolic: 1.6, procedural: 1.4, infusion: 1.1 },
  autoimmune:        { immune: 1.8, procedural: 1.2 },
  immunosuppressed:  { procedural: 1.6, conditioning: 1.2, immune: 1.1 },
  prior_cell_therapy:{ immune: 1.5 },
  allogeneic:        { immune: 1.7 },
  thrombophilia:     { embolic: 2.0 },
  cardiovascular:    { embolic: 1.4, procedural: 1.3 },
  obesity:           { embolic: 1.3, local: 1.2, procedural: 1.2 },
  cancer:            { immune: 1.2, procedural: 1.2 },
  anticoagulated:    { procedural: 1.5 },
  infection_active:  { procedural: 1.5, infusion: 1.2 },
  smoker:            { embolic: 1.4, procedural: 1.2 },
  frailty:           { infusion: 1.2, procedural: 1.2 },
};
const BUCKET_LABEL: Record<string, string> = {
  diabetes: 'diabetes', ckd: 'kidney disease', copd: 'COPD', respiratory: 'lung disease',
  cirrhosis: 'liver disease', autoimmune: 'autoimmune', immunosuppressed: 'immunosuppression',
  prior_cell_therapy: 'prior cell therapy', allogeneic: 'donor cells', thrombophilia: 'clotting disorder',
  cardiovascular: 'cardiovascular disease', obesity: 'obesity', cancer: 'cancer',
  anticoagulated: 'blood thinners', infection_active: 'active infection', smoker: 'smoking', frailty: 'frailty',
};

// ---- department-grouped condition taxonomy (user-facing) -------------------
export interface Condition { key: string; label: string; group: string; buckets: string[]; }
export const CONDITIONS: Condition[] = [
  // Metabolic & endocrine
  { key: 't1d', label: 'Type 1 diabetes', group: 'Metabolic & endocrine', buckets: ['diabetes'] },
  { key: 't2d', label: 'Type 2 diabetes', group: 'Metabolic & endocrine', buckets: ['diabetes'] },
  { key: 'obesity', label: 'Obesity', group: 'Metabolic & endocrine', buckets: ['obesity'] },
  { key: 'metabolic', label: 'Metabolic syndrome', group: 'Metabolic & endocrine', buckets: ['obesity', 'diabetes'] },
  { key: 'thyroid', label: 'Thyroid disorder', group: 'Metabolic & endocrine', buckets: ['autoimmune'] },
  // Kidney
  { key: 'ckd', label: 'Chronic kidney disease', group: 'Kidney', buckets: ['ckd'] },
  { key: 'aki', label: 'Acute kidney injury', group: 'Kidney', buckets: ['ckd'] },
  { key: 'dialysis', label: 'On dialysis', group: 'Kidney', buckets: ['ckd', 'infection_active'] },
  { key: 'kidney_transplant', label: 'Kidney transplant', group: 'Kidney', buckets: ['immunosuppressed'] },
  // Respiratory
  { key: 'copd', label: 'COPD / emphysema', group: 'Respiratory', buckets: ['copd'] },
  { key: 'asthma', label: 'Asthma', group: 'Respiratory', buckets: ['respiratory'] },
  { key: 'pulm_fibrosis', label: 'Pulmonary fibrosis', group: 'Respiratory', buckets: ['respiratory'] },
  { key: 'prior_pe', label: 'Prior pulmonary embolism', group: 'Respiratory', buckets: ['thrombophilia'] },
  // Liver & GI
  { key: 'cirrhosis', label: 'Liver cirrhosis', group: 'Liver & GI', buckets: ['cirrhosis'] },
  { key: 'hepatitis', label: 'Hepatitis', group: 'Liver & GI', buckets: ['cirrhosis'] },
  { key: 'nafld', label: 'Fatty liver (NAFLD)', group: 'Liver & GI', buckets: ['cirrhosis', 'obesity'] },
  { key: 'ibd', label: "IBD (Crohn's / colitis)", group: 'Liver & GI', buckets: ['autoimmune', 'immunosuppressed'] },
  // Cardiovascular
  { key: 'cad', label: 'Coronary artery disease', group: 'Cardiovascular', buckets: ['cardiovascular'] },
  { key: 'heart_failure', label: 'Heart failure', group: 'Cardiovascular', buckets: ['cardiovascular'] },
  { key: 'hypertension', label: 'Hypertension', group: 'Cardiovascular', buckets: ['cardiovascular'] },
  { key: 'afib', label: 'Atrial fibrillation / arrhythmia', group: 'Cardiovascular', buckets: ['cardiovascular', 'anticoagulated'] },
  { key: 'prior_stroke', label: 'Prior stroke', group: 'Cardiovascular', buckets: ['cardiovascular', 'thrombophilia'] },
  // Autoimmune & rheumatology
  { key: 'ra', label: 'Rheumatoid arthritis', group: 'Autoimmune & rheumatology', buckets: ['autoimmune'] },
  { key: 'sle', label: 'Lupus (SLE)', group: 'Autoimmune & rheumatology', buckets: ['autoimmune'] },
  { key: 'as', label: 'Ankylosing spondylitis', group: 'Autoimmune & rheumatology', buckets: ['autoimmune'] },
  { key: 'ms', label: 'Multiple sclerosis', group: 'Autoimmune & rheumatology', buckets: ['autoimmune'] },
  { key: 'psoriasis', label: 'Psoriasis / PsA', group: 'Autoimmune & rheumatology', buckets: ['autoimmune'] },
  { key: 'autoimmune_other', label: 'Other autoimmune disease', group: 'Autoimmune & rheumatology', buckets: ['autoimmune'] },
  // Blood & clotting
  { key: 'thrombophilia', label: 'Known clotting disorder', group: 'Blood & clotting', buckets: ['thrombophilia'] },
  { key: 'anticoagulated', label: 'On blood thinners', group: 'Blood & clotting', buckets: ['anticoagulated'] },
  { key: 'bleeding', label: 'Bleeding disorder', group: 'Blood & clotting', buckets: ['anticoagulated'] },
  { key: 'anemia', label: 'Anemia', group: 'Blood & clotting', buckets: ['frailty'] },
  // Immune status
  { key: 'immunosuppressed', label: 'On immunosuppressants', group: 'Immune status', buckets: ['immunosuppressed'] },
  { key: 'active_infection', label: 'Recent / active infection', group: 'Immune status', buckets: ['infection_active'] },
  { key: 'transplant', label: 'Prior organ transplant', group: 'Immune status', buckets: ['immunosuppressed'] },
  { key: 'immunodeficiency', label: 'Immunodeficiency', group: 'Immune status', buckets: ['immunosuppressed'] },
  // Oncology
  { key: 'cancer_active', label: 'Current cancer', group: 'Oncology', buckets: ['cancer', 'immunosuppressed'] },
  { key: 'cancer_history', label: 'History of cancer', group: 'Oncology', buckets: ['cancer'] },
  { key: 'chemo', label: 'On chemotherapy', group: 'Oncology', buckets: ['immunosuppressed', 'cancer'] },
  // Cell & gene therapy history
  { key: 'prior_cell_therapy', label: 'Prior cell / stem-cell therapy', group: 'Cell & gene therapy history', buckets: ['prior_cell_therapy'] },
  { key: 'allogeneic', label: 'Donor (allogeneic) cells', group: 'Cell & gene therapy history', buckets: ['allogeneic'] },
  { key: 'prior_gene_therapy', label: 'Prior AAV / gene therapy', group: 'Cell & gene therapy history', buckets: ['prior_cell_therapy'] },
  // Lifestyle & other
  { key: 'smoker', label: 'Current smoker', group: 'Lifestyle & other', buckets: ['smoker'] },
  { key: 'pregnancy', label: 'Pregnant / breastfeeding', group: 'Lifestyle & other', buckets: ['frailty'] },
  { key: 'frailty', label: 'Advanced-age frailty', group: 'Lifestyle & other', buckets: ['frailty'] },
];
const COND_BY_KEY: Record<string, Condition> = Object.fromEntries(CONDITIONS.map((c) => [c.key, c]));
export const CONDITION_GROUPS: string[] = Array.from(new Set(CONDITIONS.map((c) => c.group)));

// Back-compat alias — earlier code imported COMORBIDITIES.
export const COMORBIDITIES = CONDITIONS;

// The indication itself is a comorbidity — map department → an implied condition.
const DEPARTMENT_IMPLIED: Record<string, string> = {
  Diabetes: 't2d',
  Nephrology: 'ckd',
  Pulmonology: 'copd',
  Gastroenterology: 'cirrhosis',
  Autoimmune: 'autoimmune_other',
};

export function impliedCondition(department?: string | null): string | null {
  return DEPARTMENT_IMPLIED[(department || '').trim()] || null;
}
// Back-compat alias.
export const impliedComorbidity = impliedCondition;

// Resolve selected condition keys (+ any raw bucket keys, for old saved runs)
// into the union set of mechanistic buckets.
function resolveBuckets(conditionKeys: string[]): Set<string> {
  const buckets = new Set<string>();
  conditionKeys.forEach((k) => {
    const cond = COND_BY_KEY[k];
    if (cond) cond.buckets.forEach((b) => buckets.add(b));
    else if (BUCKET_MULT[k]) buckets.add(k); // legacy: a bucket key was stored directly
  });
  return buckets;
}

// ---- route-specific "tests to ask a clinician for" -------------------------
function testsFor(tissueKey: string, buckets: Set<string>): string[] {
  const t: string[] = [];
  const w = TISSUE_BASELINE[tissueKey] || TISSUE_BASELINE.systemic;
  if ((w.embolic || 0) >= 0.25 || buckets.has('thrombophilia'))
    t.push('Thrombophilia screen (e.g. Factor V Leiden) + baseline CRP before IV cells');
  if (buckets.has('anticoagulated'))
    t.push('Review blood-thinner / bleeding plan before any procedure');
  if ((w.local || 0) >= 0.3 || (w.procedural || 0) >= 0.3)
    t.push('Confirm the clinic’s cell-prep sterility & infection precautions');
  if (buckets.has('allogeneic') || buckets.has('prior_cell_therapy'))
    t.push('HLA typing / anti-HLA antibody panel (donor-cell or repeat-dose immune risk)');
  if (tissueKey === 'lung' || buckets.has('copd') || buckets.has('respiratory'))
    t.push('Pulmonary function tests + O₂ saturation (reduced reserve for pulmonary entrapment)');
  if (tissueKey === 'cns')
    t.push('Discuss lumbar-puncture risks (post-LP headache, rare arachnoiditis)');
  if (buckets.has('cirrhosis'))
    t.push('Coagulation panel + platelets (rebalanced hemostasis)');
  if (buckets.has('ckd'))
    t.push('Fluid-status / volume review before IV infusion');
  if (buckets.has('autoimmune'))
    t.push('Disease-activity review — cell therapy can trigger a flare');
  if (buckets.has('cancer'))
    t.push('Oncology clearance + tumour markers before proliferative cell therapy');
  if (buckets.has('infection_active'))
    t.push('Clear any active infection before an immunomodulatory infusion');
  t.push('Ask for the product’s cell source, dose, viability and release testing');
  return t;
}

const CANT_SEE = [
  'HLA type & clotting-gene variants — a methylation file is not a genotype',
  'The product itself: cell source, dose, viability, sterility',
  'The clinic’s technique and infection controls',
  'Delayed effects beyond the modelled window',
];

// ---- scoring ---------------------------------------------------------------
export interface AEClass {
  key: AEKey; label: string; tier: string; index: number; symptoms: string[]; drivers: string[];
}
export interface ImmuneEnvelope {
  overall_tier: string;
  classes: AEClass[];
  drivers: string[];
  modifiable: string[];
  tests_to_ask: string[];
  cant_see: string[];
  comorbidities: string[];
  summary: string;
  disclaimer: string;
}

// Likelihood of experiencing the symptom class — framed as expectedness, not
// severity. These reactions are common, usually mild and self-limiting; we do
// not want to alarm patients with a severity-style "High risk" badge.
function tierOf(x: number): string {
  return x < 0.25 ? 'Uncommon' : x < 0.5 ? 'Possible' : 'Common';
}

export function immuneSafety(opts: {
  tissueKey?: string | null;
  department?: string | null;
  ageAcceleration?: number | null;
  coverage?: number;
  cycles?: number;
  comorbidities?: string[];   // condition keys from CONDITIONS
}): ImmuneEnvelope {
  const tissueKey = (opts.tissueKey || 'systemic').toLowerCase();
  const baseline = TISSUE_BASELINE[tissueKey] || TISSUE_BASELINE.systemic;
  const accel = Math.max(0, opts.ageAcceleration ?? 0);
  const coverage = opts.coverage ?? 1;
  const cycles = Math.max(1, Math.min(Math.trunc(opts.cycles || 1), 10));

  // Merge the indication's implied condition with the user-selected ones.
  const selected = [...(opts.comorbidities || [])];
  const implied = impliedCondition(opts.department);
  if (implied && !selected.includes(implied)) selected.push(implied);
  const buckets = resolveBuckets(selected);

  // Layer 2: inflammaging personalizer + dose.
  const inflaMult = 1 + Math.min(accel, 20) * 0.02;
  const doseMult = 1 + (cycles - 1) * 0.08;
  const INFLAMMATORY: AEKey[] = ['local', 'infusion', 'embolic', 'immune'];

  const classes: AEClass[] = [];
  const allDrivers = new Set<string>();

  (Object.keys(baseline) as AEKey[]).forEach((key) => {
    const base = baseline[key] || 0;
    if (base < 0.1) return;
    let score = base;
    const drivers: string[] = [];
    buckets.forEach((b) => {
      const m = BUCKET_MULT[b]?.[key];
      if (m && m !== 1) { score *= m; drivers.push(`${BUCKET_LABEL[b] || b} (×${m})`); }
    });
    if (INFLAMMATORY.includes(key) && inflaMult > 1.001) {
      score *= inflaMult;
      drivers.push(`epigenetic age-acceleration +${Math.round(accel * 10) / 10} yr (×${Math.round(inflaMult * 100) / 100})`);
    }
    if ((key === 'embolic' || key === 'local' || key === 'infusion') && doseMult > 1.001) {
      score *= doseMult;
      drivers.push(`${cycles} dose(s) (×${Math.round(doseMult * 100) / 100})`);
    }
    const index = Math.min(0.98, Math.round(score * 1000) / 1000);
    const symptoms = key === 'procedural' && PROCEDURAL_BY_TISSUE[tissueKey]
      ? PROCEDURAL_BY_TISSUE[tissueKey] : AE_SYMPTOMS[key];
    classes.push({ key, label: AE_LABEL[key], tier: tierOf(index), index, symptoms, drivers });
    drivers.forEach((d) => allDrivers.add(d));
  });

  classes.sort((a, b) => b.index - a.index);
  const order = ['Uncommon', 'Possible', 'Common'];
  const overall = classes.reduce((mx, c) => (order.indexOf(c.tier) > order.indexOf(mx) ? c.tier : mx), 'Uncommon');

  const modifiable: string[] = [];
  if (accel >= 5) modifiable.push(`Elevated inflammatory baseline (age-acceleration +${Math.round(accel * 10) / 10} yr) is partly reversible — reduce it and re-test before therapy.`);
  if (buckets.has('autoimmune')) modifiable.push('Treat to low disease activity before cell therapy to lower flare risk.');
  if (buckets.has('ckd')) modifiable.push('Optimise fluid status before an IV infusion.');
  if (buckets.has('smoker')) modifiable.push('Stopping smoking lowers clotting and infection risk before therapy.');
  if (buckets.has('infection_active')) modifiable.push('Clear any active infection before an immunomodulatory infusion.');
  if (coverage < 0.8) modifiable.push(`CpG coverage ${Math.round(coverage * 100)}% — lower confidence; treat this as provisional.`);

  const comorbNames = selected.map((k) => (COND_BY_KEY[k]?.label || k) + (k === implied ? ' (indication)' : ''));
  const lead = classes[0];
  const summary = lead
    ? `Most likely reaction for this route is ${lead.label.toLowerCase()} (${lead.tier.toLowerCase()}) — these are usually mild, short-lived and managed with premedication and observation. Overall symptom outlook: ${overall.toLowerCase()}. A relative, probabilistic read from your epigenetic profile + history — not a yes/no verdict.`
    : `Overall symptom outlook: ${overall.toLowerCase()}.`;

  return {
    overall_tier: overall,
    classes,
    drivers: Array.from(allDrivers),
    modifiable,
    tests_to_ask: testsFor(tissueKey, buckets),
    cant_see: CANT_SEE,
    comorbidities: comorbNames,
    summary,
    disclaimer: 'Illustrative likelihood of common, usually-mild infusion/procedure reactions — not a severity grade, diagnosis or yes/no prediction. '
      + 'A methylation file is not a genotype: it cannot read HLA type or clotting variants, and it cannot see the product or clinic. '
      + 'It informs the conversation with your clinician; it does not replace it. Not medical advice.',
  };
}
