"""Design engine interface (D4)."""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class DesignRequest:
    modality: str = "smiles"            # smiles | protein | dna (De-Novo-LLM modalities)
    n: int = 50                         # how many candidates
    # Optional property conditioning (De-Novo-LLM `condition`): e.g. qed/logp.
    property: str | None = None
    mode: str = "max"                   # max | min | target
    target_value: float | None = None
    model: str | None = None            # HF model id or local checkpoint dir
    config: str | None = None           # config yaml (defaults per modality)
    # Context carried from D3 (annotation only — candidates are not claimed to
    # bind a specific CpG).
    objectives: list[dict] = field(default_factory=list)


@dataclass
class Candidate:
    seq: str                            # SMILES / sequence
    modality: str
    scores: dict = field(default_factory=dict)   # filled by D5 (validity, QED, …)
    source: str = "De-Novo-LLM"

    def public(self) -> dict:
        return {"seq": self.seq, "modality": self.modality, "scores": self.scores, "source": self.source}


class DesignEngine:
    """Base class for a generation engine."""

    name = "engine"

    def available(self) -> tuple[bool, str]:
        """Return (is_runnable, reason)."""
        raise NotImplementedError

    def generate(self, req: DesignRequest, progress=None) -> list[Candidate]:
        raise NotImplementedError
