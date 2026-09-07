// StemCells Protocol — facility levels (L1 → L2 → L3).
// A phased capital-staircase: a Level-1 clinic earns from day one and funds the
// climb to a full cell & gene-therapy centre. Data mirrors the Cell-Therapy
// Clinic Kit-Out: equipment + representative costs, and the catalogue therapies
// each level unlocks. Costs are illustrative new-equipment ballparks, and
// therapy mappings are guidance — validation-required, not a compliance or
// investment guarantee.

export interface FacItem { name: string; spec?: string; cost: string; tone?: 'crit' | 'rec' | 'note'; }
export interface FacZone { title: string; purpose: string; items: FacItem[]; }
export interface FacBudgetRow { label: string; value: string; tone?: 'rec' | 'muted'; }
export interface FacTherapy { label: string; sub?: string; flag?: boolean; }
export interface FacGroupRow { lab: string; count?: string; names: string; }
export interface FacGroup {
  title: string; caption?: string; tone: 'now' | 'add' | 'no';
  therapies?: FacTherapy[]; rows?: FacGroupRow[]; note?: string;
}
export interface FacilityLevel {
  n: '1' | '2' | '3'; accent: string; name: string; tagline: string;
  cost: string; costNote: string; cumulative: string;
  budgetHeadline: string; budgetLbl: string; budget: FacBudgetRow[];
  coverage: FacGroup[];
  zones: FacZone[];
  disposables?: { group: string; items: string[] }[];
  notes: string[];
}

