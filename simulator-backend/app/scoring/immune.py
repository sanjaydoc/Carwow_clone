"""Step 8 — Immune & Adverse-Event Safety Envelope (offline parity).

Mirrors client/src/sim/immune.ts EXACTLY (same tables, same formula) so the
local simulator, the /simulator web page and the De-Novo chat all agree.

The r/stemcells reality: most reported harms from MSC / cell therapy are NOT
tumorigenicity (Step 7's iPSC/OSK concern) — they're inflammatory, embolic,
immune and procedural events. This estimates a per-patient, per-therapy RELATIVE
risk across those classes, two-layer:

    Layer 1 — clinical:   route/tissue baseline x comorbidity modifiers
    Layer 2 — epigenetic: age-acceleration (inflammaging proxy) x dose/cycles

HONESTY (hard boundary): a methylation file is NOT a genotype, so this cannot
see HLA type or clotting variants, nor the product/clinic. Relative, probabilistic
read — never a yes/no verdict. Not medical advice.
"""
from __future__ import annotations

AE_LABEL = {
    "local": "Local inflammatory",
    "infusion": "Infusion / systemic reaction",
    "embolic": "Pulmonary embolic / clotting (IBMIR)",
    "immune": "Immune reaction / disease flare",
    "conditioning": "Conditioning toxicity + infection",
    "procedural": "Procedural / access",
}

_AE_SYMPTOMS = {
    "local": ["injection-site pain", "swelling / effusion", "stiffness", "warmth (transient synovitis)"],
    "infusion": ["fever / chills", "fatigue", "headache", "nausea", "flushing"],
    "embolic": ["breathlessness / chest tightness", "clotting activation (IBMIR)", "rare pulmonary embolism"],
    "immune": ["immune reaction", "flare of the underlying disease", "allo-sensitization (anti-HLA antibodies)"],
    "conditioning": ["cytopenias", "neutropenic fever", "mucositis", "hair loss", "serious infection"],
    "procedural": ["procedure-site pain / bruising", "transient fever", "procedural infection"],
}

_PROCEDURAL_BY_TISSUE = {
    "cns": ["post-lumbar-puncture headache", "back pain", "nausea", "rare arachnoiditis / meningitis"],
    "heart": ["access-site bruising / bleeding", "transient arrhythmia", "coronary microembolism"],
    "pancreas": ["abdominal pain", "pancreatitis (intra-ductal)", "procedural infection"],
    "joint": ["injection-site pain", "rare septic arthritis"],
    "retina": ["ocular discomfort", "raised eye pressure", "rare endophthalmitis"],
}

# Layer 1a: route/tissue baseline weights (0..1) per class — keyed by tissue_key.
_TISSUE_BASELINE = {
    "joint":    {"local": 0.45, "procedural": 0.20, "immune": 0.12},
    "skin":     {"local": 0.35, "procedural": 0.18, "immune": 0.10},
    "systemic": {"infusion": 0.40, "embolic": 0.35, "immune": 0.18, "procedural": 0.06},
    "liver":    {"infusion": 0.38, "embolic": 0.34, "immune": 0.16, "procedural": 0.10},
    "kidney":   {"infusion": 0.42, "embolic": 0.30, "immune": 0.16, "procedural": 0.08},
    "pancreas": {"infusion": 0.35, "embolic": 0.28, "procedural": 0.30, "immune": 0.16},
    "heart":    {"procedural": 0.38, "embolic": 0.36, "infusion": 0.24, "immune": 0.12},
    "lung":     {"embolic": 0.42, "infusion": 0.30, "local": 0.20, "procedural": 0.12},
    "cns":      {"procedural": 0.42, "infusion": 0.24, "immune": 0.20, "local": 0.16},
    "immune":   {"conditioning": 0.60, "immune": 0.40, "infusion": 0.26, "embolic": 0.18},
    "bone":     {"local": 0.38, "procedural": 0.28, "immune": 0.12},
    "muscle":   {"infusion": 0.32, "embolic": 0.28, "local": 0.20, "immune": 0.12},
    "gut":      {"infusion": 0.32, "immune": 0.26, "procedural": 0.22, "embolic": 0.18},
    "retina":   {"procedural": 0.40, "local": 0.24, "immune": 0.18},
}

