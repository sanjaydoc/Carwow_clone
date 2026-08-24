"""REST routes (D1) exposing the real pipeline.

Current endpoints (more land with Track A/B):
  POST /api/analyze   — upload methylation (+ optional genotype) → epigenetic age + targets
  POST /api/samples   — list sample columns of a methylation matrix (for the picker)
"""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, File, Form, UploadFile

from ..config import get_settings
from ..epiage import discover_targets, load_horvath
from ..epiage.targets import design_objectives
from ..ingest import load_genotype, load_methylation
from ..ingest.methylation import list_samples

router = APIRouter()
settings = get_settings()

# Load the real clock once at startup.
_clock = load_horvath()


def _save_upload(upload: UploadFile, subdir: str) -> Path:
    dest_dir = settings.work_dir / subdir
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / (upload.filename or "upload.dat")
    with open(dest, "wb") as fh:
        fh.write(upload.file.read())
    return dest


@router.post("/samples")
async def samples(methylation: UploadFile = File(...)) -> dict:
    path = _save_upload(methylation, "uploads")
    return {"samples": list_samples(path)}


@router.post("/analyze")
async def analyze(
    methylation: UploadFile = File(...),
    genotype: UploadFile | None = File(None),
    sample: str | None = Form(None),
    chronological_age: float | None = Form(None),
    top_targets: int = Form(20),
) -> dict:
    """Compute the REAL epigenetic age + target CpGs (no data leaves the machine)."""
    meth_path = _save_upload(methylation, "uploads")
    meth = load_methylation(meth_path, sample=sample)
    result = _clock.predict(meth.betas, chronological_age=chronological_age)
    targets = discover_targets(result, _clock, meth.betas, top_n=top_targets)

    out: dict = {
        "epigenetic_age": result.public(),
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
