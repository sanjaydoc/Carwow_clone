"""Methylation parsing (D2).

Accepts what a methylation assay / public dataset actually provides:

  * Two-column per-sample file   — CpG id (cgXXXXXXXX), beta value  [0..1]
  * Beta-value matrix            — rows = CpG ids, columns = samples
                                   (e.g. GSE40279_average_beta.txt); we extract
                                   one sample column by name or index.

Beta = fraction methylated at a CpG (0 = unmethylated, 1 = fully methylated).
This is the input epigenetic clocks consume.
"""
from __future__ import annotations

import gzip
import io
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Methylation:
    sample: str
    betas: dict[str, float]           # cg id -> beta
    n_sites: int

    def get(self, cpg: str) -> float | None:
        return self.betas.get(cpg)


def _open_text(path: Path) -> io.TextIOBase:
    if str(path).endswith(".gz"):
        return io.TextIOWrapper(gzip.open(path, "rb"), encoding="utf-8", errors="replace")
    return open(path, "r", encoding="utf-8", errors="replace")


def _split(line: str) -> list[str]:
    parts = line.rstrip("\n").split("\t")
    if len(parts) < 2:
        parts = line.rstrip("\n").split(",")
    if len(parts) < 2:
        parts = line.split()
    return parts


def load_methylation(
    path: str | Path,
    sample: str | int | None = None,
) -> Methylation:
    """Load a per-sample beta profile.

    `sample` selects a column when the file is a matrix: a column name, or an
    integer column index (0 = first data column). Ignored for 2-column files.
    """
    path = Path(path)
    with _open_text(path) as fh:
        first = fh.readline()
        cols = _split(first)
        header_is_labels = _looks_like_header(cols)

        # Decide which column holds our sample.
        col_idx = 1
        sample_name = sample if isinstance(sample, str) else "sample"
        if header_is_labels and len(cols) > 2:
            if isinstance(sample, str) and sample in cols:
                col_idx = cols.index(sample)
                sample_name = sample
            elif isinstance(sample, int):
                col_idx = 1 + sample
                sample_name = cols[col_idx] if col_idx < len(cols) else f"col{col_idx}"
            else:
                col_idx = 1
                sample_name = cols[1]
        elif not header_is_labels:
            # First line was already data (2-column file with no header).
            betas: dict[str, float] = {}
            reps: dict[str, list[float]] = {}
            _consume(betas, reps, cols, 1)
            for line in fh:
                _consume(betas, reps, _split(line), 1)
            _finalize_epic_v2(betas, reps)
            return Methylation(sample=str(sample_name), betas=betas, n_sites=len(betas))

        betas = {}
        reps = {}
        for line in fh:
            _consume(betas, reps, _split(line), col_idx)
    _finalize_epic_v2(betas, reps)
    return Methylation(sample=str(sample_name), betas=betas, n_sites=len(betas))


def _looks_like_header(cols: list[str]) -> bool:
    if len(cols) < 2:
        return False
    # A header row's second field is not a number.
    try:
        float(cols[1])
        return False
    except ValueError:
        return True


def _consume(betas: dict[str, float], reps: dict[str, list[float]],
             cols: list[str], col_idx: int) -> None:
    if len(cols) <= col_idx:
        return
    cg = cols[0].strip().strip('"')
    if not cg or cg.lower() in ("id", "cpg", "probe", "id_ref"):
        return
    raw = cols[col_idx].strip()
    if raw in ("", "NA", "NaN", "null"):
        return
    try:
        val = float(raw)
    except ValueError:
        return
    betas[cg] = val
    # Illumina EPIC v2 (935K) suffixes every probe id (e.g. cg00000029_TC21).
    # The clocks key on the base cg id, so collect replicates per base id and
    # average them below. 450K / EPIC v1 ids have no suffix and are untouched.
    if cg[:2] == "cg" and "_" in cg:
        reps.setdefault(cg.split("_", 1)[0], []).append(val)


def _finalize_epic_v2(betas: dict[str, float], reps: dict[str, list[float]]) -> None:
    """Fill base cg ids from EPIC-v2 suffixed replicate probes (mean of replicates),
    without overwriting a base id that was already present directly."""
    for base, vals in reps.items():
        if base not in betas and vals:
            betas[base] = sum(vals) / len(vals)


def list_samples(path: str | Path, limit: int = 50) -> list[str]:
    """Return the sample column names of a matrix file (for the UI picker)."""
    path = Path(path)
    with _open_text(path) as fh:
        cols = _split(fh.readline())
    if _looks_like_header(cols) and len(cols) > 2:
        return cols[1 : 1 + limit]
    return []