# Layer 1b: mechanistic risk buckets (multipliers per class).
_BUCKET_MULT = {
    "diabetes":           {"local": 1.4, "procedural": 1.5, "embolic": 1.2},
    "ckd":                {"infusion": 1.5, "embolic": 1.2, "procedural": 1.2},
    "copd":               {"embolic": 1.8, "procedural": 1.2, "infusion": 1.1},
    "respiratory":        {"embolic": 1.4, "infusion": 1.1},
    "cirrhosis":          {"embolic": 1.6, "procedural": 1.4, "infusion": 1.1},
    "autoimmune":         {"immune": 1.8, "procedural": 1.2},
    "immunosuppressed":   {"procedural": 1.6, "conditioning": 1.2, "immune": 1.1},
    "prior_cell_therapy": {"immune": 1.5},
    "allogeneic":         {"immune": 1.7},
    "thrombophilia":      {"embolic": 2.0},
    "cardiovascular":     {"embolic": 1.4, "procedural": 1.3},
    "obesity":            {"embolic": 1.3, "local": 1.2, "procedural": 1.2},
    "cancer":             {"immune": 1.2, "procedural": 1.2},
    "anticoagulated":     {"procedural": 1.5},
    "infection_active":   {"procedural": 1.5, "infusion": 1.2},
    "smoker":             {"embolic": 1.4, "procedural": 1.2},
    "frailty":            {"infusion": 1.2, "procedural": 1.2},
}
_BUCKET_LABEL = {
    "diabetes": "diabetes", "ckd": "kidney disease", "copd": "COPD", "respiratory": "lung disease",
    "cirrhosis": "liver disease", "autoimmune": "autoimmune", "immunosuppressed": "immunosuppression",
    "prior_cell_therapy": "prior cell therapy", "allogeneic": "donor cells", "thrombophilia": "clotting disorder",
    "cardiovascular": "cardiovascular disease", "obesity": "obesity", "cancer": "cancer",
    "anticoagulated": "blood thinners", "infection_active": "active infection", "smoker": "smoking", "frailty": "frailty",
}

