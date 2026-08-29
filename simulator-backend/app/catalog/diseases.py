"""Disease → therapy → dataset catalogue (S1 / S5).

Drives the Simulator's disease dropdown. Every entry mirrors a therapy listed on
the public site (server/src/db/therapies.js). For each disease we record:

  * which **tissue / AAV capsid** the ER-100-style OSK Tet-On construct should
    target (Track A preset), and
  * whether a **curated public methylation dataset** is wired for one-click
    download (Track/analyze input). Diseases without a wired dataset fall back to
    "upload your own methylation file".

The dataset registry is deliberately conservative: only well-known GEO series are
listed. Accessions are real, but downloads happen on the user's machine — if a
file has moved, the downloader reports it plainly rather than guessing.

Everything here is illustrative research tooling, not medical advice.
"""
from __future__ import annotations

# --- tissue / capsid presets for the OSK Tet-On (ER-100-style) construct ------
# Capsid keys must exist in app/construct/parts.py::CAPSIDS.
TISSUE_PRESETS: dict[str, dict] = {
    "retina":      {"tissue": "Retina (intravitreal)",       "capsid": "aav2",  "route": "Intravitreal injection"},
    "cns":         {"tissue": "CNS (crosses BBB)",            "capsid": "aav9",  "route": "Intrathecal / systemic"},
    "systemic":    {"tissue": "Systemic / blood",             "capsid": "aav9",  "route": "IV infusion"},
    "immune":      {"tissue": "Immune (ex-vivo HSC/T-cell)",  "capsid": "aavdj", "route": "Ex-vivo then IV"},
    "joint":       {"tissue": "Joint (intra-articular)",      "capsid": "aav5",  "route": "Intra-articular"},
    "liver":       {"tissue": "Liver",                        "capsid": "aav8",  "route": "IV infusion"},
    "lung":        {"tissue": "Airway / lung",                "capsid": "aav6",  "route": "Inhaled / IV"},
    "heart":       {"tissue": "Myocardium",                   "capsid": "aav9",  "route": "Intracoronary"},
    "skin":        {"tissue": "Skin / local",                 "capsid": "aavdj", "route": "Local injection"},
    "pancreas":    {"tissue": "Pancreatic islet",             "capsid": "aav8",  "route": "IV / intra-ductal"},
    "gut":         {"tissue": "Gut mucosa",                   "capsid": "aav9",  "route": "Local / IV"},
    "bone":        {"tissue": "Bone / dental",                "capsid": "aav5",  "route": "Local implant"},
    "kidney":      {"tissue": "Kidney (tubule / glomerulus)", "capsid": "aav9",  "route": "IV infusion"},
    "muscle":      {"tissue": "Skeletal muscle",              "capsid": "aav9",  "route": "IV infusion"},
}

