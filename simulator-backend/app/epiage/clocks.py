"""Epigenetic clocks (D3) — REAL computation.

Implements Horvath's 2013 pan-tissue clock exactly:

    DNAmAge_raw = intercept + Σ  coef_i * beta_i        (over the 353 clock CpGs)
    age_years   = anti_transform(DNAmAge_raw)

with Horvath's calibration (adult age = 20):

    anti_transform(x) = (1+A)*exp(x) - 1     if x < 0
                        (1+A)*x + A          otherwise      where A = 20

Coefficients are the published values in `coefficients/horvath2013.csv`
(Horvath 2013, Genome Biology, Additional File 3). No values are invented.
"""
from __future__ import annotations

import csv
import math
from dataclasses import dataclass, field
from pathlib import Path

ADULT_AGE = 20.0
_COEF_DIR = Path(__file__).resolve().parent / "coefficients"


@dataclass
class ClockSite:
    cpg: str
    coef: float
    gene: str | None = None
    chrom: str | None = None


@dataclass
class ClockResult:
    clock: str
    dnam_age: float                     # predicted biological age (years)
    raw_score: float                    # linear predictor before anti-transform
    n_used: int                         # clock CpGs found in the sample
    n_total: int                        # clock CpGs in the model
    coverage: float                     # n_used / n_total
    chronological_age: float | None = None
    age_acceleration: float | None = None   # dnam_age − chronological_age
    # Per-site signed contribution to the score (coef * beta), for target work.
    contributions: dict[str, float] = field(default_factory=dict)
    missing: list[str] = field(default_factory=list)

    def public(self) -> dict:
        return {
            "clock": self.clock,
            "dnam_age": round(self.dnam_age, 2),
            "raw_score": round(self.raw_score, 4),
            "n_used": self.n_used,
            "n_total": self.n_total,
            "coverage": round(self.coverage, 3),
            "chronological_age": self.chronological_age,
            "age_acceleration": (
                round(self.age_acceleration, 2) if self.age_acceleration is not None else None
            ),
        }


def _anti_transform(x: float) -> float:
    if x < 0:
        return (1 + ADULT_AGE) * math.exp(x) - 1
    return (1 + ADULT_AGE) * x + ADULT_AGE


class HorvathClock:
    name = "Horvath2013"

    def __init__(self, intercept: float, sites: list[ClockSite]) -> None:
        self.intercept = intercept
        self.sites = sites
        self.by_cpg = {s.cpg: s for s in sites}

    def predict(
        self,
        betas: dict[str, float],
        chronological_age: float | None = None,
    ) -> ClockResult:
        raw = self.intercept
        used = 0
        contributions: dict[str, float] = {}
        missing: list[str] = []
        for site in self.sites:
            beta = betas.get(site.cpg)
            if beta is None:
                missing.append(site.cpg)
                continue
            c = site.coef * beta
            raw += c
            contributions[site.cpg] = c
            used += 1

        age = _anti_transform(raw)
        n_total = len(self.sites)
        result = ClockResult(
            clock=self.name,
            dnam_age=age,
            raw_score=raw,
            n_used=used,
            n_total=n_total,
            coverage=used / n_total if n_total else 0.0,
            chronological_age=chronological_age,
            contributions=contributions,
            missing=missing,
        )
        if chronological_age is not None:
            result.age_acceleration = age - chronological_age
        return result


def load_horvath(path: str | Path | None = None) -> HorvathClock:
    """Load the real Horvath clock from the bundled coefficient CSV."""
    path = Path(path) if path else _COEF_DIR / "horvath2013.csv"
    intercept = 0.0
    sites: list[ClockSite] = []
    with open(path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            marker = (row.get("CpGmarker") or "").strip()
            coef_raw = (row.get("CoefficientTraining") or "").strip()
            if not marker or coef_raw in ("", "NA"):
                continue
            coef = float(coef_raw)
            if marker == "(Intercept)":
                intercept = coef
                continue
            if marker.startswith("cg"):
                sites.append(
                    ClockSite(
                        cpg=marker,
                        coef=coef,
                        gene=(row.get("Symbol") or "").strip() or None,
                        chrom=(row.get("Chr") or "").strip() or None,
                    )
                )
    if not sites:
        raise ValueError(f"No clock CpGs parsed from {path}")
    return HorvathClock(intercept=intercept, sites=sites)