# Department-grouped condition taxonomy (user-facing) — parity with immune.ts.
CONDITIONS = [
    {"key": "t1d", "label": "Type 1 diabetes", "group": "Metabolic & endocrine", "buckets": ["diabetes"]},
    {"key": "t2d", "label": "Type 2 diabetes", "group": "Metabolic & endocrine", "buckets": ["diabetes"]},
    {"key": "obesity", "label": "Obesity", "group": "Metabolic & endocrine", "buckets": ["obesity"]},
    {"key": "metabolic", "label": "Metabolic syndrome", "group": "Metabolic & endocrine", "buckets": ["obesity", "diabetes"]},
    {"key": "thyroid", "label": "Thyroid disorder", "group": "Metabolic & endocrine", "buckets": ["autoimmune"]},
    {"key": "ckd", "label": "Chronic kidney disease", "group": "Kidney", "buckets": ["ckd"]},
    {"key": "aki", "label": "Acute kidney injury", "group": "Kidney", "buckets": ["ckd"]},
    {"key": "dialysis", "label": "On dialysis", "group": "Kidney", "buckets": ["ckd", "infection_active"]},
    {"key": "kidney_transplant", "label": "Kidney transplant", "group": "Kidney", "buckets": ["immunosuppressed"]},
    {"key": "copd", "label": "COPD / emphysema", "group": "Respiratory", "buckets": ["copd"]},
    {"key": "asthma", "label": "Asthma", "group": "Respiratory", "buckets": ["respiratory"]},
    {"key": "pulm_fibrosis", "label": "Pulmonary fibrosis", "group": "Respiratory", "buckets": ["respiratory"]},
    {"key": "prior_pe", "label": "Prior pulmonary embolism", "group": "Respiratory", "buckets": ["thrombophilia"]},
    {"key": "cirrhosis", "label": "Liver cirrhosis", "group": "Liver & GI", "buckets": ["cirrhosis"]},
    {"key": "hepatitis", "label": "Hepatitis", "group": "Liver & GI", "buckets": ["cirrhosis"]},
    {"key": "nafld", "label": "Fatty liver (NAFLD)", "group": "Liver & GI", "buckets": ["cirrhosis", "obesity"]},
    {"key": "ibd", "label": "IBD (Crohn's / colitis)", "group": "Liver & GI", "buckets": ["autoimmune", "immunosuppressed"]},
    {"key": "cad", "label": "Coronary artery disease", "group": "Cardiovascular", "buckets": ["cardiovascular"]},
    {"key": "heart_failure", "label": "Heart failure", "group": "Cardiovascular", "buckets": ["cardiovascular"]},
    {"key": "hypertension", "label": "Hypertension", "group": "Cardiovascular", "buckets": ["cardiovascular"]},
    {"key": "afib", "label": "Atrial fibrillation / arrhythmia", "group": "Cardiovascular", "buckets": ["cardiovascular", "anticoagulated"]},
    {"key": "prior_stroke", "label": "Prior stroke", "group": "Cardiovascular", "buckets": ["cardiovascular", "thrombophilia"]},
    {"key": "ra", "label": "Rheumatoid arthritis", "group": "Autoimmune & rheumatology", "buckets": ["autoimmune"]},
    {"key": "sle", "label": "Lupus (SLE)", "group": "Autoimmune & rheumatology", "buckets": ["autoimmune"]},
    {"key": "as", "label": "Ankylosing spondylitis", "group": "Autoimmune & rheumatology", "buckets": ["autoimmune"]},
    {"key": "ms", "label": "Multiple sclerosis", "group": "Autoimmune & rheumatology", "buckets": ["autoimmune"]},
    {"key": "psoriasis", "label": "Psoriasis / PsA", "group": "Autoimmune & rheumatology", "buckets": ["autoimmune"]},
    {"key": "autoimmune_other", "label": "Other autoimmune disease", "group": "Autoimmune & rheumatology", "buckets": ["autoimmune"]},
    {"key": "thrombophilia", "label": "Known clotting disorder", "group": "Blood & clotting", "buckets": ["thrombophilia"]},
    {"key": "anticoagulated", "label": "On blood thinners", "group": "Blood & clotting", "buckets": ["anticoagulated"]},
    {"key": "bleeding", "label": "Bleeding disorder", "group": "Blood & clotting", "buckets": ["anticoagulated"]},
    {"key": "anemia", "label": "Anemia", "group": "Blood & clotting", "buckets": ["frailty"]},
    {"key": "immunosuppressed", "label": "On immunosuppressants", "group": "Immune status", "buckets": ["immunosuppressed"]},
    {"key": "active_infection", "label": "Recent / active infection", "group": "Immune status", "buckets": ["infection_active"]},
    {"key": "transplant", "label": "Prior organ transplant", "group": "Immune status", "buckets": ["immunosuppressed"]},
    {"key": "immunodeficiency", "label": "Immunodeficiency", "group": "Immune status", "buckets": ["immunosuppressed"]},
    {"key": "cancer_active", "label": "Current cancer", "group": "Oncology", "buckets": ["cancer", "immunosuppressed"]},
    {"key": "cancer_history", "label": "History of cancer", "group": "Oncology", "buckets": ["cancer"]},
    {"key": "chemo", "label": "On chemotherapy", "group": "Oncology", "buckets": ["immunosuppressed", "cancer"]},
    {"key": "prior_cell_therapy", "label": "Prior cell / stem-cell therapy", "group": "Cell & gene therapy history", "buckets": ["prior_cell_therapy"]},
    {"key": "allogeneic", "label": "Donor (allogeneic) cells", "group": "Cell & gene therapy history", "buckets": ["allogeneic"]},
    {"key": "prior_gene_therapy", "label": "Prior AAV / gene therapy", "group": "Cell & gene therapy history", "buckets": ["prior_cell_therapy"]},
    {"key": "smoker", "label": "Current smoker", "group": "Lifestyle & other", "buckets": ["smoker"]},
    {"key": "pregnancy", "label": "Pregnant / breastfeeding", "group": "Lifestyle & other", "buckets": ["frailty"]},
    {"key": "frailty", "label": "Advanced-age frailty", "group": "Lifestyle & other", "buckets": ["frailty"]},
]
_COND_BY_KEY = {c["key"]: c for c in CONDITIONS}
# Back-compat alias — earlier code imported COMORBIDITIES.
COMORBIDITIES = CONDITIONS