# --- curated methylation datasets (S5) ----------------------------------------
# method: how the downloader fetches + preps the file.
#   'suppl_avgbeta' — supplementary matrix with <sample>.AVG_Beta columns.
#   'suppl_gse40279' — GSE40279 average_beta + series_matrix (ages).
#   'series_matrix'  — the series_matrix.txt.gz itself carries the beta table.
DATASETS: dict[str, dict] = {
    "GSE40279": {
        "accession": "GSE40279", "method": "suppl_gse40279",
        "platform": "Illumina 450K", "tissue": "Whole blood", "n": 656,
        "has_age": True, "condition": "Healthy ageing cohort (Hannum et al.)",
        "beta_file": "GSE40279_average_beta.txt.gz",
        "pick": "oldest",
        "note": "Large (~1.2 GB); the downloader slices the OLDEST samples (with ages) "
        "so you can see a big age-reversal projection.",
    },
    "GSE179571": {
        "accession": "GSE179571", "method": "suppl_avgbeta",
        "platform": "Illumina EPIC", "tissue": "PBMC", "n": 60,
        "has_age": False, "condition": "Ankylosing spondylitis vs control",
        "beta_file": "GSE179571_process_data.csv.gz",
    },
    "GSE42861": {
        "accession": "GSE42861", "method": "series_matrix",
        "platform": "Illumina 450K", "tissue": "Whole blood", "n": 689,
        "has_age": True, "condition": "Rheumatoid arthritis vs control (Liu et al.)",
    },
    "GSE59250": {
        "accession": "GSE59250", "method": "series_matrix",
        "platform": "Illumina 450K", "tissue": "Whole blood / sorted cells", "n": 300,
        "has_age": True, "condition": "Systemic lupus erythematosus (Absher et al.)",
    },
    "GSE106648": {
        "accession": "GSE106648", "method": "series_matrix",
        "platform": "Illumina 450K", "tissue": "Whole blood", "n": 279,
        "has_age": True, "condition": "Multiple sclerosis vs control (Kular et al.)",
    },
    "GSE111629": {
        "accession": "GSE111629", "method": "series_matrix",
        "platform": "Illumina 450K", "tissue": "Whole blood", "n": 572,
        "has_age": True, "condition": "Parkinson's disease vs control (PEG study)",
    },
    "GSE89093": {
        "accession": "GSE89093", "method": "series_matrix",
        "platform": "Illumina 450K", "tissue": "Kidney / blood", "n": 92,
        "has_age": True, "condition": "Chronic kidney disease methylation",
        "note": "Best-effort pin — grabs the oldest patients (uses ages if the series "
        "carries them). CKD reads epigenetically old regardless. Verify it downloads; "
        "the entry is one-line swappable if it 404s.",
    },
    "GSE142512": {
        "accession": "GSE142512", "method": "series_matrix",
        "platform": "Illumina 450K", "tissue": "Whole blood", "n": 174,
        "has_age": True, "condition": "Type 1 diabetes vs control (DAISY cohort)",
        "note": "Best-effort pin — verify it downloads; one-line swappable if it 404s.",
    },
    "GSE311226": {
        "accession": "GSE311226", "method": "series_matrix",
        "platform": "Illumina EPIC/450K", "tissue": "Whole blood", "n": 200,
        "has_age": True, "condition": "Normoglycaemia / prediabetes / type 2 diabetes",
        "note": "Best-effort pin — verify it downloads; one-line swappable if it 404s.",
    },
    "GSE241366": {
        "accession": "GSE241366", "method": "series_matrix",
        "platform": "Illumina EPIC", "tissue": "Liver", "n": 60,
        "has_age": True, "condition": "Liver disease (MASH/steatohepatitis) vs healthy",
        "note": "Best-effort pin — liver tissue; cirrhosis is end-stage MASH/fibrosis. "
        "Verify on download; one-line swappable if it 404s.",
    },
}

# Generic fallback so EVERY therapy has a downloadable dataset. This is a real
# human blood epigenome (healthy-ageing cohort) used as a *baseline* to run the
# pipeline — the epigenetic age it gives is valid, it is simply not specific to
# the selected disease. Diseases with their own cohort above never use this.
DEFAULT_DATASET_KEY = "GSE40279"

