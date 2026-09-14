import { useEffect, useState } from 'react';
import { DepartmentIcon } from './icons';

interface Props {
  accent: string;
  className?: string;
  bodyType?: string; // therapy category
  make?: string; // department
  model?: string; // therapy name
  year?: number;
  angle?: number;
  fit?: 'cover' | 'contain'; // 'contain' keeps the whole infographic visible (detail hero)
}

// Card photography — all real stem-cell clinic/lab photos bundled in the repo
// (public/therapy/), so images always load, never watermark, and stay on-theme.
// Priority: per-therapy override -> per-department photo -> a sensible default.
// A gradient + department glyph sits behind as the last-resort fallback.

// Per-therapy bundled photos (checked first, keyed by therapy name).
const BY_MODEL: Record<string, string> = {
  'Hair Restoration Exosome': 'hair-exosome.jpg',
  'Type 1 Diabetes': 'type-1-diabetes.jpg',
  'Type 2 Diabetes': 'type-2-diabetes.jpg',
  'COPD MSC Therapy': 'copd-msc-therapy.jpg',
  'Pulmonary Fibrosis (IPF) MSC': 'pulmonary-fibrosis-ipf-msc.jpg',
  'ARDS MSC Therapy': 'ards-msc-therapy.jpg',
  'Airway Epithelial Regeneration': 'airway-epithelial-regeneration.jpg',
  'Knee Osteoarthritis MSC Therapy': 'knee-osteoarthritis-msc-therapy.jpg',
  'Cartilage Repair': 'cartilage-repair.jpg',
  'Non-union Fracture Repair': 'non-union-fracture-repair.jpg',
  'Intervertebral Disc Regeneration': 'intervertebral-disc-regeneration.jpg',
  'Tendon & Ligament PRP-MSC': 'tendon-ligament-prp-msc.jpg',
  'BioKnee Biologic Reconstruction': 'bioknee-biologic-reconstruction.jpg',
  'BioACL Biologic Reconstruction': 'bioacl-biologic-reconstruction.jpg',
  'Muse Cell Cartilage Repair': 'muse-cell-cartilage-repair.jpg',
  'Multiple Sclerosis aHSCT': 'multiple-sclerosis-ahsct.jpg',
  'Spinal Cord Injury NSC': 'spinal-cord-injury-nsc.jpg',
  'Stroke Recovery MSC': 'stroke-recovery-msc.jpg',
  'Parkinson’s iPSC Dopaminergic': 'parkinson-s-ipsc-dopaminergic.jpg',
  'ALS / MND MSC Therapy': 'als-mnd-msc-therapy.jpg',
  'Muscular Dystrophy': 'muscular-dystrophy.jpg',
  'FSHD (Facioscapulohumeral Dystrophy)': 'fshd-facioscapulohumeral-dystrophy.jpg',
  'CCR5-Δ32 Stem-Cell Transplant': 'ccr5-32-stem-cell-transplant.jpg',
  'Cord-Blood CCR5-Δ32 Transplant': 'cord-blood-ccr5-32-transplant.jpg',
  'CCR5 Gene-Edited HSC Therapy': 'ccr5-gene-edited-hsc-therapy.jpg',
  'Anti-HIV Gene Therapy in HSCs': 'anti-hiv-gene-therapy-in-hscs.jpg',
  'CCR5-Disrupted CD4 T-cell Therapy': 'ccr5-disrupted-cd4-t-cell-therapy.jpg',
  'Crohn’s Perianal Fistula': 'crohn-s-perianal-fistula.jpg',
  'Gut GvHD MSC Therapy': 'gut-gvhd-msc-therapy.jpg',
  'Liver Cirrhosis MSC Therapy': 'liver-cirrhosis-msc-therapy.jpg',
  'Ulcerative Colitis MSC': 'ulcerative-colitis-msc.jpg',
  'Dental Pulp Regeneration': 'dental-pulp-regeneration.jpg',
  'Periodontal Ligament Repair': 'periodontal-ligament-repair.jpg',
  'Alveolar Bone Regeneration': 'alveolar-bone-regeneration.jpg',
  'Whole-Tooth Bioengineering': 'whole-tooth-bioengineering.jpg',
  'Facial Fat Grafting + SVF': 'facial-fat-grafting-svf.jpg',
  'PRP Facial Rejuvenation': 'prp-facial-rejuvenation.jpg',
  'PRP Hair Restoration': 'prp-hair-restoration.jpg',
  'Skin Rejuvenation Exosomes': 'skin-rejuvenation-exosomes.jpg',
  'Scar & Wound MSC Therapy': 'scar-wound-msc-therapy.jpg',
  'Post-MI Cardiac Repair': 'post-mi-cardiac-repair.jpg',
  'Heart Failure MSC Therapy': 'heart-failure-msc-therapy.jpg',
  'Cardiosphere-derived Cell Therapy': 'cardiosphere-derived-cell-therapy.jpg',
  'Critical Limb Ischaemia': 'critical-limb-ischaemia.jpg',
  'Ankylosing Spondylitis': 'ankylosing-spondylitis.jpg',
  'Rheumatoid Arthritis': 'rheumatoid-arthritis.jpg',
  'Systemic Lupus Erythematosus (SLE)': 'systemic-lupus-erythematosus-sle.jpg',
  'Psoriasis & Psoriatic Arthritis': 'psoriasis-psoriatic-arthritis.jpg',
  'Sjögren’s Syndrome': 'sjogren-s-syndrome.jpg',
  'Hashimoto’s Thyroiditis': 'hashimoto-s-thyroiditis.jpg',
  'Graves’ Disease': 'graves-disease.jpg',
  'Myasthenia Gravis': 'myasthenia-gravis.jpg',
  'Autoimmune Hepatitis': 'autoimmune-hepatitis.jpg',
  'Vasculitis': 'vasculitis.jpg',
  'Vitiligo': 'vitiligo.jpg',
  'Alopecia Areata': 'alopecia-areata.jpg',
  'Polymyositis & Dermatomyositis': 'polymyositis-dermatomyositis.jpg',
  'Behçet’s Disease': 'behcet-s-disease.jpg',
  'Systemic Sclerosis (Scleroderma)': 'systemic-sclerosis-scleroderma.jpg',
  'Persona Reversal Epigenetic Reprogramming': 'persona-reversal-epigenetic-reprogramming.jpg',
  'Systemic MSC Infusion': 'systemic-msc-infusion.jpg',
  'Exosome IV Longevity': 'exosome-iv-longevity.jpg',
  'NK Cell Immune Boost': 'nk-cell-immune-boost.jpg',
  'Immune (Thymic) Rejuvenation': 'immune-thymic-rejuvenation.jpg',
  'Senolytic + MSC Program': 'senolytic-msc-program.jpg',
  'Muse Cell IV Therapy': 'muse-cell-iv-therapy.jpg',
  'VSEL Regenerative Therapy': 'vsel-regenerative-therapy.jpg',
  'Peptide Restoration Program': 'peptide-restoration-program.jpg',
  'NAD+ Infusion Therapy': 'nad-infusion-therapy.jpg',
  'Hormone Optimization (BHRT)': 'hormone-optimization-bhrt.jpg',
  'IV Nutrition (Myers’ Cocktail)': 'iv-nutrition-myers-cocktail.jpg',
  'CAR-T Cell Therapy': 'car-t-cell-therapy.jpg',
  'Chronic Kidney Disease (CKD) MSC Therapy': 'chronic-kidney-disease-ckd-msc-therapy.jpg',
  'Acute Kidney Injury (AKI) MSC Therapy': 'acute-kidney-injury-aki-msc-therapy.jpg',
  'Diabetic Kidney Disease Exosome Therapy': 'diabetic-kidney-disease-exosome-therapy.jpg',
  'Persona Reversal Renal Epigenetic Reprogramming': 'persona-reversal-renal-epigenetic-reprogramming.jpg',
};