_DEPARTMENT_IMPLIED = {
    "Diabetes": "t2d",
    "Nephrology": "ckd",
    "Pulmonology": "copd",
    "Gastroenterology": "cirrhosis",
    "Autoimmune": "autoimmune_other",
}


def _resolve_buckets(condition_keys: list[str]) -> set[str]:
    buckets: set[str] = set()
    for k in condition_keys:
        cond = _COND_BY_KEY.get(k)
        if cond:
            buckets.update(cond["buckets"])
        elif k in _BUCKET_MULT:  # legacy: a bucket key stored directly
            buckets.add(k)
    return buckets

_CANT_SEE = [
    "HLA type & clotting-gene variants — a methylation file is not a genotype",
    "The product itself: cell source, dose, viability, sterility",
    "The clinic's technique and infection controls",
    "Delayed effects beyond the modelled window",
]

_INFLAMMATORY = ("local", "infusion", "embolic", "immune")


def implied_comorbidity(department: str | None) -> str | None:
    return _DEPARTMENT_IMPLIED.get((department or "").strip())


# Alias mirroring immune.ts naming.
implied_condition = implied_comorbidity


def _tests_for(tissue_key: str, buckets: set[str]) -> list[str]:
    t: list[str] = []
    w = _TISSUE_BASELINE.get(tissue_key, _TISSUE_BASELINE["systemic"])
    if w.get("embolic", 0) >= 0.25 or "thrombophilia" in buckets:
        t.append("Thrombophilia screen (e.g. Factor V Leiden) + baseline CRP before IV cells")
    if "anticoagulated" in buckets:
        t.append("Review blood-thinner / bleeding plan before any procedure")
    if w.get("local", 0) >= 0.3 or w.get("procedural", 0) >= 0.3:
        t.append("Confirm the clinic's cell-prep sterility & infection precautions")
    if "allogeneic" in buckets or "prior_cell_therapy" in buckets:
        t.append("HLA typing / anti-HLA antibody panel (donor-cell or repeat-dose immune risk)")
    if tissue_key == "lung" or "copd" in buckets or "respiratory" in buckets:
        t.append("Pulmonary function tests + O2 saturation (reduced reserve for pulmonary entrapment)")
    if tissue_key == "cns":
        t.append("Discuss lumbar-puncture risks (post-LP headache, rare arachnoiditis)")
    if "cirrhosis" in buckets:
        t.append("Coagulation panel + platelets (rebalanced hemostasis)")
    if "ckd" in buckets:
        t.append("Fluid-status / volume review before IV infusion")
    if "autoimmune" in buckets:
        t.append("Disease-activity review — cell therapy can trigger a flare")
    if "cancer" in buckets:
        t.append("Oncology clearance + tumour markers before proliferative cell therapy")
    if "infection_active" in buckets:
        t.append("Clear any active infection before an immunomodulatory infusion")
    t.append("Ask for the product's cell source, dose, viability and release testing")
    return t


def _tier_of(x: float) -> str:
    # Likelihood of common, usually-mild reactions (not a severity grade).
    return "Uncommon" if x < 0.25 else "Possible" if x < 0.5 else "Common"