# --- disease → (tissue preset, dataset) ---------------------------------------
# Keyed by the exact therapy `model` name from the public catalogue. Only the
# mappings we can preset meaningfully are listed; everything else gets a sensible
# tissue default by department and "upload your own dataset".
_DISEASE_MAP: dict[str, dict] = {
    # Age Rejuvenation
    "ER-100 Epigenetic Reprogramming": {"tissue": "retina", "dataset": "GSE40279", "approach": "both"},
    "Systemic MSC Infusion": {"tissue": "systemic", "dataset": "GSE40279"},
    "Exosome IV Longevity": {"tissue": "systemic", "dataset": "GSE40279"},
    "Immune (Thymic) Rejuvenation": {"tissue": "immune", "dataset": "GSE40279"},
    "Senolytic + MSC Program": {"tissue": "systemic", "dataset": "GSE40279"},
    # Autoimmune (immune/systemic)
    "Ankylosing Spondylitis": {"tissue": "immune", "dataset": "GSE179571"},
    "Rheumatoid Arthritis": {"tissue": "immune", "dataset": "GSE42861"},
    "Systemic Lupus Erythematosus (SLE)": {"tissue": "immune", "dataset": "GSE59250"},
    # Neurology (CNS)
    "Multiple Sclerosis aHSCT": {"tissue": "cns", "dataset": "GSE106648"},
    "Parkinson’s iPSC Dopaminergic": {"tissue": "cns", "dataset": "GSE111629"},
    "Parkinson's iPSC Dopaminergic": {"tissue": "cns", "dataset": "GSE111629"},
    "Stroke Recovery MSC": {"tissue": "cns"},
    "Spinal Cord Injury NSC": {"tissue": "cns"},
    "ALS / MND MSC Therapy": {"tissue": "cns"},
    "Muscular Dystrophy": {"tissue": "muscle"},
    "FSHD (Facioscapulohumeral Dystrophy)": {"tissue": "muscle", "approach": "er100"},
    # Gastroenterology / Cardiology (specific cohorts)
    "Liver Cirrhosis MSC Therapy": {"tissue": "liver", "dataset": "GSE241366"},
    # Diabetes
    "Type 1 Diabetes": {"tissue": "pancreas", "dataset": "GSE142512"},
    "Type 2 Diabetes": {"tissue": "pancreas", "dataset": "GSE311226"},
    # Nephrology (kidney)
    "Chronic Kidney Disease (CKD) MSC Therapy": {"tissue": "kidney", "dataset": "GSE89093"},
    "Acute Kidney Injury (AKI) MSC Therapy": {"tissue": "kidney", "dataset": "GSE89093"},
    "Diabetic Kidney Disease Exosome Therapy": {"tissue": "kidney", "dataset": "GSE89093"},
    "ER-100 Renal Epigenetic Reprogramming": {"tissue": "kidney", "dataset": "GSE89093", "approach": "both"},
}

# Department → default tissue when a disease isn't explicitly mapped.
_DEPT_TISSUE: dict[str, str] = {
    "Age Rejuvenation": "systemic",
    "Diabetes": "pancreas",
    "HIV": "immune",
    "Autoimmune": "immune",
    "Dental": "bone",
    "Orthopedics": "joint",
    "Cardiology": "heart",
    "Gastroenterology": "gut",
    "Neurology": "cns",
    "Pulmonology": "lung",
    "Nephrology": "kidney",
    "Cosmetic": "skin",
}

# Department display order.
DEPARTMENTS = [
    "Age Rejuvenation", "Autoimmune", "Neurology", "Nephrology", "Diabetes", "HIV",
    "Cardiology", "Pulmonology", "Orthopedics", "Gastroenterology", "Dental", "Cosmetic",
]

