"""Lock the real epigenetic clock's accuracy against Horvath's example data.

Run: cd simulator-backend && python -m pytest   (or python tests/test_epiage.py)
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.epiage.clocks import load_horvath  # noqa: E402
from app.epiage.targets import discover_targets  # noqa: E402
from app.ingest.methylation import load_methylation  # noqa: E402

FIX = Path(__file__).resolve().parent.parent / "data" / "samples" / "methylation_example.csv"
AGES = {"GSM946048": 60, "GSM946049": 39, "GSM946052": 28}


def test_clock_loads():
    clock = load_horvath()
    assert len(clock.sites) == 353
    assert abs(clock.intercept - 0.695507258) < 1e-6


def test_predictions_are_close_to_real_age():
    clock = load_horvath()
    # Blood/soft-tissue samples track age within a few years; brain runs younger.
    for sample in ("GSM946049", "GSM946052"):
        m = load_methylation(FIX, sample=sample)
        res = clock.predict(m.betas, chronological_age=AGES[sample])
        assert res.coverage == 1.0
        assert abs(res.age_acceleration) < 6, f"{sample}: {res.dnam_age}"


def test_targets_have_genes_and_direction():
    clock = load_horvath()
    m = load_methylation(FIX, sample="GSM946048")
    res = clock.predict(m.betas, chronological_age=60)
    targets = discover_targets(res, clock, m.betas, top_n=10)
    assert len(targets) == 10
    assert all(t.direction in ("methylate", "demethylate") for t in targets)
    assert any(t.gene for t in targets)


if __name__ == "__main__":
    test_clock_loads()
    test_predictions_are_close_to_real_age()
    test_targets_have_genes_and_direction()
    print("all epiage tests passed")
