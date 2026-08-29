"""One-shot inspector for GSE40279 — prints how the beta matrix labels its
sample columns and where the ages live in the series matrix, so the age-join can
be pinned exactly (no guessing).

Run from simulator-backend (venv active):
    python scripts/inspect_gse40279.py

It reads the already-downloaded files in data/downloads/. Paste its output back.
"""
from __future__ import annotations

import gzip
import io
from pathlib import Path

DL = Path(__file__).resolve().parent.parent / "data" / "downloads"


def _open(p: Path) -> io.TextIOBase:
    if str(p).endswith(".gz"):
        return io.TextIOWrapper(gzip.open(p, "rb"), encoding="utf-8", errors="replace")
    return open(p, encoding="utf-8", errors="replace")


def main() -> None:
    beta = next(DL.glob("*average_beta*"), None)
    series = next(DL.glob("*series_matrix*"), None)
    print(f"downloads dir: {DL}")
    print(f"beta file   : {beta}")
    print(f"series file : {series}\n")

    if beta:
        with _open(beta) as fh:
            header = fh.readline().rstrip("\n")
        delim = "\t" if "\t" in header else ","
        cols = header.split(delim)
        print("── BETA MATRIX header ──")
        print(f"  delimiter: {'TAB' if delim == chr(9) else 'COMMA'}")
        print(f"  first 8 column labels: {cols[:8]}\n")

    if series:
        with _open(series) as fh:
            for line in fh:
                if line.startswith("!Sample_geo_accession"):
                    v = [c.strip().strip('\"') for c in line.rstrip('\n').split('\t')[1:]]
                    print(f"!Sample_geo_accession  first 5: {v[:5]}")
                elif line.startswith("!Sample_title"):
                    v = [c.strip().strip('\"') for c in line.rstrip('\n').split('\t')[1:]]
                    print(f"!Sample_title          first 5: {v[:5]}")
                elif line.startswith("!Sample_characteristics_ch1"):
                    v = [c.strip().strip('\"') for c in line.rstrip('\n').split('\t')[1:]]
                    print(f"!Sample_characteristics_ch1 first 3: {v[:3]}")
                elif line.startswith("!series_matrix_table_begin"):
                    break


if __name__ == "__main__":
    main()
