"""De-Novo-LLM adapter (D4, Track B).

Shells out to your local De-Novo-LLM repo's `denovo` CLI to generate novel
molecules, then reads the output file. Works out-of-the-box with the pretrained
`entropy/gpt2_zinc_87m` model (no training needed) or your own checkpoint.

Commands used (from the repo's RUN.md):
    denovo generate  -c <cfg> -m <model> -n <N> -o <out.txt>
    denovo condition -c <cfg> -m <model> --property qed --mode max -n <N> -o <out.txt>
"""
from __future__ import annotations

import subprocess
from pathlib import Path

from ..config import get_settings
from .base import Candidate, DesignEngine, DesignRequest

settings = get_settings()

# Default config per modality (shipped in the De-Novo-LLM repo).
_DEFAULT_CONFIG = {
    "smiles": "configs/small_molecule.yaml",
    "protein": "configs/protein.yaml",
    "dna": "configs/nucleic_acid.yaml",
}
_DEFAULT_MODEL = {"smiles": "entropy/gpt2_zinc_87m"}


class DenovoLLMEngine(DesignEngine):
    name = "De-Novo-LLM"

    def __init__(self) -> None:
        self.repo = Path(settings.denovo_llm_dir).expanduser()

    # ---- runnability -----------------------------------------------------
    def _cli(self) -> list[str]:
        """The base command to invoke the denovo CLI."""
        if settings.denovo_python:
            return [settings.denovo_python, "-m", "denovo.cli"]
        # Prefer the repo venv if present, else module form, else PATH script.
        venv_py = self.repo / ".venv" / "bin" / "python"
        if venv_py.exists():
            return [str(venv_py), "-m", "denovo.cli"]
        return ["denovo"]

    def available(self) -> tuple[bool, str]:
        if not self.repo.exists():
            return False, f"De-Novo-LLM repo not found at {self.repo} (set DENOVO_LLM_DIR)."
        try:
            out = subprocess.run(
                self._cli() + ["--help"],
                cwd=str(self.repo),
                capture_output=True,
                text=True,
                timeout=60,
            )
            if out.returncode == 0:
                return True, "ready"
            return False, (out.stderr or out.stdout or "denovo CLI returned non-zero").strip()[:400]
        except FileNotFoundError:
            return False, "denovo CLI not found. Install the repo (pip install -e .) or set DENOVO_PYTHON."
        except subprocess.TimeoutExpired:
            return False, "denovo CLI timed out on --help."

    # ---- generation ------------------------------------------------------
    def generate(self, req: DesignRequest, progress=None) -> list[Candidate]:
        ok, reason = self.available()
        if not ok:
            raise RuntimeError(reason)

        n = min(req.n, settings.max_generate)
        config = req.config or _DEFAULT_CONFIG.get(req.modality, _DEFAULT_CONFIG["smiles"])
        model = req.model or _DEFAULT_MODEL.get(req.modality)
        out_dir = settings.work_dir / "generated"
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / f"cand_{req.modality}_{n}.txt"

        cmd = self._cli()
        if req.property:
            cmd += ["condition", "-c", config, "--property", req.property, "--mode", req.mode]
            if req.mode == "target" and req.target_value is not None:
                cmd += ["--target", str(req.target_value)]
            cmd += ["--oversample", "10"]
        else:
            cmd += ["generate", "-c", config]
        if model:
            cmd += ["-m", model]
        cmd += ["-n", str(n), "-o", str(out_file)]

        if progress:
            progress(f"De-Novo-LLM generating {n} {req.modality} candidates…", progress=0.3)

        proc = subprocess.run(cmd, cwd=str(self.repo), capture_output=True, text=True, timeout=3600)
        if proc.returncode != 0:
            raise RuntimeError((proc.stderr or proc.stdout or "generation failed").strip()[:800])

        if progress:
            progress("reading generated candidates…", progress=0.8)

        candidates: list[Candidate] = []
        if out_file.exists():
            for line in out_file.read_text(encoding="utf-8").splitlines():
                s = line.strip()
                if s and not s.startswith("#"):
                    candidates.append(Candidate(seq=s, modality=req.modality))
        return candidates

    # For tests / previews without torch installed.
    def plan(self, req: DesignRequest) -> dict:
        n = min(req.n, settings.max_generate)
        config = req.config or _DEFAULT_CONFIG.get(req.modality, _DEFAULT_CONFIG["smiles"])
        model = req.model or _DEFAULT_MODEL.get(req.modality)
        cmd = self._cli()
        if req.property:
            cmd += ["condition", "-c", config, "--property", req.property, "--mode", req.mode]
        else:
            cmd += ["generate", "-c", config]
        if model:
            cmd += ["-m", model]
        cmd += ["-n", str(n), "-o", "<out.txt>"]
        return {"cwd": str(self.repo), "command": cmd}