def immune_safety(
    tissue_key: str | None = None,
    department: str | None = None,
    age_acceleration: float | None = None,
    coverage: float = 1.0,
    cycles: int = 1,
    comorbidities: list[str] | None = None,
) -> dict:
    tissue_key = (tissue_key or "systemic").lower()
    baseline = _TISSUE_BASELINE.get(tissue_key, _TISSUE_BASELINE["systemic"])
    accel = max(0.0, age_acceleration or 0.0)
    coverage = coverage if coverage is not None else 1.0
    cycles = max(1, min(int(cycles or 1), 10))

    selected = list(comorbidities or [])
    implied = implied_comorbidity(department)
    if implied and implied not in selected:
        selected.append(implied)
    buckets = _resolve_buckets(selected)

    infla_mult = 1 + min(accel, 20.0) * 0.02
    dose_mult = 1 + (cycles - 1) * 0.08

    classes: list[dict] = []
    all_drivers: list[str] = []

    for key, base in baseline.items():
        if base < 0.1:
            continue
        score = base
        drivers: list[str] = []
        for b in buckets:
            m = _BUCKET_MULT.get(b, {}).get(key)
            if m and m != 1:
                score *= m
                drivers.append(f"{_BUCKET_LABEL.get(b, b)} (x{m})")
        if key in _INFLAMMATORY and infla_mult > 1.001:
            score *= infla_mult
            drivers.append(f"epigenetic age-acceleration +{round(accel, 1)} yr (x{round(infla_mult, 2)})")
        if key in ("embolic", "local", "infusion") and dose_mult > 1.001:
            score *= dose_mult
            drivers.append(f"{cycles} dose(s) (x{round(dose_mult, 2)})")

        index = min(0.98, round(score, 3))
        symptoms = (_PROCEDURAL_BY_TISSUE.get(tissue_key) if key == "procedural" and tissue_key in _PROCEDURAL_BY_TISSUE
                    else _AE_SYMPTOMS[key])
        classes.append({"key": key, "label": AE_LABEL[key], "tier": _tier_of(index),
                        "index": index, "symptoms": symptoms, "drivers": drivers})
        all_drivers.extend(drivers)

    classes.sort(key=lambda c: c["index"], reverse=True)
    order = ["Uncommon", "Possible", "Common"]
    overall = "Uncommon"
    for c in classes:
        if order.index(c["tier"]) > order.index(overall):
            overall = c["tier"]

    modifiable: list[str] = []
    if accel >= 5:
        modifiable.append(f"Elevated inflammatory baseline (age-acceleration +{round(accel, 1)} yr) is partly "
                          "reversible — reduce it and re-test before therapy.")
    if "autoimmune" in buckets:
        modifiable.append("Treat to low disease activity before cell therapy to lower flare risk.")
    if "ckd" in buckets:
        modifiable.append("Optimise fluid status before an IV infusion.")
    if "smoker" in buckets:
        modifiable.append("Stopping smoking lowers clotting and infection risk before therapy.")
    if "infection_active" in buckets:
        modifiable.append("Clear any active infection before an immunomodulatory infusion.")
    if coverage < 0.8:
        modifiable.append(f"CpG coverage {int(coverage * 100)}% — lower confidence; treat this as provisional.")

    comorb_names = [(_COND_BY_KEY.get(k, {}).get("label", k) + (" (indication)" if k == implied else ""))
                    for k in selected]
    lead = classes[0] if classes else None
    if lead:
        summary = (f"Most likely reaction for this route is {lead['label'].lower()} ({lead['tier'].lower()}) — "
                   "these are usually mild, short-lived and managed with premedication and observation. "
                   f"Overall symptom outlook: {overall.lower()}. A relative, probabilistic read "
                   "from your epigenetic profile + history — not a yes/no verdict.")
    else:
        summary = f"Overall symptom outlook: {overall.lower()}."

    return {
        "overall_tier": overall,
        "classes": classes,
        "drivers": list(dict.fromkeys(all_drivers)),
        "modifiable": modifiable,
        "tests_to_ask": _tests_for(tissue_key, buckets),
        "cant_see": _CANT_SEE,
        "comorbidities": comorb_names,
        "summary": summary,
        "disclaimer": "Illustrative likelihood of common, usually-mild infusion/procedure reactions — not a severity "
        "grade, diagnosis or yes/no prediction. A methylation file is not a genotype: it cannot read HLA type or clotting variants, "
        "and it cannot see the product or clinic. It informs the conversation with your clinician; it does not "
        "replace it. Not medical advice.",
    }
