"""Genome personalisation — read the uploaded variants and flag ones that matter
for the selected therapy.

This turns the whole-genome / genotype upload from "displayed" into "shapes the
therapy": it checks a curated panel of **real, well-known** variants (dbSNP rsIDs)
covering (a) disease risk relevant to the chosen department, (b) pharmacogenomics
that affects dosing/immunosuppression, and (c) longevity alleles.

It reports what the person actually carries — nothing is uploaded, all local.

Illustrative research tool: allele orientation follows the forward strand as most
consumer arrays report it; a real clinical readout needs a validated pipeline.
Not medical advice.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from ..ingest.genotype import Genotype


@dataclass
class Variant:
    rsid: str
    gene: str
    condition: str
    category: str                 # "disease" | "pharmacogenomics" | "longevity" | "delivery"
    relevance: list[str]          # department names, or ["all"]
    risk_allele: str              # the allele counted (D = deletion for indels)
    effect: str                   # what carrying it means
    protective: bool = False      # True when the counted allele is protective, not risk


# --- curated panel (every entry is a real, citable variant) -------------------
PANEL: list[Variant] = [
    # Delivery / disease — HIV
    Variant("rs333", "CCR5", "CCR5-Δ32 (HIV resistance)", "delivery", ["HIV"], "D",
            "Homozygous Δ32 confers natural HIV-1 resistance — the basis of the CCR5-Δ32 "
            "transplant cures; a carrier is the ideal autologous starting point.", protective=True),
    # Autoimmune
    Variant("rs2476601", "PTPN22", "Autoimmunity (RA, T1D, SLE)", "disease",
            ["Autoimmune", "Diabetes"], "A",
            "The A (620W) allele raises risk across several autoimmune diseases — supports an "
            "immune-reset / MSC-immunomodulation rationale."),
    Variant("rs4349859", "HLA-B*27 tag", "Ankylosing spondylitis", "disease", ["Autoimmune"], "A",
            "Tags HLA-B27, the dominant AS risk allele — a carrier fits the AS indication."),
    # Neurology
    Variant("rs34637584", "LRRK2 (G2019S)", "Parkinson's disease", "disease", ["Neurology"], "A",
            "The G2019S risk allele — a monogenic-ish Parkinson's driver; flags a genetic PD subtype."),
    # Diabetes
    Variant("rs7903146", "TCF7L2", "Type 2 diabetes", "disease", ["Diabetes"], "T",
            "The strongest common T2D risk variant; each T allele raises risk."),
    Variant("rs2187668", "HLA-DQ2.5", "Type 1 diabetes / coeliac", "disease", ["Diabetes"], "T",
            "Tags the HLA-DQ2.5 haplotype — major T1D/autoimmune susceptibility."),
    # Cardiology
    Variant("rs1333049", "9p21 (CDKN2A/B)", "Coronary artery disease", "disease", ["Cardiology"], "C",
            "The 9p21 C allele raises coronary risk — relevant to ischaemic cardiac therapy."),
    # Longevity (Age Rejuvenation)
    Variant("rs2802292", "FOXO3", "Longevity", "longevity", ["Age Rejuvenation", "all"], "G",
            "The G allele is enriched in long-lived people — a favourable longevity marker.",
            protective=True),
    # Pharmacogenomics — dosing, relevant to every therapy (esp. transplant/immunosuppression)
    Variant("rs4244285", "CYP2C19*2", "Drug metabolism (clopidogrel, PPIs)", "pharmacogenomics",
            ["all"], "A", "Loss-of-function *2 — a poor metaboliser copy; alters dosing of several drugs."),
    Variant("rs1142345", "TPMT*3C", "Thiopurine dosing (immunosuppression)", "pharmacogenomics",
            ["all"], "G", "Reduced TPMT activity — thiopurine immunosuppressants need dose reduction; "
            "important around transplant conditioning."),
    Variant("rs9923231", "VKORC1", "Warfarin sensitivity", "pharmacogenomics", ["all"], "T",
            "The T allele increases warfarin sensitivity — lower anticoagulant dose."),
    Variant("rs1801133", "MTHFR (C677T)", "Folate metabolism", "pharmacogenomics", ["all"], "T",
            "The T allele reduces MTHFR activity — affects folate/homocysteine handling."),
]

# APOE is a 2-SNP haplotype, handled specially.
_APOE = ("rs429358", "rs7412")


def _copies(geno: str, allele: str) -> int:
    g = (geno or "").upper()
    # Indel-style calls: D/I (deletion/insertion).
    if allele == "D":
        return g.count("D")
    return sum(1 for ch in g if ch == allele)


def _zygosity(copies: int) -> str:
    return {0: "not carried", 1: "heterozygous (1 copy)", 2: "homozygous (2 copies)"}.get(copies, f"{copies} copies")


def _apoe(genotype: Genotype) -> dict | None:
    a = genotype.get(_APOE[0])   # rs429358: C defines ε4
    b = genotype.get(_APOE[1])   # rs7412:   T defines ε2
    if not a and not b:
        return None
    e4 = _copies(a or "", "C")
    e2 = _copies(b or "", "T")
    if e4 >= 1:
        risk, effect = "higher", f"{e4} ε4 allele(s) — higher Alzheimer's / accelerated-ageing risk."
    elif e2 >= 1:
        risk, effect = "protective", f"{e2} ε2 allele(s) — associated with lower Alzheimer's risk and longevity."
    else:
        risk, effect = "typical", "ε3/ε3 — the common, neutral APOE genotype."
    return {
        "gene": "APOE", "rsid": "rs429358+rs7412", "condition": "Alzheimer's / ageing",
        "category": "longevity", "genotype": f"{a or '?'}/{b or '?'}",
        "interpretation": effect, "risk_level": risk,
        "relevant": True,
    }


def personalize(genotype: Genotype, department: str | None = None) -> dict:
    """Check the panel against the person's calls; flag department-relevant hits."""
    dept = department or ""
    findings: list[dict] = []
    n_found = 0

    apoe = _apoe(genotype)
    if apoe:
        n_found += 1
        findings.append(apoe)

    for v in PANEL:
        geno = genotype.get(v.rsid)
        if geno is None:
            continue
        n_found += 1
        copies = _copies(geno, v.risk_allele)
        relevant = dept in v.relevance or "all" in v.relevance
        if copies == 0:
            risk = "typical"
            interp = f"{v.condition}: not carried ({v.gene})."
        else:
            risk = "protective" if v.protective else "higher"
            interp = f"{v.condition}: {_zygosity(copies)} — {v.effect}"
        findings.append({
            "gene": v.gene, "rsid": v.rsid, "condition": v.condition,
            "category": v.category, "genotype": geno, "copies": copies,
            "interpretation": interp, "risk_level": risk, "relevant": relevant,
        })

    # Relevant + carried first; then relevant; then the rest.
    order = {"higher": 0, "protective": 1, "typical": 2, "info": 3}
    findings.sort(key=lambda f: (not f["relevant"], order.get(f["risk_level"], 3)))

    carried = [f for f in findings if f["risk_level"] in ("higher", "protective")]
    relevant_hits = [f for f in carried if f["relevant"]]
    return {
        "findings": findings,
        "n_panel": len(PANEL) + 1,     # +1 for APOE
        "n_found": n_found,
        "n_carried": len(carried),
        "summary": (
            f"{len(relevant_hits)} variant(s) relevant to {dept or 'this therapy'} carried; "
            f"{len(carried)} notable of {n_found} panel variants found in the file."
        ),
        "disclaimer": "Illustrative pharmacogenomic / risk read-out from a curated panel of "
        "known variants — not a clinical genetic test, not medical advice. Same-person "
        "genome + methylation assumed.",
    }