# The therapy catalogue mirrored from server/src/db/therapies.js (model + dept).
# (dept, model, category, route, status)
_THERAPIES: list[tuple[str, str, str, str, str]] = [
    ("Age Rejuvenation", "ER-100 Epigenetic Reprogramming", "iPSC", "Intravitreal injection", "research"),
    ("Age Rejuvenation", "Systemic MSC Infusion", "MSC", "IV infusion", "research"),
    ("Age Rejuvenation", "Exosome IV Longevity", "Exosome", "IV infusion", "research"),
    ("Age Rejuvenation", "NK Cell Immune Boost", "Immune cell", "IV infusion", "available"),
    ("Age Rejuvenation", "Immune (Thymic) Rejuvenation", "Immune cell", "IV infusion", "research"),
    ("Age Rejuvenation", "Senolytic + MSC Program", "MSC", "IV infusion", "research"),
    ("Diabetes", "Type 1 Diabetes", "iPSC", "IV infusion", "research"),
    ("Diabetes", "Type 2 Diabetes", "MSC", "IV infusion", "research"),
    ("HIV", "CCR5-Δ32 Stem-Cell Transplant", "HSC", "IV infusion", "available"),
    ("HIV", "Cord-Blood CCR5-Δ32 Transplant", "HSC", "IV infusion", "available"),
    ("HIV", "CCR5 Gene-Edited HSC Therapy", "HSC", "IV infusion", "research"),
    ("HIV", "Anti-HIV Gene Therapy in HSCs", "HSC", "IV infusion", "research"),
    ("HIV", "CCR5-Disrupted CD4 T-cell Therapy", "Immune cell", "IV infusion", "research"),
    ("Autoimmune", "Ankylosing Spondylitis", "MSC", "IV infusion", "research"),
    ("Autoimmune", "Rheumatoid Arthritis", "MSC", "IV infusion", "research"),
    ("Autoimmune", "Systemic Lupus Erythematosus (SLE)", "MSC", "IV infusion", "research"),
    ("Autoimmune", "Psoriasis & Psoriatic Arthritis", "MSC", "IV infusion", "research"),
    ("Autoimmune", "Systemic Sclerosis (Scleroderma)", "HSC", "IV infusion", "available"),
    ("Autoimmune", "Sjögren’s Syndrome", "MSC", "IV infusion", "research"),
    ("Autoimmune", "Hashimoto’s Thyroiditis", "MSC", "IV infusion", "research"),
    ("Autoimmune", "Graves’ Disease", "MSC", "IV infusion", "research"),
    ("Autoimmune", "Myasthenia Gravis", "MSC", "IV infusion", "research"),
    ("Autoimmune", "Autoimmune Hepatitis", "MSC", "IV infusion", "research"),
    ("Autoimmune", "Vasculitis", "MSC", "IV infusion", "research"),
    ("Autoimmune", "Vitiligo", "Exosome", "Local injection", "research"),
    ("Autoimmune", "Alopecia Areata", "Exosome", "Local injection", "research"),
    ("Autoimmune", "Polymyositis & Dermatomyositis", "MSC", "IV infusion", "research"),
    ("Autoimmune", "Behçet’s Disease", "MSC", "IV infusion", "research"),
    ("Dental", "Dental Pulp Regeneration", "MSC", "Local injection", "available"),
    ("Dental", "Periodontal Ligament Repair", "MSC", "Local injection", "research"),
    ("Dental", "Alveolar Bone Regeneration", "MSC", "Surgical implant", "available"),
    ("Dental", "Whole-Tooth Bioengineering", "iPSC", "Surgical implant", "research"),
    ("Orthopedics", "Knee Osteoarthritis MSC Therapy", "MSC", "Intra-articular", "available"),
    ("Orthopedics", "Cartilage Repair", "MSC", "Intra-articular", "available"),
    ("Orthopedics", "Non-union Fracture Repair", "MSC", "Surgical implant", "available"),
    ("Orthopedics", "Intervertebral Disc Regeneration", "MSC", "Local injection", "research"),
    ("Orthopedics", "Tendon & Ligament PRP-MSC", "PRP", "Local injection", "available"),
    ("Cardiology", "Post-MI Cardiac Repair", "MSC", "Intracoronary", "research"),
    ("Cardiology", "Heart Failure MSC Therapy", "MSC", "Intramyocardial", "research"),
    ("Cardiology", "Cardiosphere-derived Cell Therapy", "MSC", "Intracoronary", "research"),
    ("Cardiology", "Critical Limb Ischaemia", "HSC", "Intramuscular", "available"),
    ("Gastroenterology", "Crohn’s Perianal Fistula", "MSC", "Local injection", "available"),
    ("Gastroenterology", "Gut GvHD MSC Therapy", "MSC", "IV infusion", "available"),
    ("Gastroenterology", "Liver Cirrhosis MSC Therapy", "MSC", "IV infusion", "research"),
    ("Gastroenterology", "Ulcerative Colitis MSC", "MSC", "IV infusion", "research"),
    ("Neurology", "Multiple Sclerosis aHSCT", "HSC", "IV infusion", "available"),
    ("Neurology", "Spinal Cord Injury NSC", "iPSC", "Intrathecal", "research"),
    ("Neurology", "Stroke Recovery MSC", "MSC", "IV infusion", "research"),
    ("Neurology", "Parkinson’s iPSC Dopaminergic", "iPSC", "Surgical implant", "research"),
    ("Neurology", "ALS / MND MSC Therapy", "MSC", "Intrathecal", "research"),
    ("Neurology", "Muscular Dystrophy", "MSC", "IV infusion", "research"),
    ("Neurology", "FSHD (Facioscapulohumeral Dystrophy)", "iPSC", "IV infusion", "research"),
    ("Pulmonology", "COPD MSC Therapy", "MSC", "IV infusion", "research"),
    ("Pulmonology", "Pulmonary Fibrosis (IPF) MSC", "MSC", "IV infusion", "research"),
    ("Pulmonology", "ARDS MSC Therapy", "MSC", "IV infusion", "research"),
    ("Pulmonology", "Airway Epithelial Regeneration", "iPSC", "Surgical implant", "research"),
    ("Nephrology", "Chronic Kidney Disease (CKD) MSC Therapy", "MSC", "IV infusion", "research"),
    ("Nephrology", "Acute Kidney Injury (AKI) MSC Therapy", "MSC", "IV infusion", "research"),
    ("Nephrology", "Diabetic Kidney Disease Exosome Therapy", "Exosome", "IV infusion", "research"),
    ("Nephrology", "ER-100 Renal Epigenetic Reprogramming", "iPSC", "IV infusion", "research"),
    ("Cosmetic", "Facial Fat Grafting + SVF", "MSC", "Local injection", "available"),
    ("Cosmetic", "Hair Restoration Exosome", "Exosome", "Local injection", "available"),
    ("Cosmetic", "Skin Rejuvenation Exosomes", "Exosome", "Topical", "available"),
    ("Cosmetic", "Scar & Wound MSC Therapy", "MSC", "Local injection", "available"),
]


