"""REST routes exposing the real pipeline.

Endpoints:
  GET  /api/catalog            — disease dropdown: 58 therapies + ER-100 presets + dataset-ready flags
  POST /api/dataset/download   — download+prep a curated GEO methylation dataset (async job)
  GET  /api/dataset/samples    — list samples of an already-downloaded curated dataset
  POST /api/samples            — list sample columns (upload or curated dataset)
  POST /api/analyze            — epigenetic age + targets (upload or curated dataset)
  POST /api/construct          — Track A: assemble the OSK Tet-On vector
  GET  /api/engines            — Track B engine availability
  POST /api/design             — Track B: generate novel molecules (async job)
  GET  /api/jobs/{id}[/stream] — job status / SSE progress
  POST /api/report/{csv,pdf}   — export
  POST /api/interpret          — plain-language summary
"""
from __future__ import annotations

import asyncio
import json
from pathlib import Path

from fastapi import APIRouter, Body, File, Form, HTTPException, UploadFile
from fastapi.responses import Response, StreamingResponse

from ..catalog import (
    dataset_for_disease,
    disease_by_key,
    disease_catalog,
    download_and_prep,
)
from ..catalog.geo import extract_all_samples
from ..config import get_settings
from ..construct import (
    assemble_dux4_silencing,
    assemble_microdystrophin,
    assemble_osk_teton,
    design_exosome_delivery,
)
from ..construct.parts import CAPSIDS
from ..design import DesignRequest, get_engine
from ..epiage import discover_targets, load_horvath
from ..epiage.targets import design_objectives
from ..genome import personalize as personalize_genome
from ..ingest import load_genotype, load_methylation
from ..ingest.methylation import list_samples
from ..jobs import manager
from ..report import build_pdf, candidates_csv, interpret_results
from ..scoring import rank_candidates

router = APIRouter()
settings = get_settings()

# On-device data folder (curated downloads + prepped sample slices).
DATA_DIR = Path(__file__).resolve().parents[2] / "data"
SAMPLES_DIR = DATA_DIR / "samples"
DOWNLOADS_DIR = DATA_DIR / "downloads"

# Load the real clock once at startup.
_clock = load_horvath()


def _safe_label(label: str) -> str:
    return "".join(c for c in label if c.isalnum() or c in "-_").lower()


def _dataset_path(label: str) -> Path:
    """Server-side prepped methylation file for a curated dataset label."""
    return SAMPLES_DIR / f"methylation_{_safe_label(label)}.csv"


# Partial-reprogramming projection (illustrative model, not a measurement).
YOUTH_SETPOINT = 20.0        # young-adult epigenetic reference (Horvath adult-age anchor)
REPROG_EFFICIENCY = 0.35     # default fraction of epigenetic age (above setpoint) reversible

# Per-tissue reprogramming responsiveness (illustrative). Tissues that reprogram
# strongly in the literature (retina/CNS/skin/liver) score higher; post-mitotic
# or stiff tissues (heart, cartilage) lower. Every therapy therefore gets a
# tailored projection based on its target tissue.
TISSUE_EFFICIENCY = {
    "retina": 0.45, "cns": 0.42, "skin": 0.44, "liver": 0.40, "gut": 0.38,
    "kidney": 0.36, "systemic": 0.35, "pancreas": 0.35, "lung": 0.34,
    "immune": 0.33, "bone": 0.33, "heart": 0.32, "joint": 0.30,
}


