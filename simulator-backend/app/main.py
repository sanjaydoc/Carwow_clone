"""FastAPI application (D1).

Serves the JSON API and, when a local UI build is present, the Simulator UI
itself — all on http://localhost:8000, so there is no browser mixed-content or
CORS problem and no data leaves the machine.
"""
from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import __version__
from .api.routes import router
from .config import get_settings

settings = get_settings()

app = FastAPI(
    title="StemCells Protocol — Simulator (local)",
    version=__version__,
    description="Local research pipeline: real epigenetic age + target discovery, "
    "OSK Tet-On construct assembly, and De-Novo-LLM molecule generation. "
    "Runs on your laptop; genomic data never leaves the device.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/api/health")
def health() -> dict:
    return {
        "ok": True,
        "version": __version__,
        "mode": settings.mode,
        "denovo_llm_present": settings.denovo_llm_dir.exists(),
    }


# Serve the local Simulator UI build if it has been produced (D7/D8).
# `client` builds into ../client/dist-local. SPA fallback (index.html for any
# non-/api path) so BrowserRouter deep links + refresh work.
_ui = Path(__file__).resolve().parent.parent.parent / "client" / "dist-local"
if _ui.is_dir():
    if (_ui / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=str(_ui / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def spa(full_path: str):  # noqa: ANN001 — /api routes matched earlier
        candidate = _ui / full_path
        if full_path and candidate.is_file():
            return FileResponse(str(candidate))
        return FileResponse(str(_ui / "index.html"))

