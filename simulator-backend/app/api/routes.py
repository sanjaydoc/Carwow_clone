"""REST routes (D1) exposing the real pipeline.

Current endpoints (more land with Track A/B):
  POST /api/analyze   — upload methylation (+ optional genotype) → epigenetic age + targets
  POST /api/samples   — list sample columns of a methylation matrix (for the picker)
"""
from __future__ import annotations

import asyncio
import json
from pathlib import Path

from fastapi import APIRouter, Body, File, Form, HTTPException, UploadFile
from fastapi.responses import Response, StreamingResponse

from ..config import get_settings
from ..construct import assemble_osk_teton
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


@router.post("/construct")
async def construct(spec: dict = Body(default={})) -> dict:
    """Track A (D9): assemble the OSK Tet-On vector; split across AAVs if needed."""
    result = assemble_osk_teton(
        constitutive_promoter=spec.get("constitutive_promoter", "efs"),
        polya=spec.get("polya", "min_polya"),
        include_wpre=spec.get("include_wpre", True),
        capsid=spec.get("capsid", "aav9"),
        objectives=spec.get("objectives", []),
    )
    return result.public()


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