def _project_rejuvenation(dnam_age: float, coverage: float, tissue_key: str | None = None,
                          cycles: int = 1) -> dict:
    """Projected reprogramming outcome from an illustrative partial-reprogramming model.

    Each cycle reverses a tissue-tuned FRACTION of the epigenetic age still ABOVE a
    young-adult setpoint (~20). Because the gap shrinks every cycle, reversal
    compounds with DIMINISHING RETURNS and asymptotes toward the setpoint — it can
    never go below it. Cumulative reversal after n cycles is
        gap · (1 − (1 − eff)^n),
    NOT n × single-cycle (linear stacking would drive the age below zero, which is
    biologically impossible). A PROJECTION for planning, not a measured result.
    """
    eff = TISSUE_EFFICIENCY.get((tissue_key or "").lower(), REPROG_EFFICIENCY)
    cycles = max(1, min(int(cycles or 1), 10))
    gap = max(0.0, dnam_age - YOUTH_SETPOINT)

    per_cycle: list[dict] = []
    age = dnam_age
    for i in range(1, cycles + 1):
        step = eff * max(0.0, age - YOUTH_SETPOINT)
        age -= step
        per_cycle.append({"cycle": i, "reversed": round(dnam_age - age, 1),
                          "projected_age": round(age, 1)})
    total_reversed = round(dnam_age - age, 1)
    single = round(eff * gap, 1)
    return {
        "cycles": cycles,
        "years_reversed": total_reversed,           # cumulative over all cycles
        "years_reversed_per_first_cycle": single,   # a single cycle, for reference
        "projected_age": round(age, 1),
        "per_cycle": per_cycle,
        "floor_age": YOUTH_SETPOINT,                 # can never go below this
        "tissue_rejuvenation_index": round(eff * 100 * coverage),
        "youth_setpoint": YOUTH_SETPOINT,
        "efficiency": round(eff, 2),
        "tissue_key": tissue_key or "generic",
        "basis": "Projected from an illustrative partial-reprogramming model "
        f"({int(eff * 100)}% of the epigenetic age above a {int(YOUTH_SETPOINT)}-yr setpoint "
        "reversed per cycle, tuned to the target tissue), scaled by CpG coverage — not a "
        "measured outcome. Cycles compound with diminishing returns toward the setpoint "
        "(never below it). Confirm with a post-treatment sample.",
    }


def _dataset_age(label: str, sample: str | None) -> float | None:
    """Look up a sample's chronological age from the prepped ages_<label>.csv."""
    import csv as _csv

    path = SAMPLES_DIR / f"ages_{_safe_label(label)}.csv"
    if not path.is_file():
        return None
    try:
        with open(path, encoding="utf-8") as fh:
            rows = list(_csv.DictReader(fh))
    except Exception:
        return None
    if not rows:
        return None
    row = None
    if sample:
        row = next((r for r in rows if r.get("sample") == sample), None)
    row = row or rows[0]
    val = (row.get("age") or "").strip()
    try:
        return float(val) if val else None
    except ValueError:
        return None


def _save_upload(upload: UploadFile, subdir: str) -> Path:
    dest_dir = settings.work_dir / subdir
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / (upload.filename or "upload.dat")
    # Stream in chunks so large methylation files don't load fully into RAM.
    import shutil

    with open(dest, "wb") as fh:
        shutil.copyfileobj(upload.file, fh, length=1024 * 1024)
    return dest


@router.post("/samples")
async def samples(
    methylation: UploadFile | None = File(None),
    dataset: str | None = Form(None),
) -> dict:
    """List sample columns — from an upload, or a server-side curated dataset."""
    if dataset:
        path = _dataset_path(dataset)
        if not path.is_file():
            raise HTTPException(404, f"dataset '{dataset}' not downloaded yet")
    elif methylation is not None:
        path = _save_upload(methylation, "uploads")
    else:
        raise HTTPException(400, "provide a methylation file or a dataset label")
    return {"samples": list_samples(path)}


