"""Slice GSE40279 (Hannum et al.) into a small, uploadable methylation file.

The GSE40279 beta matrix is ~2 GB (656 people). This extracts just the sample
column(s) you want — plus each person's age — into a compact CSV you can upload
to the Simulator's /analyze.

Downloads (put these next to this script or pass their paths):
  beta matrix : https://ftp.ncbi.nlm.nih.gov/geo/series/GSE40nnn/GSE40279/suppl/GSE40279_average_beta.txt.gz
  ages / meta : https://ftp.ncbi.nlm.nih.gov/geo/series/GSE40nnn/GSE40279/matrix/GSE40279_series_matrix.txt.gz

Usage:
  python scripts/prep_gse40279.py --beta GSE40279_average_beta.txt.gz \
      --series GSE40279_series_matrix.txt.gz --n 3
  # or pick specific samples:
  python scripts/prep_gse40279.py --beta ... --series ... --samples GSM989827,GSM989828

Writes to data/samples/:
  methylation_gse40279.csv   (ProbeID + chosen sample columns — upload this)
  ages_gse40279.csv          (GSM, age — use these in the 'chronological age' box)
"""
from __future__ import annotations

import argparse
import csv
import gzip
import io
from pathlib import Path


def _open(path: str) -> io.TextIOBase:
    if path.endswith(".gz"):
        return io.TextIOWrapper(gzip.open(path, "rb"), encoding="utf-8", errors="replace")
    return open(path, encoding="utf-8", errors="replace")


def parse_ages(series_path: str) -> dict[str, str]:
    """Map GSM accession -> age from a GEO series_matrix file."""
    gsms: list[str] = []
    ages: list[str] = []
    with _open(series_path) as fh:
        for line in fh:
            if line.startswith("!Sample_geo_accession"):
                gsms = [c.strip().strip('"') for c in line.rstrip("\n").split("\t")[1:]]
            elif line.startswith("!Sample_characteristics_ch1") and "age" in line.lower():
                for c in line.rstrip("\n").split("\t")[1:]:
                    v = c.strip().strip('"')
                    # formats like "age (y): 67" or "age: 67"
                    num = v.split(":")[-1].strip() if ":" in v else v
                    ages.append(num)
    return {g: a for g, a in zip(gsms, ages)}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--beta", required=True, help="GSE40279_average_beta.txt(.gz)")
    ap.add_argument("--series", help="GSE40279_series_matrix.txt(.gz) for ages")
    ap.add_argument("--samples", help="comma-separated GSM ids to extract")
    ap.add_argument("--n", type=int, default=3, help="or extract the first N samples")
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "data" / "samples"))
    args = ap.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    ages = parse_ages(args.series) if args.series else {}

    with _open(args.beta) as fh:
        reader = csv.reader(fh, delimiter="\t")
        header = next(reader)
        # header[0] is the probe-id column; the rest are sample ids.
        sample_ids = header[1:]
        if args.samples:
            wanted = [s.strip() for s in args.samples.split(",")]
        else:
            wanted = sample_ids[: args.n]
        idx = [0] + [1 + sample_ids.index(s) for s in wanted if s in sample_ids]
        chosen = [header[i] for i in idx]

        meth_path = out / "methylation_gse40279.csv"
        with open(meth_path, "w", newline="", encoding="utf-8") as mf:
            w = csv.writer(mf)
            w.writerow(chosen)
            for row in reader:
                if len(row) > max(idx):
                    w.writerow([row[i] for i in idx])

    # Ages for the chosen samples.
    ages_path = out / "ages_gse40279.csv"
    with open(ages_path, "w", newline="", encoding="utf-8") as af:
        w = csv.writer(af)
        w.writerow(["geo_accession", "age"])
        for s in chosen[1:]:
            w.writerow([s, ages.get(s, "")])

    print(f"Wrote {meth_path}  (samples: {chosen[1:]})")
    print(f"Wrote {ages_path}")
    for s in chosen[1:]:
        print(f"  {s}: age {ages.get(s, '?')}")
    print("\nUpload methylation_gse40279.csv in the Simulator, pick a sample, and enter its age.")


if __name__ == "__main__":
    main()