const L1: FacilityLevel = {
  n: '1', accent: '#4285F4',
  name: 'Outpatient administration clinic',
  tagline: 'The minimum kit — everything to administer MSC & IV-exosome therapies safely, with the product supplied by a licensed GMP manufacturer. Live today.',
  cost: '$50–150k', costNote: 'one-time · live now', cumulative: '≈ 40 of 64 therapies',
  budgetHeadline: '$48k–147k',
  budgetLbl: 'Minimum viable clinic — essential equipment & kit + a basic treatment-room fit-out (one-time).',
  budget: [
    { label: 'Essential equipment & kit', value: '$40k–122k' },
    { label: 'Basic treatment-room fit-out', value: '$8k–25k' },
    { label: '+ Recommended add-ons (ultrasound, centrifuge, infusion pump…)', value: '+$14k–48k', tone: 'rec' },
    { label: 'Recurring — BLS/ACLS staffing, per-patient consumables & the GMP product itself', value: 'not included', tone: 'muted' },
  ],
  coverage: [
    {
      title: 'Deliverable now', caption: '32 · MSC IV · joint & local injection · IV / topical exosome · PRP', tone: 'now',
      therapies: [
        'Systemic MSC infusion', 'Senolytic + MSC', 'Type 2 diabetes', 'Rheumatoid arthritis', 'Lupus (SLE)',
        'Ankylosing spondylitis', 'Psoriasis / PsA', 'Sjögren’s', 'Hashimoto’s', 'Graves’ disease',
        'Myasthenia gravis', 'Autoimmune hepatitis', 'Vasculitis', 'Polymyositis / DM', 'Behçet’s',
        'Ulcerative colitis', 'Liver cirrhosis', 'Stroke recovery', 'Muscular dystrophy', 'COPD',
        'Pulmonary fibrosis (IPF)', 'Chronic kidney disease', 'Exosome IV longevity', 'Diabetic kidney disease (exosome)',
        'Knee osteoarthritis', 'Cartilage repair', 'Tendon PRP-MSC', 'Vitiligo (exosome)', 'Alopecia areata (exosome)',
        'Hair restoration (exosome)', 'Skin rejuvenation (exosome)', 'Scar & wound MSC',
      ].map((label) => ({ label })),
      note: 'Every Phase-1 revenue therapy is in this tier.',
    },
    {
      title: 'One small add-on', caption: '8 · a single extra capability unlocks each', tone: 'add',
      therapies: [
        { label: 'Dental pulp', sub: 'dental chair' }, { label: 'Periodontal ligament', sub: 'dental chair' },
        { label: 'Disc regeneration', sub: 'fluoroscopy' }, { label: 'Fat grafting + SVF', sub: 'liposuction' },
        { label: 'ALS / MND', sub: 'lumbar puncture' }, { label: 'Gut GvHD', sub: 'inpatient' },
        { label: 'ARDS', sub: 'ICU' }, { label: 'Acute kidney injury', sub: 'inpatient' },
      ],
    },
    {
      title: 'Needs a larger facility', caption: '23 · unlock at Level 2 & 3', tone: 'no',
      rows: [
        { lab: 'Operating theatre', count: '×5', names: 'Alveolar bone · Whole-tooth · Non-union fracture · Parkinson’s iPSC · Airway epithelium' },
        { lab: 'Cath lab / cardiac', count: '×4', names: 'Post-MI repair · Heart failure · Cardiosphere · Critical limb ischaemia' },
        { lab: 'Transplant / immune-cell programme', count: '×9', names: 'CCR5-Δ32 & cord-blood transplants · CCR5 gene-edited HSC · anti-HIV gene therapy · CCR5-disrupted CD4 T-cell · MS aHSCT · systemic sclerosis HSCT · NK-cell boost · thymic rejuvenation' },
        { lab: 'iPSC / gene-therapy build', count: '×5', names: 'Type 1 diabetes islets · spinal-cord iPSC · FSHD · Persona Reversal (age) · Persona Reversal (renal)' },
      ],
    },
  ],
  zones: [
    { title: 'Facility & environment', purpose: 'A clean, controlled room you can decontaminate between patients.', items: [
      { name: 'Dedicated treatment room', spec: 'Easy-clean non-porous surfaces, controlled access', cost: 'fit-out', tone: 'note' },
      { name: 'Aseptic preparation area', spec: 'Class II BSC or ISO-classified clean zone', cost: 'see Preparation', tone: 'note' },
      { name: 'Hand-hygiene station', spec: 'Clinical sink + alcohol hand-rub', cost: '$0.3–1.2k' },
      { name: 'Clinical & sharps waste disposal', spec: 'Biohazard bins + sharps containers', cost: '$0.2–0.8k' },
      { name: 'Medical-grade refrigerator (2–8 °C)', spec: 'Premeds, saline, refrigerated EV products', cost: '$1.5–4k' },
    ] },
    { title: 'Cold chain — receipt & storage', purpose: 'Hold product at spec from delivery to bedside, with proof.', items: [
      { name: 'Cryogenic storage — LN₂ / −150 °C', spec: 'For cryopreserved MSC (≤ −135 °C)', cost: '$10–25k' },
      { name: '−80 °C freezer', spec: 'Exosome / EV products per IFU', cost: '$8–18k' },
      { name: 'LN₂ dry shipper', spec: 'Validated dewar for cryo receipt/transport', cost: '$1.5–4k' },
      { name: 'Continuous temperature monitoring + alarm', spec: 'Data-logging with out-of-range alerts', cost: '$1–4k' },
      { name: 'Cryo-PPE', spec: 'Cryogloves, face shield, apron', cost: '$0.2–0.6k', tone: 'rec' },
    ] },
    { title: 'Product preparation', purpose: 'Thaw, wash and verify the dose without breaking sterility.', items: [
      { name: 'Class II biosafety cabinet', spec: 'Aseptic thaw & reconstitution', cost: '$8–16k' },
      { name: 'Controlled thaw device', spec: '37 °C dry cell-thawing unit', cost: '$1–8k' },
      { name: 'Refrigerated benchtop centrifuge', spec: 'DMSO wash / cell concentration', cost: '$4–12k', tone: 'rec' },
      { name: 'Cell count & viability', spec: 'Automated counter or haemocytometer + trypan blue', cost: '$0.5–10k' },
      { name: 'Closed-system transfer sets', spec: 'Spike/syringe transfer + diluent', cost: '$0.3–1k' },
    ] },
    { title: 'Intravenous administration', purpose: 'The shared route for systemic MSC & all IV exosomes.', items: [
      { name: 'Infusion chair or reclining bed', cost: '$1.5–6k' },
      { name: 'IV cannulas', spec: '18–22 G', cost: '$0.1–0.4k' },
      { name: 'Non-filtered IV administration set (cells)', spec: 'MSC must not pass a depth filter — non-filtered, DEHP-free', cost: '$0.2–0.8k', tone: 'crit' },
      { name: 'Carrier fluid', spec: '0.9% normal saline + flushes', cost: '$0.15–0.5k' },
      { name: 'Volumetric infusion pump', spec: 'Controlled, titratable rate', cost: '$1.5–5k', tone: 'rec' },
      { name: 'Premedication kit', spec: 'Antihistamine ± antipyretic (± steroid)', cost: '$0.2–0.8k' },
    ] },
    { title: 'Intra-articular & local injection', purpose: 'MSC delivered into a joint or target tissue.', items: [
      { name: 'Aseptic injection tray', spec: 'Sterile drapes, skin prep', cost: '$0.15–0.6k' },
      { name: 'Syringes & needles', spec: '1–10 mL, assorted gauges', cost: '$0.1–0.4k' },
      { name: 'Ultrasound machine', spec: 'Image-guided placement (essential for hip/deep joints)', cost: '$8–30k', tone: 'rec' },
      { name: 'Joint aspiration kit', spec: 'Drain effusion before IA delivery', cost: '$0.1–0.4k', tone: 'rec' },
    ] },
    { title: 'Patient monitoring', purpose: 'Watch for infusion, embolic & hypersensitivity reactions.', items: [
      { name: 'Vital-signs monitor', spec: 'NIBP, SpO₂, HR & temperature', cost: '$1.5–6k' },
      { name: 'Structured observation period', spec: 'During infusion + 24–72 h AE window brief', cost: 'staffing', tone: 'note' },
      { name: 'Portable pulse oximeter', spec: 'Recovery-area backup', cost: '$0.05–0.3k', tone: 'rec' },
    ] },
    { title: 'Emergency readiness', purpose: 'Non-negotiable before a single patient is dosed.', items: [
      { name: 'Anaphylaxis / resuscitation kit', spec: 'Adrenaline, IV antihistamine, IV steroid, bronchodilator', cost: '$0.3–1k', tone: 'crit' },
      { name: 'Oxygen + airway support', spec: 'Oxygen, masks, bag-valve-mask, suction', cost: '$0.5–2.5k', tone: 'crit' },
      { name: 'Crash cart + AED / defibrillator', spec: 'Stocked emergency drugs & airway kit', cost: '$2–8k', tone: 'crit' },
      { name: 'BLS/ACLS-trained clinician on site', spec: 'Present throughout every infusion', cost: 'staffing', tone: 'crit' },
    ] },
    { title: 'Documentation & traceability', purpose: 'The paper trail that makes the therapy defensible.', items: [
      { name: 'ISBT-128 chain-of-custody', spec: 'Donor → product → patient identity', cost: '$0.5–3k' },
      { name: 'Certificate of Analysis (per batch)', spec: 'Verify identity, viability, sterility, endotoxin', cost: 'process', tone: 'note' },
      { name: 'Informed consent', spec: 'Investigational status, benefits, risks', cost: 'process', tone: 'note' },
      { name: 'Adverse-event log & reporting pathway', spec: 'CTCAE grading + stop / escalation criteria', cost: 'process', tone: 'note' },
      { name: 'SOP binder + two-person verification', spec: 'Coded protocol SOP; product↔patient checked by two staff', cost: 'process', tone: 'note' },
    ] },
  ],
  disposables: [
    { group: 'Sterile / PPE', items: ['Sterile & exam gloves', 'Sterile gowns', 'Sterile drapes', 'Masks & face shields', 'Chlorhexidine / alcohol swabs', 'Skin-prep applicators'] },
    { group: 'Injection & infusion', items: ['Syringes 1·3·5·10·20 mL', 'Needles 18–25 G', 'IV cannulas 18–22 G', 'Non-filtered IV sets (MSC)', 'Standard IV sets (EXO)', 'Extension lines · 3-way taps', 'Normal saline + flushes', 'Tourniquets', 'Dressings · gauze · tape'] },
    { group: 'Product handling & QC', items: ['Closed transfer / spike sets', 'Cryovials & cryo-labels', 'Cell-count slides', 'Trypan blue', 'Alcohol gel', 'Specimen & biohazard bags'] },
    { group: 'Waste', items: ['Sharps containers', 'Clinical-waste bags', 'Cytotoxic / biohazard bins'] },
  ],
  notes: [
    'Administration, not manufacturing — Level 1 assumes the cell / exosome product is made by a licensed GMP facility and shipped with release testing complete.',
    'Validation-required — items and specs are illustrative and generic. Actual requirements depend on your jurisdiction, the product IFU, and your accreditation body (ISCT, FACT-JACIE, national ATMP/tissue rules).',
  ],
};