@router.post("/analyze")
async def analyze(
    methylation: UploadFile | None = File(None),
    genotype: UploadFile | None = File(None),
    dataset: str | None = Form(None),
    sample: str | None = Form(None),
    chronological_age: float | None = Form(None),
    tissue_key: str | None = Form(None),
    department: str | None = Form(None),
    cycles: int = Form(1),
    top_targets: int = Form(20),
) -> dict:
    """Compute the REAL epigenetic age + target CpGs (no data leaves the machine).

    Input is either an uploaded methylation file OR a curated `dataset` label
    (already downloaded/prepped server-side via /dataset/download)."""
    if dataset:
        meth_path = _dataset_path(dataset)
        if not meth_path.is_file():
            raise HTTPException(404, f"dataset '{dataset}' not downloaded yet")
    elif methylation is not None:
        meth_path = _save_upload(methylation, "uploads")
    else:
        raise HTTPException(400, "provide a methylation file or a dataset label")
    meth = load_methylation(meth_path, sample=sample)
    # For a curated dataset, auto-fill the age from its prepped ages file when the
    # user leaves the box blank (so age-acceleration appears without a lookup).
    if chronological_age is None and dataset:
        chronological_age = _dataset_age(dataset, meth.sample)
    result = _clock.predict(meth.betas, chronological_age=chronological_age)
    targets = discover_targets(result, _clock, meth.betas, top_n=top_targets)

    out: dict = {
        "epigenetic_age": result.public(),
        "rejuvenation": _project_rejuvenation(result.dnam_age, result.coverage, tissue_key, cycles),
        "methylation": {"sample": meth.sample, "n_sites": meth.n_sites},
        "targets": [t.public() for t in targets],
        "objectives": design_objectives(targets),
        "disclaimer": "Epigenetic age is computed from your data with the published "
        "Horvath (2013) clock. Any therapy/molecule suggested downstream is an "
        "illustrative research hypothesis — not medical advice.",
    }

    if genotype is not None:
        geno_path = _save_upload(genotype, "uploads")
        geno = load_genotype(geno_path)
        out["genotype"] = {
            "source": geno.source,
            "build": geno.build,
            "n_variants": geno.n_variants,
            "personalization": personalize_genome(geno, department),
        }
    return out


# ---- Disease catalogue + curated datasets (S1/S3/S5) ---------------------
@router.get("/catalog")
async def catalog() -> dict:
    """Disease dropdown data: every therapy with its ER-100 tissue/capsid preset
    and whether a curated methylation dataset is one-click ready."""
    data = disease_catalog()
    data["capsids"] = CAPSIDS
    # Mark which curated datasets are already downloaded on this machine.
    for item in data["diseases"]:
        ds = item.get("dataset")
        if ds:
            label = ds["accession"].lower()
            ds["downloaded"] = _dataset_path(label).is_file()
            ds["label"] = label
    return data


@router.post("/dataset/download")
async def dataset_download(spec: dict = Body(default={})) -> dict:
    """Download + prep a curated methylation dataset for a disease (async job).

    Runs entirely on this machine (public GEO FTP only). Stream progress at
    /api/jobs/{id}/stream; the final result carries the sample list + ages."""
    disease_key = spec.get("disease")
    n = int(spec.get("samples", 8))
    ds = dataset_for_disease(disease_key) if disease_key else None
    if not ds:
        raise HTTPException(404, "no curated dataset for that disease — upload your own file")
    label = ds["accession"].lower()

    async def body(job) -> dict:
        result = await asyncio.to_thread(
            download_and_prep, ds, SAMPLES_DIR, DOWNLOADS_DIR, label, n, job.emit
        )
        result["label"] = label
        result["disclaimer"] = (
            "Public research dataset from NCBI GEO, used illustratively. Samples "
            "are not identified individuals and carry no clinical claim."
        )
        return result

    job = manager.start("download", body)
    return {"job_id": job.id, "accession": ds["accession"], "label": label}


# ---- Batch: case vs control across all samples (S4) ----------------------
_CONTROL_TOKENS = ("control", "ctrl", "ctl", "healthy", "normal", "hc ", " hc", "non-", "unaffected")


def _norm_condition(cond: str, name: str) -> str:
    """Collapse a raw condition/sample-name into 'control' or 'case'."""
    s = f"{cond} {name}".lower()
    return "control" if any(tok in s for tok in _CONTROL_TOKENS) else "case"


def _mean(xs: list[float]) -> float:
    return sum(xs) / len(xs) if xs else 0.0


def _var(xs: list[float]) -> float:
    if len(xs) < 2:
        return 0.0
    m = _mean(xs)
    return sum((x - m) ** 2 for x in xs) / (len(xs) - 1)


def _betacf(a: float, b: float, x: float) -> float:
    import math
    MAXIT, EPS, FPMIN = 200, 3e-12, 1e-300
    qab, qap, qam = a + b, a + 1.0, a - 1.0
    c = 1.0
    d = 1.0 - qab * x / qap
    if abs(d) < FPMIN:
        d = FPMIN
    d = 1.0 / d
    h = d
    for m in range(1, MAXIT + 1):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1.0 + aa * d
        if abs(d) < FPMIN:
            d = FPMIN
        c = 1.0 + aa / c
        if abs(c) < FPMIN:
            c = FPMIN
        d = 1.0 / d
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1.0 + aa * d
        if abs(d) < FPMIN:
            d = FPMIN
        c = 1.0 + aa / c
        if abs(c) < FPMIN:
            c = FPMIN
        d = 1.0 / d
        de = d * c
        h *= de
        if abs(de - 1.0) < EPS:
            break
    return h


