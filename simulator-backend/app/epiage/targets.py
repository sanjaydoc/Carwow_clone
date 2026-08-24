"""Target discovery (D3).

From the clock's per-site contributions we surface the CpG sites that push the
person's biological age up the most — the loci a rejuvenation strategy would aim
to re-tune. Each target is annotated with its gene and the *youthful direction*
(demethylate vs methylate), which becomes the objective handed to Track A/B.

This is derived directly from the real data + published coefficients — no
invented values. The molecule/vector produced downstream remains illustrative.
"""
from __future__ import annotations

from dataclasses import dataclass

from .clocks import ClockResult, HorvathClock

# Reprogramming factors (OSK) — flagged when a target maps near them.
OSK_GENES = {"POU5F1": "OCT4", "SOX2": "SOX2", "KLF4": "KLF4"}


@dataclass
class TargetSite:
    cpg: str
    gene: str | None
    chrom: str | None
    coef: float
    beta: float
    contribution: float           # coef * beta (signed)
    direction: str                # "demethylate" | "methylate"
    magnitude: float              # |contribution|, ranking key
    note: str

    def public(self) -> dict:
        return {
            "cpg": self.cpg,
            "gene": self.gene,
            "chrom": self.chrom,
            "coef": round(self.coef, 5),
            "beta": round(self.beta, 4),
            "contribution": round(self.contribution, 5),
            "direction": self.direction,
            "note": self.note,
        }


def discover_targets(
    result: ClockResult,
    clock: HorvathClock,
    betas: dict[str, float],
    top_n: int = 20,
) -> list[TargetSite]:
    targets: list[TargetSite] = []
    for cpg, contribution in result.contributions.items():
        site = clock.by_cpg.get(cpg)
        if site is None:
            continue
        beta = betas.get(cpg, 0.0)
        # Youthful direction = the change that LOWERS predicted age.
        #   coef > 0: higher methylation → older  → demethylate to rejuvenate
        #   coef < 0: higher methylation → younger → methylate to rejuvenate
        direction = "demethylate" if site.coef > 0 else "methylate"
        state = "hypermethylated" if beta >= 0.5 else "hypomethylated"
        gene = site.gene
        osk = f" · reprogramming factor ({OSK_GENES[gene]})" if gene in OSK_GENES else ""
        note = f"{state}; {direction} toward youthful state{osk}"
        targets.append(
            TargetSite(
                cpg=cpg,
                gene=gene,
                chrom=site.chrom,
                coef=site.coef,
                beta=beta,
                contribution=contribution,
                direction=direction,
                magnitude=abs(contribution),
                note=note,
            )
        )
    targets.sort(key=lambda t: t.magnitude, reverse=True)
    return targets[:top_n]


def design_objectives(targets: list[TargetSite]) -> list[dict]:
    """Compact objective list handed to Track A (construct) / Track B (molecules)."""
    return [
        {
            "cpg": t.cpg,
            "gene": t.gene,
            "action": t.direction,          # what a rejuvenation agent should do here
            "priority": round(t.magnitude, 5),
        }
        for t in targets
    ]
