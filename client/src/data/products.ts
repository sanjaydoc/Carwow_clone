// Product catalogue — the biologic product / cell line used in each therapy, with
// its supplier. Illustrative demo data for a portfolio site: real approved products
// are named where they exist (and labelled Approved); investigational, research-grade
// and compounded items are labelled honestly and are NOT claims of a treatment offer.
import type { Car } from '../types';

export type ProductStatus =
  | 'Approved'        // has a marketing authorisation (region noted)
  | 'Investigational' // in clinical trials / expanded access
  | 'Research'        // research-grade / in-house GMP prep, not a registered product
  | 'Device'          // cleared device / kit
  | 'Tissue graft'    // human tissue allograft/autograft
  | 'Compounded';     // compounding-pharmacy preparation

export interface Product {
  name: string;
  supplier: string;
  country: string;
  category: string;      // modality
  status: ProductStatus;
  note: string;
  models?: string[];     // exact therapy names this product is used in
  bodyTypes?: string[];  // …or every therapy of these categories
  makes?: string[];      // …optionally restricted to these departments
}

// Order matters only within the body-type group (more specific `makes` first).
export const PRODUCTS: Product[] = [
  // ── Named, approved products ──────────────────────────────────────────────
  {
    name: 'Ryoncil (remestemcel-L)', supplier: 'Mesoblast', country: 'USA', category: 'MSC',
    status: 'Approved',
    note: 'First FDA-approved allogeneic bone-marrow MSC therapy (2024) for steroid-refractory acute graft-versus-host disease in children.',
    models: ['Gut GvHD MSC Therapy'],
  },
  {
    name: 'Alofisel (darvadstrocel)', supplier: 'Takeda', country: 'EU', category: 'MSC',
    status: 'Approved',
    note: 'EMA-approved expanded adipose MSCs for complex perianal fistulas in Crohn’s disease.',
    models: ['Crohn’s Perianal Fistula'],
  },
  {
    name: 'Zimislecel (VX-880)', supplier: 'Vertex Pharmaceuticals', country: 'USA', category: 'iPSC / islet',
    status: 'Investigational',
    note: 'Stem-cell-derived pancreatic islet cells for type 1 diabetes; late-stage clinical trials (not yet approved).',
    models: ['Type 1 Diabetes'],
  },
  {
    name: 'Kymriah / Yescarta (CD19 CAR-T)', supplier: 'Novartis / Gilead-Kite', country: 'USA · EU', category: 'CAR-T',
    status: 'Approved',
    note: 'Autologous CD19-directed CAR-T cell products approved for certain leukaemias and lymphomas.',
    models: ['CAR-T Cell Therapy'],
  },
  {
    name: 'BEAR Implant', supplier: 'Miach Orthopaedics', country: 'USA', category: 'Bioscaffold',
    status: 'Device',
    note: 'FDA-authorised Bridge-Enhanced ACL Restoration scaffold that lets the torn ACL heal to itself instead of a graft.',
    models: ['BioACL Biologic Reconstruction'],
  },
  {
    name: 'Cartilage paste graft + meniscus allograft', supplier: 'JRF Ortho / MTF Biologics (tissue banks)', country: 'USA', category: 'Tissue graft',
    status: 'Tissue graft',
    note: 'Autologous articular-cartilage paste plus donor meniscus tissue — the biologic building blocks of the BioKnee reconstruction.',
    models: ['BioKnee Biologic Reconstruction'],
  },
  {
    name: 'Bemdaneprocel', supplier: 'BlueRock Therapeutics (Bayer)', country: 'USA', category: 'iPSC-derived neurons',
    status: 'Investigational',
    note: 'iPSC-derived dopaminergic neuron precursors for Parkinson’s disease; in clinical trials.',
    models: ['Parkinson’s iPSC Dopaminergic'],
  },
  {
    name: 'OSK partial-reprogramming vector', supplier: 'Life Biosciences (ER-100 class) / in-house research', country: 'USA', category: 'Gene therapy',
    status: 'Research',
    note: 'Inducible OCT4·SOX2·KLF4 construct for transient partial epigenetic reprogramming — the core of the Persona Reversal platform. First-in-human research.',
    models: ['Persona Reversal Epigenetic Reprogramming', 'Persona Reversal Renal Epigenetic Reprogramming'],
  },
  {
    name: 'NR1 neural stem cells', supplier: 'Neural stem-cell developer (research)', country: 'USA', category: 'NSC',
    status: 'Investigational',
    note: 'Neural stem-cell product studied for chronic spinal-cord injury.',
    models: ['Spinal Cord Injury NSC'],
  },
  {
    name: 'CL2020 (Muse cells)', supplier: 'Life Science Institute / Sumitomo Pharma', country: 'Japan', category: 'Muse',
    status: 'Investigational',
    note: 'Off-the-shelf Muse (multilineage-differentiating stress-enduring) cell product; clinical trials in stroke, MI, ALS and spinal-cord injury. Used here for both systemic and intra-articular applications.',
    bodyTypes: ['Muse'],
  },
  {
    name: 'CRISPR CCR5-edited HSC platform', supplier: 'CRISPR Therapeutics / Vertex (Casgevy-class)', country: 'USA · EU', category: 'Gene-edited HSC',
    status: 'Investigational',
    note: 'CRISPR gene-editing of blood stem cells. Casgevy is approved for sickle-cell/β-thalassaemia; CCR5 editing for HIV is investigational.',
    models: ['CCR5 Gene-Edited HSC Therapy', 'Anti-HIV Gene Therapy in HSCs'],
  },
  {
    name: 'CCR5-Δ32 donor / cord-blood graft', supplier: 'Allogeneic donor & public cord-blood banks', country: 'International', category: 'Allogeneic HSC',
    status: 'Tissue graft',
    note: 'Naturally HIV-resistant CCR5-Δ32 donor haematopoietic grafts (the "Berlin/London patient" approach).',
    models: ['CCR5-Δ32 Stem-Cell Transplant', 'Cord-Blood CCR5-Δ32 Transplant'],
  },
  {
    name: 'CCR5-disrupted CD4 T-cells (SB-728 class)', supplier: 'Gene-edited T-cell developer', country: 'USA', category: 'Gene-edited T-cell',
    status: 'Investigational',
    note: 'Autologous CD4 T-cells with CCR5 disrupted to resist HIV entry; early-phase research.',
    models: ['CCR5-Disrupted CD4 T-cell Therapy'],
  },
  {
    name: 'Allogeneic NK-cell product', supplier: 'NK-cell manufacturer (GMP)', country: 'International', category: 'Immune cell',
    status: 'Investigational',
    note: 'Expanded natural-killer cells for immune surveillance support; investigational.',
    models: ['NK Cell Immune Boost'],
  },
  {
    name: 'Autologous adipose SVF', supplier: 'Point-of-care SVF system (enzymatic)', country: 'International', category: 'SVF',
    status: 'Research',
    note: 'Stromal vascular fraction isolated from the patient’s own fat, combined with fat grafting.',
    models: ['Facial Fat Grafting + SVF'],
  },
  {
    name: 'Compounded signalling peptides', supplier: 'Empower Pharmacy (compounded)', country: 'USA', category: 'Peptide',
    status: 'Compounded',
    note: 'Compounded peptides (e.g. BPC-157, thymosin-β4) — supportive/wellness, many off-label and not individually approved.',
    models: ['Peptide Restoration Program'],
  },
  {
    name: 'NAD+ for infusion (compounded)', supplier: 'Compounding pharmacy', country: 'USA', category: 'Small molecule',
    status: 'Compounded',
    note: 'Compounded intravenous NAD+ for cellular-energy support; wellness use.',
    models: ['NAD+ Infusion Therapy'],
  },
  {
    name: 'BioTE bioidentical hormone pellets', supplier: 'BioTE Medical', country: 'USA', category: 'Hormone',
    status: 'Compounded',
    note: 'Subcutaneous bioidentical hormone pellets for physician-supervised hormone optimisation.',
    models: ['Hormone Optimization (BHRT)'],
  },
  {
    name: 'Myers’ micronutrient IV (compounded)', supplier: 'Compounding pharmacy', country: 'USA', category: 'IV nutrition',
    status: 'Compounded',
    note: 'Vitamin/mineral IV blend for hydration and recovery; supportive only.',
    models: ['IV Nutrition (Myers’ Cocktail)'],
  },
  // ── Category-level products (by cell type) ────────────────────────────────
  {
    name: 'Purified MSC-exosomes (cosmetic grade)', supplier: 'Exocel Bio / Kimera Labs', country: 'USA', category: 'Exosome',
    status: 'Research',
    note: 'MSC-derived exosome preparations for aesthetic skin and hair applications.',
    bodyTypes: ['Exosome'], makes: ['Cosmetic'],
  },
  {
    name: 'ExoFlo (bone-marrow MSC exosomes)', supplier: 'Direct Biologics', country: 'USA', category: 'Exosome',
    status: 'Investigational',
    note: 'Bone-marrow MSC-derived exosome product under FDA IND/RMAT for systemic and organ indications; not yet approved.',
    bodyTypes: ['Exosome'],
  },
  {
    name: 'Angel PRP System', supplier: 'Arthrex', country: 'USA', category: 'PRP',
    status: 'Device',
    note: 'FDA-cleared point-of-care system that concentrates platelet-rich plasma from the patient’s own blood.',
    bodyTypes: ['PRP'],
  },
  {
    name: 'VSEL isolation prep (research)', supplier: 'In-house research', country: 'International', category: 'VSEL',
    status: 'Research',
    note: 'Very-small-embryonic-like cells mobilised and isolated from the patient’s own blood; scientifically debated, research use.',
    bodyTypes: ['VSEL'],
  },
  {
    name: 'GMP iPSC-derived cell line', supplier: 'In-house / contract iPSC manufacturer', country: 'International', category: 'iPSC',
    status: 'Research',
    note: 'Induced-pluripotent-stem-cell-derived tissue-specific cells produced under GMP; research-stage.',
    bodyTypes: ['iPSC'],
  },
  {
    name: 'Autologous CD34+ HSC graft (aHSCT)', supplier: 'In-house apheresis & GMP processing', country: 'International', category: 'HSC',
    status: 'Approved',
    note: 'Autologous haematopoietic stem-cell transplant — an established procedure for aggressive MS and systemic sclerosis.',
    bodyTypes: ['HSC'],
  },
  {
    name: 'Expanded immune-cell product (research)', supplier: 'In-house cell lab', country: 'International', category: 'Immune cell',
    status: 'Research',
    note: 'Expanded/rejuvenated immune-cell preparations; research-stage.',
    bodyTypes: ['Immune cell'],
  },
  {
    name: 'Allogeneic UC-MSC Master Cell Bank', supplier: 'In-house / contract GMP manufacturer', country: 'International', category: 'MSC',
    status: 'Research',
    note: 'Umbilical-cord-derived mesenchymal stem cells produced under GMP from a characterised master cell bank — the workhorse product across most MSC indications. Investigational for most uses.',
    bodyTypes: ['MSC', 'Surgical'],
  },
];

const FALLBACK: Product = {
  name: 'In-house GMP preparation', supplier: 'StemCells Protocol lab', country: '—', category: 'Cell product',
  status: 'Research', note: 'Prepared in-house under GMP conditions.',
};

/** The single product used in a given therapy (model match wins over category). */
export function productForTherapy(car: Pick<Car, 'model' | 'body_type' | 'make'>): Product {
  for (const p of PRODUCTS) if (p.models?.includes(car.model)) return p;
  for (const p of PRODUCTS) {
    if (p.bodyTypes?.includes(car.body_type) && (!p.makes || p.makes.includes(car.make))) return p;
  }
  return FALLBACK;
}

/** All therapies that use a given product. */
export function therapiesForProduct(product: Product, cars: Car[]): Car[] {
  return cars.filter((c) => productForTherapy(c).name === product.name);
}