def _betai(a: float, b: float, x: float) -> float:
    import math
    if x <= 0.0:
        return 0.0
    if x >= 1.0:
        return 1.0
    bt = math.exp(math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b)
                  + a * math.log(x) + b * math.log(1.0 - x))
    if x < (a + 1.0) / (a + b + 2.0):
        return bt * _betacf(a, b, x) / a
    return 1.0 - bt * _betacf(b, a, 1.0 - x) / b


def _welch_ttest(a: list[float], b: list[float]) -> dict:
    """Welch's two-sample t-test with a real two-sided p-value (no scipy)."""
    na, nb = len(a), len(b)
    if na < 2 or nb < 2:
        return {"t": None, "df": None, "p_value": None}
    va, vb = _var(a), _var(b)
    se2 = va / na + vb / nb
    if se2 <= 0:
        return {"t": None, "df": None, "p_value": None}
    t = (_mean(a) - _mean(b)) / (se2 ** 0.5)
    df = se2 ** 2 / ((va / na) ** 2 / (na - 1) + (vb / nb) ** 2 / (nb - 1))
    p = _betai(df / 2.0, 0.5, df / (df + t * t))
    return {"t": round(t, 3), "df": round(df, 1), "p_value": p}


@router.post("/batch")
async def batch(spec: dict = Body(default={})) -> dict:
    """Score EVERY sample of a curated dataset and compare case vs control.

    Runs as a background job (streams progress). Uses the cached raw download —
    no re-download. Groups samples by condition (metadata, else sample-name), and
    reports each group's mean DNAm age + a Welch t-test on the gap.
    """
    disease_key = spec.get("disease")
    ds = dataset_for_disease(disease_key) if disease_key else None
    if not ds:
        raise HTTPException(404, "no curated dataset for that disease")
    cap = int(spec.get("cap", 400))
    clock_cpgs = set(_clock.by_cpg.keys())

    async def body(job) -> dict:
        data = await asyncio.to_thread(
            extract_all_samples, ds, DOWNLOADS_DIR, clock_cpgs, job.emit, cap
        )
        samples = data["samples"]
        job.emit(f"scoring {len(samples)} samples with the clock…", progress=0.6)
        rows = []
        for nm in samples:
            betas = data["betas"].get(nm, {})
            if len(betas) < 50:  # too few clock CpGs → skip
                continue
            res = _clock.predict(betas)
            age_raw = (data["ages"].get(nm) or "").strip()
            try:
                chrono = float(age_raw) if age_raw else None
            except ValueError:
                chrono = None
            rows.append({
                "sample": nm,
                "dnam_age": round(res.dnam_age, 2),
                "chronological_age": chrono,
                "coverage": round(res.coverage, 3),
                "group": _norm_condition(data["conditions"].get(nm, ""), nm),
                "condition_raw": data["conditions"].get(nm, ""),
            })

        cases = [r["dnam_age"] for r in rows if r["group"] == "case"]
        ctrls = [r["dnam_age"] for r in rows if r["group"] == "control"]
        groups = []
        for label, xs in (("case", cases), ("control", ctrls)):
            if xs:
                groups.append({"label": label, "n": len(xs),
                               "mean_dnam_age": round(_mean(xs), 2),
                               "sd": round(_var(xs) ** 0.5, 2)})
        stats = _welch_ttest(cases, ctrls) if cases and ctrls else {"t": None, "df": None, "p_value": None}
        gap = round(_mean(cases) - _mean(ctrls), 2) if cases and ctrls else None
        job.emit("done", progress=1.0)
        return {
            "accession": ds["accession"],
            "n_scored": len(rows),
            "groups": groups,
            "gap_dnam_age": gap,
            "welch": ({**stats, "p_value": (round(stats["p_value"], 5) if stats.get("p_value") is not None else None)}),
            "samples": sorted(rows, key=lambda r: r["dnam_age"], reverse=True),
            "note": "Groups inferred from condition metadata (or sample name). Case−control "
            "gap in mean DNAm age; Welch two-sided p. Illustrative research analysis.",
        }

    job = manager.start("batch", body)
    return {"job_id": job.id, "accession": ds["accession"]}


