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
from ..config import get_settings
from ..construct import assemble_osk_teton, design_exosome_delivery
from ..construct.parts import CAPSIDS
from ..design import DesignRequest, get_engine
from ..epiage import discover_targets, load_horvath
from ..epiage.targets import design_objectives
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


def _project_rejuvenation(dnam_age: float, coverage: float, tissue_key: str | None = None) -> dict:
    """Projected reprogramming outcome from an illustrative partial-reprogramming model.

    Reversal = a tissue-tuned fraction of the epigenetic age accumulated above a
    young-adult setpoint; the tissue-rejuvenation index scales that potential by
    data confidence (CpG coverage). This is a PROJECTION for planning, not a
    measured result — a real reversal requires an after-treatment methylation sample.
    """
    eff = TISSUE_EFFICIENCY.get((tissue_key or "").lower(), REPROG_EFFICIENCY)
    gap = max(0.0, dnam_age - YOUTH_SETPOINT)
    years_reversed = round(eff * gap, 1)
    return {
        "years_reversed": years_reversed,
        "projected_age": round(dnam_age - years_reversed, 1),
        "tissue_rejuvenation_index": round(eff * 100 * coverage),
        "youth_setpoint": YOUTH_SETPOINT,
        "efficiency": round(eff, 2),
        "tissue_key": tissue_key or "generic",
        "basis": "Projected from an illustrative partial-reprogramming model "
        f"({int(eff * 100)}% of epigenetic age above a {int(YOUTH_SETPOINT)}-yr setpoint, "
        "tuned to the target tissue), scaled by CpG coverage — not a measured outcome. "
        "Confirm with a post-treatment sample.",
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
        "rejuvenation": _project_rejuvenation(result.dnam_age, result.coverage, tissue_key),
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


@router.get("/dataset/samples")
async def dataset_samples(label: str) -> dict:
    """List samples of an already-downloaded curated dataset."""
    path = _dataset_path(label)
    if not path.is_file():
        raise HTTPException(404, f"dataset '{label}' not downloaded yet")
    return {"label": label.lower(), "samples": list_samples(path)}


@router.post("/construct")
async def construct(spec: dict = Body(default={})) -> dict:
    """Track A: assemble the ER-100 OSK Tet-On payload and design its carrier.

    carrier='aav'     → AAV vector(s), split across two AAVs if over the packaging
                        limit (capsid from the disease preset).
    carrier='exosome' → IV exosome delivery spec — OSK rides as tri-cistronic mRNA
                        (no AAV size ceiling), tissue-targeted by a homing ligand.
    """
    carrier = spec.get("carrier", "aav")
    result = assemble_osk_teton(
        constitutive_promoter=spec.get("constitutive_promoter", "efs"),
        polya=spec.get("polya", "min_polya"),
        include_wpre=spec.get("include_wpre", True),
        capsid=spec.get("capsid", "aav9"),
        objectives=spec.get("objectives", []),
    )
    out = result.public()
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
        ranked = rank_candidates(candidates)
        ranked["modality"] = req.modality
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