const L2: FacilityLevel = {
  n: '2', accent: '#22c55e',
  name: 'Interventional & day-procedure centre',
  tagline: 'Adds a minor-OR / day-surgery suite, image guidance, point-of-care processing & short-stay beds — on top of Level 1.',
  cost: '+$0.2–0.8M', costNote: 'added · cath lab optional', cumulative: '≈ 54 of 64 therapies',
  budgetHeadline: '+$0.2–0.8M',
  budgetLbl: 'Core interventional + point-of-care processing added to Level 1. An owned cath lab is optional (+$0.5–2M) — most clinics use a partner hospital.',
  budget: [
    { label: 'Day-surgery / minor-OR suite', value: '$58–205k' },
    { label: 'Imaging & guidance (C-arm + ultrasound)', value: '$50–150k' },
    { label: 'Point-of-care processing cleanroom', value: '$75–290k' },
    { label: 'Short-stay ward + harvest suites', value: '$35–140k' },
    { label: '+ Owned cath lab (optional — or partner)', value: '+$0.5–2M', tone: 'rec' },
  ],
  coverage: [
    {
      title: 'Therapies this level adds', caption: 'Cumulative ≈ 54 of 64', tone: 'now',
      therapies: ['Post-MI repair', 'Heart failure', 'Cardiosphere', 'Critical limb ischaemia', 'Alveolar bone', 'Non-union fracture'].map((label) => ({ label })),
      note: 'Plus it graduates Level 1’s 8 “add-on” therapies to native — dental, disc under fluoroscopy, fat grafting + SVF, ALS intrathecal, and inpatient GvHD / ARDS / AKI.',
    },
  ],
  zones: [
    { title: 'Day-surgery suite', purpose: 'Minor procedures & surgical MSC delivery.', items: [
      { name: 'Minor operating theatre', spec: 'Day-surgery / procedure-room fit-out', cost: '$30–120k' },
      { name: 'Surgical table, lights & instrument sets', cost: '$8–25k' },
      { name: 'Anaesthesia machine + monitoring', spec: 'Sedation / GA for minor procedures', cost: '$15–40k' },
      { name: 'Autoclave / sterile-processing', cost: '$5–20k' },
    ] },
    { title: 'Imaging & guidance', purpose: 'Accurate placement for deep joints, disc & cardiac.', items: [
      { name: 'Mobile C-arm fluoroscopy', spec: 'Disc, deep-joint & interventional delivery', cost: '$40–120k' },
      { name: 'Diagnostic ultrasound (mid-range)', spec: 'Joint, soft-tissue & vascular guidance', cost: '$10–30k' },
    ] },
    { title: 'Point-of-care processing', purpose: 'Same-day autologous SVF / BMAC / PRP.', items: [
      { name: 'Modular cleanroom (ISO 7/8)', cost: '$50–200k' },
      { name: 'Closed-system cell processor', spec: 'Automated SVF / BMAC / PRP isolation', cost: '$15–60k' },
      { name: 'Refrigerated centrifuge / isolator', cost: '$10–30k' },
    ] },
    { title: 'Short-stay & harvest', purpose: 'Observation beds + tissue-harvest suites.', items: [
      { name: 'Day-ward beds + monitoring (2–4)', cost: '$20–80k' },
      { name: 'Liposuction / aspiration set', spec: 'Adipose & marrow harvest', cost: '$5–20k' },
      { name: 'Dental operatory (chair + unit)', cost: '$10–40k' },
    ] },
    { title: 'Interventional cardiology (optional)', purpose: 'For intracoronary / intramyocardial cell therapy.', items: [
      { name: 'Cath-lab suite (owned) — or partner access', spec: 'Enables Post-MI, heart-failure & cardiosphere delivery', cost: '$0.5–2M' },
    ] },
  ],
  notes: [
    'Builds on Level 1 — the figures above are the added investment, not a replacement.',
    'Validation-required — confirm interventional & processing requirements with your regulator and accreditation body.',
  ],
};