@router.get("/dataset/samples")
async def dataset_samples(label: str) -> dict:
    """List samples of an already-downloaded curated dataset."""
    path = _dataset_path(label)
    if not path.is_file():
        raise HTTPException(404, f"dataset '{label}' not downloaded yet")
    return {"label": label.lower(), "samples": list_samples(path)}


@router.get("/converted/list")
async def converted_list() -> dict:
    """List the user's own converted/uploaded methylation files on this machine, so
    the UI can offer them as one-click datasets (survives page reloads).

    Excludes the curated GEO downloads (label starts with 'gse') and the built-in
    fixture ('example'); everything else in data/samples is a user file."""
    items: list[dict] = []
    if SAMPLES_DIR.is_dir():
        for p in sorted(SAMPLES_DIR.glob("methylation_*.csv")):
            label = p.stem[len("methylation_"):]
            if not label or label.startswith("gse") or label == "example":
                continue
            try:
                samples = list_samples(p)
            except Exception:
                samples = []
            items.append({
                "label": label,
                "file": p.name,
                "samples": samples,
                "modified": int(p.stat().st_mtime),
            })
    items.sort(key=lambda it: it["modified"], reverse=True)  # newest first
    return {"converted": items}


@router.post("/convert/wgbs")
async def convert_wgbs(
    wgbs: UploadFile = File(...),
    manifest: UploadFile | None = File(None),
    build: str = Form("hg38"),
    label: str = Form("wgbs"),
) -> dict:
    """Convert a WGBS/RRBS bisulfite file to a clock-ready beta CSV (UI-driven).

    Writes data/samples/methylation_<label>.csv — the same server-side dataset the
    existing /analyze reads via its `dataset` param. Additive; touches nothing else.
    """
    from ..ingest.wgbs import wgbs_to_beta

    src = _save_upload(wgbs, "uploads")
    man = _save_upload(manifest, "uploads") if manifest is not None else None
    safe = _safe_label(label) or "wgbs"
    out = SAMPLES_DIR / f"methylation_{safe}.csv"
    try:
        res = await asyncio.to_thread(
            wgbs_to_beta, src, out, sample=safe, build=build, manifest=man
        )
    except Exception as exc:  # bad build/manifest/format → clear message
        raise HTTPException(400, str(exc))
    res["label"] = safe
    res["samples"] = list_samples(out)
    res["note"] = (
        "Converted by genomic coordinate onto the 353 Horvath CpGs. Low coverage "
        "usually means the --build/manifest doesn't match the WGBS alignment."
    )
    return res


@router.post("/construct")
async def construct(spec: dict = Body(default={})) -> dict:
    """Track A: assemble the disease-appropriate delivery construct.

    construct_type='gene_replacement' (e.g. muscular dystrophy) → a micro-dystrophin
        AAV gene-replacement vector (payload + muscle-restricted driver), NOT OSK.
    construct_type='reprogramming' (default) → the ER-100 OSK Tet-On construct.
    carrier='aav' → AAV vector(s); carrier='exosome' → IV exosome mRNA spec.
    """
    ctype = spec.get("construct_type")
    if ctype in ("gene_replacement", "epigenetic_silencing"):
        assemble = (assemble_microdystrophin if ctype == "gene_replacement"
                    else assemble_dux4_silencing)
        out = assemble(
            capsid=spec.get("capsid", "aavrh74"),
            tissue_key=spec.get("tissue_key", "muscle"),
            objectives=spec.get("objectives", []),
        )
        out["carrier"] = "aav"
        return out

    carrier = spec.get("carrier", "aav")
    result = assemble_osk_teton(
        constitutive_promoter=spec.get("constitutive_promoter", "efs"),
        polya=spec.get("polya", "min_polya"),
        include_wpre=spec.get("include_wpre", True),
        capsid=spec.get("capsid", "aav9"),
        tissue_key=spec.get("tissue_key"),
        objectives=spec.get("objectives", []),
    )
    out = result.public()
    out["construct_type"] = "reprogramming"
    out["carrier"] = carrier
    if carrier == "exosome":
        out["exosome"] = design_exosome_delivery(
            payload="osk",
            tissue_key=spec.get("tissue_key", "systemic"),
            tissue_label=spec.get("tissue_label", ""),
        )
    return out