// Per-department bundled photos.
const LOCAL: Record<string, string> = {
  'Age Rejuvenation': 'age-rejuvenation.jpg', // IV exosome infusion
  Diabetes: 'cell-lab.jpg',
  HIV: 'cleanroom.jpg',
  Autoimmune: 'cryo-tech.jpg',
  Cardiology: 'cryo-tanks.jpg',
  Pulmonology: 'cryo-tech.jpg',
  Neurology: 'neural-stem.jpg', // neural stem cells vial
  Orthopedics: 'cleanroom.jpg',
  Dental: 'dental-pulp.jpg', // dental pulp MSC vial
  Gastroenterology: 'cell-lab.jpg',
  Cosmetic: 'cryo-tanks.jpg',
};
const DEFAULT_PHOTO = 'cleanroom.jpg';

// Bump when a therapy image is re-saved under the same filename, so browsers
// re-fetch instead of serving a stale cached crop.
const IMG_VERSION = '4';

function photoUrl(make: string, model: string): string {
  const file = BY_MODEL[model] ?? LOCAL[make] ?? DEFAULT_PHOTO;
  return `${import.meta.env.BASE_URL}therapy/${file}?v=${IMG_VERSION}`;
}

export default function CarImage({ accent, className = '', make = '', model = '', fit }: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [make, model]);
  const hasPhoto = Boolean(make) && !failed;

  // Per-therapy infographics (BY_MODEL) carry titles + edge labels, so they must
  // be fully visible — 'contain'. Plain department photos (LOCAL/DEFAULT) and the
  // few plain-photo overrides look best filling the frame — 'cover'. A caller can
  // still force either via `fit`.
  const PHOTO_OVERRIDES = new Set(['Hair Restoration Exosome']); // real photos, not infographics
  const isInfographic = Boolean(model) && Boolean(BY_MODEL[model]) && !PHOTO_OVERRIDES.has(model);
  const effFit = fit ?? (isInfographic ? 'contain' : 'cover');

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{
        // 'contain' letterboxes onto a clean white ground so the full infographic reads;
        // 'cover' keeps the branded accent gradient behind the glyph fallback.
        background: effFit === 'contain'
          ? '#ffffff'
          : `linear-gradient(160deg, #ffffff 0%, ${hexA(accent, 0.1)} 60%, ${hexA(accent, 0.2)} 100%)`,
      }}
    >
      {/* branded gradient + glyph — the backdrop and the fallback */}
      <svg
        viewBox="0 0 320 176"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <circle cx="44" cy="34" r="26" fill={accent} opacity="0.08" />
        <circle cx="280" cy="140" r="34" fill={accent} opacity="0.08" />
        <circle cx="286" cy="40" r="10" fill={accent} opacity="0.12" />
        <circle cx="40" cy="150" r="7" fill={accent} opacity="0.14" />
      </svg>
      <div
        className="relative grid h-20 w-20 place-items-center rounded-2xl bg-white/80 shadow-sm backdrop-blur"
        style={{ color: accent }}
      >
        <DepartmentIcon name={make} className="h-11 w-11" strokeWidth={1.6} />
      </div>

      {/* real clinical photo on top; hides itself (revealing the glyph) on error */}
      {hasPhoto && (
        <img
          src={photoUrl(make, model)}
          alt={`${make} clinical treatment`}
          loading="lazy"
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full ${effFit === 'contain' ? 'object-contain' : 'object-cover'}`}
          draggable={false}
        />
      )}
    </div>
  );
}

// Turn a #rrggbb hex into an rgba() string with the given alpha.
function hexA(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
