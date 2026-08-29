"""Generic GEO methylation prep — handles processed files with paired
`<sample>.AVG_Beta` / `<sample>.Detection.Pval` columns (e.g. GSE179571,
ankylosing spondylitis). Keeps only the beta columns and slices out the samples
you want into a small uploadable file.

Usage (from simulator-backend, venv active):
  # first 3 samples
  python scripts/prep_geo.py --beta data/Ankylosing-spondylitis/GSE179571_process_data.csv.gz --n 3 --label as
  # specific AS patients (exact names or a prefix like "AS")
  python scripts/prep_geo.py --beta ...GSE179571_process_data.csv.gz --samples AS5078,AS5357 --label as
  python scripts/prep_geo.py --beta ...GSE179571_process_data.csv.gz --samples AS --label as   # all AS*

Writes to data/samples/:
  methylation_<label>.csv   (Name + chosen beta columns — upload this)
  ages_<label>.csv          (sample, age — if a --series file is given & matchable)
"""
from __future__ import annotations

import argparse
import csv
import gzip
import io
from pathlib import Path

BETA_SUFFIX = ".AVG_Beta"
PVAL_SUFFIX = ".Detection.Pval"


def _open(path: str) -> io.TextIOBase:
    if path.endswith(".gz"):
        return io.TextIOWrapper(gzip.open(path, "rb"), encoding="utf-8", errors="replace")
    return open(path, encoding="utf-8", errors="replace")


def _delim(line: str) -> str:
    return "\t" if line.count("\t") >= line.count(",") else ","


def _clean(name: str) -> str:
    if name.endswith(BETA_SUFFIX):
        return name[: -len(BETA_SUFFIX)]
    return name


def parse_ages(series_path: str) -> dict[str, str]:
    """title -> age, from a GEO series_matrix (best effort)."""
    titles: list[str] = []
    ages: list[str] = []
    with _open(series_path) as fh:
        for line in fh:
            if line.startswith("!Sample_title"):
                titles = [c.strip().strip('"') for c in line.rstrip("\n").split("\t")[1:]]
            elif line.startswith("!Sample_characteristics_ch1") and "age" in line.lower():
                for c in line.rstrip("\n").split("\t")[1:]:
                    v = c.strip().strip('"')
                    ages.append(v.split(":")[-1].strip() if ":" in v else v)
    return {t: a for t, a in zip(titles, ages)}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--beta", required=True)
    ap.add_argument("--series", help="series_matrix for ages (optional)")
    ap.add_argument("--samples", help="comma list; exact names or a prefix (e.g. 'AS')")
    ap.add_argument("--n", type=int, default=3)
    ap.add_argument("--label", default="geo")
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "data" / "samples"))
    args = ap.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    with _open(args.beta) as fh:
        first = fh.readline()
        delim = _delim(first)
        header = first.rstrip("\n").split(delim)
        # Beta columns: prefer explicit .AVG_Beta; else every non-Pval col after 0.
        beta_idx = [i for i, h in enumerate(header) if h.endswith(BETA_SUFFIX)]
        if not beta_idx:
            beta_idx = [i for i, h in enumerate(header[1:], 1) if not h.endswith(PVAL_SUFFIX)]
        clean = {i: _clean(header[i]) for i in beta_idx}

        # Choose which samples.
        if args.samples:
            tokens = [t.strip() for t in args.samples.split(",")]
            chosen_idx = [i for i in beta_idx if any(clean[i] == t or clean[i].startswith(t) for t in tokens)]
        else:
            chosen_idx = beta_idx[: args.n]
        if not chosen_idx:
            raise SystemExit("No matching samples. Available: " + ", ".join(clean[i] for i in beta_idx[:20]) + " …")

        names = [clean[i] for i in chosen_idx]
        idx = [0] + chosen_idx
        meth_path = out / f"methylation_{args.label}.csv"
        rd = csv.reader(fh, delimiter=delim)
        with open(meth_path, "w", newline="", encoding="utf-8") as mf:
            w = csv.writer(mf)
            w.writerow(["Name", *names])
            for row in rd:
                if len(row) > max(idx):
                    w.writerow([row[i] for i in idx])

    ages = parse_ages(args.series) if args.series else {}
    ages_path = out / f"ages_{args.label}.csv"
    with open(ages_path, "w", newline="", encoding="utf-8") as af:
        w = csv.writer(af)
        w.writerow(["sample", "age"])
        for n in names:
            w.writerow([n, ages.get(n, "")])

    print(f"Wrote {meth_path}  (samples: {names})")
    print(f"Wrote {ages_path}")
    for n in names:
        print(f"  {n}: age {ages.get(n, '?')}")
    print("\nUpload methylation_%s.csv, pick a sample, enter its age (optional), Compute." % args.label)


if __name__ == "__main__":
    main()