@router.post("/deliver/exosome")
async def deliver_exosome(spec: dict = Body(default={})) -> dict:
    """Design an IV exosome carrier for a novel small molecule (Track B carrier)."""
    return design_exosome_delivery(
        payload="molecule",
        tissue_key=spec.get("tissue_key", "systemic"),
        tissue_label=spec.get("tissue_label", ""),
        molecule_smiles=spec.get("smiles"),
    )


# --- Step 6: Safety Implant Blob (patient-derived xenograft "avatar" pre-screen) ---
# Illustrative per-cycle adverse-event probability by modality. Reprogramming
# carries the real over-induction/tumorigenicity concern (worse with more cycles);
# gene delivery is dominated by AAV immune / off-target risk.
_SAFETY_PER_CYCLE_RISK = {
    "reprogramming": 0.07,       # OSK over-induction → loss of identity / teratoma
    "gene_replacement": 0.03,    # AAV immune response / off-target expression
    "epigenetic_silencing": 0.03,
}
_HOST_LABEL = {
    "mouse": "immunodeficient / transgenic mouse (NSG-style)",
    "guinea_pig": "transgenic guinea pig",
}
# What a tissue-graft avatar CAN vs CANNOT see — the honest boundary of the model.
_AVATAR_DETECTS = [
    "Tumorigenicity / teratoma at the graft (the key reprogramming danger)",
    "Loss of cell identity / de-differentiation in the patient's own cells",
    "Off-target or run-away transgene expression in the graft",
    "Local efficacy — re-methylate the graft and re-run the clock to confirm reversal",
]
_AVATAR_MISSES = [
    "The patient's whole-body immune response to the vector/cells",
    "Systemic pharmacokinetics & biodistribution beyond the graft",
    "Delayed effects beyond the observation window",
    "Tissues that engraft poorly or don't represent the patient well",
]


@router.post("/safety")
async def safety_prescreen(spec: dict = Body(default={})) -> dict:
    """Safety Implant Blob — model an autologous xenograft 'avatar' pre-screen.

    Engraft the patient's own biopsy into a transgenic host, run the SAME therapy
    for up to 2 cycles, read out safety + local efficacy, and only then treat the
    patient. Returns an ILLUSTRATIVE risk model: the pre-screen catches a tunable
    fraction of the failure modes it can see, lowering (not eliminating) patient
    risk. Not a validated preclinical protocol.
    """
    ctype = spec.get("construct_type") or "reprogramming"
    cycles = max(1, min(int(spec.get("cycles") or 1), 10))
    tissue_key = spec.get("tissue_key") or "systemic"
    host = spec.get("host", "mouse")
    # Sensitivity is user-set but CAPPED below 1.0 — an avatar can't catch everything.
    try:
        sensitivity = float(spec.get("sensitivity", 0.9))
    except (TypeError, ValueError):
        sensitivity = 0.9
    sensitivity = min(max(sensitivity, 0.0), 0.95)

    r = _SAFETY_PER_CYCLE_RISK.get(ctype, 0.05)
    pre_risk = 1 - (1 - r) ** cycles          # patient risk WITHOUT the pre-screen
    residual = pre_risk * (1 - sensitivity)   # risk that slips past the avatar
    avatar_cycles = min(cycles, 2)            # the avatar tests up to 2 cycles

    workflow = [
        "Take an autologous biopsy of the patient's target tissue.",
        f"Engraft it into a {_HOST_LABEL.get(host, host)} — a patient-derived xenograft 'avatar'.",
        f"Run the identical construct on the graft for up to {avatar_cycles} cycle(s).",
        "Read out safety (tumorigenicity, loss of identity, off-target) and local efficacy "
        "(re-methylate the graft, re-run the clock).",
        "Adjust dose / cycles / capsid / promoter from the avatar readout — or halt if it flags danger.",
        "Only then proceed to the patient, with avatar-tuned parameters.",
    ]
    return {
        "host": host,
        "avatar_cycles": avatar_cycles,
        "patient_cycles": cycles,
        "sensitivity": round(sensitivity, 2),
        "per_cycle_risk": round(r, 3),
        "risk_without_prescreen": round(pre_risk, 3),
        "residual_risk_with_prescreen": round(residual, 3),
        "risk_reduction": round(pre_risk - residual, 3),
        "projected_success_without": round(100 * (1 - pre_risk), 1),
        "projected_success_with": round(100 * (1 - residual), 1),
        "detects": _AVATAR_DETECTS,
        "misses": _AVATAR_MISSES,
        "workflow": workflow,
        "disclaimer": "Illustrative decision-support, not a validated preclinical protocol or "
        "regulatory pathway. A xenograft avatar lowers but never removes risk — it cannot see "
        "whole-body immune, systemic PK, or delayed effects, and engraftment fidelity varies. "
        "Requires animal-ethics (IACUC) approval. The sensitivity is an assumption you set, not a "
        "measured figure; treat the success numbers as planning estimates, not guarantees.",
    }


