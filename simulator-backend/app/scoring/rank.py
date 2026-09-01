"""Multi-objective ranking + novelty (D5).

Scores each candidate, de-duplicates (uniqueness), flags novelty against an
optional reference set, and ranks by a simple composite of validity +
drug-likeness. Kept transparent so the ranking is explainable.
"""
from __future__ import annotations

from ..design.base import Candidate
from .rdkit_scores import rdkit_available, score_smiles


def _logp_fit(logp: float, mode: str, target: float | None) -> float:
    """0..1 score for how well a molecule's logP meets a deliverability aim."""
    if mode == "min":                      # more soluble → lower logP better
        return max(0.0, min(1.0, (6.0 - logp) / 8.0))
    if mode == "max":                      # more lipophilic → higher logP better
        return max(0.0, min(1.0, (logp + 2.0) / 8.0))
    # target (e.g. CNS-penetrant logP ≈ 2.5): peak at target, fall off over ±4
    t = 2.5 if target is None else target
    return max(0.0, 1.0 - abs(logp - t) / 4.0)


def _composite(scores: dict, objective: dict | None = None) -> float:
    """0..1 ranking score. Invalid → 0. QED by default, or a logP-fit blend
    (kept with a QED tiebreaker so we don't rank chemically nonsensical hits)."""
    if scores.get("valid") is False:
        return 0.0
    if not scores.get("rdkit"):
        return 0.5  # unknown validity (no RDKit) — neutral
    qed = scores.get("qed", 0.0)
    if objective and objective.get("property") == "logp" and scores.get("logp") is not None:
        fit = _logp_fit(scores["logp"], objective.get("mode", "target"), objective.get("target_value"))
        return round(min(1.0, 0.75 * fit + 0.25 * qed), 3)
    bonus = 0.1 if scores.get("lipinski_pass") else 0.0
    return min(1.0, qed + bonus)


def rank_candidates(
    candidates: list[Candidate],
    reference: set[str] | None = None,
    objective: dict | None = None,
) -> dict:
    reference = reference or set()
    seen: set[str] = set()
    scored: list[Candidate] = []
    n_valid = 0

    for c in candidates:
        if c.modality == "smiles":
            s = score_smiles(c.seq)
            key = s.get("canonical", c.seq)
        else:
            s = {"rdkit": False, "valid": None}
            key = c.seq
        if key in seen:                      # uniqueness
            continue
        seen.add(key)
        s["novel"] = key not in reference    # novelty vs reference corpus
        s["rank_score"] = round(_composite(s, objective), 3)
        c.scores = s
        if s.get("valid"):
            n_valid += 1
        scored.append(c)

    scored.sort(key=lambda c: c.scores.get("rank_score", 0.0), reverse=True)

    n = len(candidates)
    return {
        "rdkit": rdkit_available(),
        "n_generated": n,
        "n_unique": len(scored),
        "n_valid": n_valid,
        "validity": round(n_valid / n, 3) if n else 0.0,
        "uniqueness": round(len(scored) / n, 3) if n else 0.0,
        "candidates": [c.public() for c in scored],
    }