const L3: FacilityLevel = {
  n: '3', accent: '#a855f7',
  name: 'Advanced cell & gene-therapy centre',
  tagline: 'Full GMP manufacturing, apheresis, transplant & gene-therapy programmes — or reached capital-light via a CDMO + partner hospital.',
  cost: '$5–50M', costNote: 'owned · or via CDMO', cumulative: '64 of 64 — the full catalogue',
  budgetHeadline: '$5–50M+',
  budgetLbl: 'If built & owned. Via a CDMO + partner hospital, first-in-human is reachable within the $3M seed — the deck’s route (lab + GMP batch + IND-enabling tox for a fraction of an owned plant).',
  budget: [
    { label: 'GMP cleanroom manufacturing (ISO 5/7)', value: '$2–15M' },
    { label: 'Bioprocessing (BSCs, incubators, bioreactors)', value: '$0.2–1.5M' },
    { label: 'Apheresis + cryo cell-bank', value: '$0.15–0.65M' },
    { label: 'QC / analytics lab + regulatory & QMS', value: '$0.5–2.3M' },
    { label: 'Capital-light route — CDMO manufacture + partner hospital', value: '$0.5–3M / prog', tone: 'rec' },
  ],
  coverage: [
    {
      title: 'Therapies this level adds', caption: 'Cumulative 64 of 64 — the full catalogue', tone: 'now',
      therapies: [
        { label: 'Persona Reversal — age reversal', flag: true }, { label: 'Persona Reversal — renal', flag: true },
        { label: 'CCR5-Δ32 transplant' }, { label: 'Cord-blood CCR5 transplant' }, { label: 'CCR5 gene-edited HSC' },
        { label: 'Anti-HIV gene therapy' }, { label: 'CCR5-disrupted CD4 T-cell' }, { label: 'MS aHSCT' },
        { label: 'Systemic sclerosis HSCT' }, { label: 'NK-cell boost' }, { label: 'Thymic rejuvenation' },
        { label: 'Type 1 diabetes islets' }, { label: 'Spinal-cord iPSC' }, { label: 'FSHD' },
        { label: 'Parkinson’s iPSC' }, { label: 'Whole-tooth' }, { label: 'Airway epithelium' },
      ],
      note: '★ The flagship Persona Reversal OSK partial-reprogramming platform lives here — the tier the seed round exists to fund.',
    },
  ],
  zones: [
    { title: 'GMP manufacturing', purpose: 'In-house cell & vector production.', items: [
      { name: 'ISO 5/7 GMP cleanroom suite', spec: 'Multi-room aseptic manufacturing (fit-out)', cost: '$2–15M' },
      { name: 'Biosafety cabinets, CO₂ incubators, bioreactors', spec: 'Cell expansion & differentiation', cost: '$0.2–1.5M' },
      { name: 'Environmental monitoring + BMS + validation', spec: 'Particle/viable counts, alarms, IQ/OQ/PQ', cost: '$0.15–0.8M' },
    ] },
    { title: 'Collection & cryo-banking', purpose: 'Patient collection & a scaled cell bank.', items: [
      { name: 'Apheresis machine(s)', spec: 'HSC / immune-cell collection', cost: '$50–150k' },
      { name: 'Controlled-rate freezers + LN₂ cell bank', spec: 'Validated cryopreservation at scale', cost: '$0.1–0.5M' },
    ] },
    { title: 'QC / analytics lab', purpose: 'Release testing & genomic safety.', items: [
      { name: 'Flow cytometer, qPCR, endotoxin & sterility', spec: 'Identity, potency & release assays', cost: '$0.2–0.8M' },
      { name: 'Karyotype / genomic-integrity workup', spec: 'Genetic-stability screen for expanded & edited cells', cost: 'within QC lab', tone: 'note' },
    ] },
    { title: 'Gene-therapy & regulatory', purpose: 'Vector handling, IND/ATMP & inpatient access.', items: [
      { name: 'Vector suite (enhanced BSL-2) — or CDMO contract', spec: 'AAV / lentiviral / CRISPR production or supply', cost: 'CDMO $0.5–3M / prog' },
      { name: 'IND/ATMP regulatory, QMS, QA/QP + pharmacovigilance', spec: 'Approval pathway & quality system', cost: '$0.3–1.5M' },
      { name: 'Transplant ward + ICU access', spec: 'Conditioning, engraftment & AE management', cost: 'owned / partner', tone: 'note' },
    ] },
  ],
  notes: [
    'The capital-intensive tier — reachable capital-light via a CDMO + partner hospital, which is how the $3M seed reaches first-in-human without an owned GMP plant.',
    'Validation-required — GMP, gene-therapy and transplant programmes are governed by cGMP/GTP (21 CFR 1271), EU ATMP, FACT-JACIE and national regulators.',
  ],
};

export const FACILITY: Record<string, FacilityLevel> = { '1': L1, '2': L2, '3': L3 };
export const FACILITY_ORDER: ('1' | '2' | '3')[] = ['1', '2', '3'];
export const FACILITY_SUMMARY = FACILITY_ORDER.map((k) => {
  const f = FACILITY[k];
  return { n: f.n, accent: f.accent, name: f.name, cost: f.cost, costNote: f.costNote, cumulative: f.cumulative };
});