@router.get("/engines")
async def engines() -> dict:
    """Track B engine availability (does the De-Novo-LLM repo run here?)."""
    engine = get_engine("denovo-llm")
    ok, reason = engine.available()
    return {"denovo-llm": {"available": ok, "reason": reason}}


@router.post("/design")
async def design(spec: dict = Body(default={})) -> dict:
    """Track B (D4+D5): generate novel candidate molecules for the targets.

    Runs as a background job (generation is slow + GPU-serialized). Returns a
    job id; stream progress at /api/jobs/{id}/stream.
    """
    req = DesignRequest(
        modality=spec.get("modality", "smiles"),
        n=int(spec.get("n", 50)),
        property=spec.get("property"),
        mode=spec.get("mode", "max"),
        target_value=spec.get("target_value"),
        model=spec.get("model"),
        config=spec.get("config"),
        objectives=spec.get("objectives", []),
    )
    engine = get_engine("denovo-llm")

    async def body(job) -> dict:
        # Serialize GPU work (6 GB VRAM: one model at a time).
        async with manager.gpu_lock:
            job.emit("acquiring GPU / launching De-Novo-LLM…", progress=0.1)
            candidates = await asyncio.to_thread(engine.generate, req, job.emit)
        job.emit(f"scoring {len(candidates)} candidates…", progress=0.85)
        objective = (
            {"property": req.property, "mode": req.mode, "target_value": req.target_value}
            if req.property
            else None
        )
        ranked = rank_candidates(candidates, objective=objective)
        ranked["modality"] = req.modality
        if objective:
            ranked["objective"] = objective
        ranked["disclaimer"] = (
            "Candidates are AI-generated research hypotheses — not validated, "
            "synthesizable, or approved therapeutics."
        )
        return ranked

    job = manager.start("design", body)
    return {"job_id": job.id}


@router.get("/jobs/{job_id}")
async def job_status(job_id: str) -> dict:
    job = manager.get(job_id)
    if not job:
        raise HTTPException(404, "job not found")
    return job.public()


@router.get("/jobs/{job_id}/stream")
async def job_stream(job_id: str) -> StreamingResponse:
    job = manager.get(job_id)
    if not job:
        raise HTTPException(404, "job not found")

    async def gen():
        async for event in manager.stream(job):
            yield f"data: {json.dumps(event)}\n\n"
        yield f"data: {json.dumps(job.public())}\n\n"  # final snapshot with result

    return StreamingResponse(gen(), media_type="text/event-stream")


# ---- Reports (D6) --------------------------------------------------------
@router.post("/report/csv")
async def report_csv(payload: dict = Body(default={})) -> Response:
    csv_text = candidates_csv(payload.get("candidates", []))
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=candidates.csv"},
    )


@router.post("/report/pdf")
async def report_pdf(payload: dict = Body(default={})) -> Response:
    pdf = build_pdf(payload)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=simulator-report.pdf"},
    )


@router.post("/interpret")
async def interpret(payload: dict = Body(default={})) -> dict:
    """Optional plain-language write-up via the existing Worker (best-effort)."""
    text = await asyncio.to_thread(interpret_results, payload, payload.get("endpoint")
                                   or "https://stemcells-chat.dr-sanjayanbu.workers.dev",
                                   payload.get("mode", "concise"))
    return {"interpretation": text, "available": text is not None}