def _slug(dept: str, model: str) -> str:
    import re
    s = f"{dept}-{model}".lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def disease_catalog() -> dict:
    """The full disease list for the dropdown, grouped by department, each with
    its ER-100 tissue/capsid preset and dataset-readiness."""
    items: list[dict] = []
    for dept, model, category, route, status in _THERAPIES:
        mapping = _DISEASE_MAP.get(model, {})
        tissue_key = mapping.get("tissue") or _DEPT_TISSUE.get(dept, "systemic")
        preset = TISSUE_PRESETS[tissue_key]
        ds_key = mapping.get("dataset")
        proxy = ds_key is None
        ds = DATASETS.get(ds_key) if ds_key else DATASETS.get(DEFAULT_DATASET_KEY)
        items.append({
            "key": _slug(dept, model),
            "department": dept,
            "disease": model,
            "category": category,
            "route": route,
            "status": status,
            "default_approach": mapping.get("approach", "both"),
            "tissue_key": tissue_key,
            "tissue": preset["tissue"],
            "capsid": preset["capsid"],
            "construct_route": preset["route"],
            "dataset_ready": ds is not None,
            "dataset": ({
                "accession": ds["accession"],
                "platform": ds["platform"],
                "tissue": ds["tissue"],
                "condition": (f"Generic blood-methylation baseline — not {model}-specific"
                              if proxy else ds["condition"]),
                "has_age": ds["has_age"],
                "n": ds["n"],
                "note": ("A real human blood epigenome used as a baseline to run the pipeline; "
                         "no disease-specific cohort is wired for this therapy yet — upload your "
                         "own for a specific analysis." if proxy else ds.get("note", "")),
                "proxy": proxy,
            } if ds else None),
        })
    return {
        "departments": DEPARTMENTS,
        "diseases": items,
        "capsids": None,  # filled by the route from construct.CAPSIDS
    }


def dataset_for_disease(disease_key: str) -> dict | None:
    """Resolve a disease key to its dataset (specific cohort, else the baseline)."""
    for dept, model, *_ in _THERAPIES:
        if _slug(dept, model) == disease_key:
            ds_key = (_DISEASE_MAP.get(model) or {}).get("dataset") or DEFAULT_DATASET_KEY
            return DATASETS.get(ds_key)
    return None


def disease_by_key(disease_key: str) -> dict | None:
    for item in disease_catalog()["diseases"]:
        if item["key"] == disease_key:
            return item
    return None
