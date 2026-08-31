"""Convert a WGBS/RRBS bisulfite methylation file into a clock-ready beta CSV
you can upload to the Simulator (like prep_geo.py, but for sequencing output).

Runs locally; nothing leaves the machine. Fully additive — it does not touch any
existing pipeline; it just writes data/samples/methylation_<label>.csv, which you
then upload through the normal "upload your own methylation file" box.

Examples
--------
# Bismark coverage aligned to hg38, using a public Illumina EPIC/450K manifest
python scripts/wgbs_to_beta.py --input patient.cov --build hg38 \
    --manifest manifests/EPIC-8v2-0_A2.csv --label patient1

# A file already on the legacy hg18/build36 assembly (no manifest needed)
python scripts/wgbs_to_beta.py --input old.bedGraph --build hg18 --label demo

Accepts Bismark .cov, Bismark bedGraph, or a TSV/CSV with a header naming
chr / pos / (beta | count_methylated+count_unmethylated). Gzipped inputs ok.

Where to get a manifest (one-time, public): Illumina support downloads the
"MethylationEPIC v2.0 Manifest File (CSV)" (hg38) or the 450K manifest (hg19);
either works — just make sure it matches the genome build your WGBS was aligned
to. The manifest only needs an id column (IlmnID/Name) and a position
(MAPINFO / Start_hg38).
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

# allow running from simulator-backend/ without installing the package
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.ingest.wgbs import wgbs_to_beta  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser(description="WGBS/RRBS → Horvath-clock beta CSV")
    ap.add_argument("--input", required=True, help="Bismark .cov / bedGraph / TSV/CSV (.gz ok)")
    ap.add_argument("--build", default="hg38", help="genome build of the input: hg38 | hg19 | hg18")
    ap.add_argument("--manifest", help="Illumina 450K/EPIC manifest CSV (required for hg19/hg38)")
    ap.add_argument("--label", default="wgbs", help="output label & sample name")
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "data" / "samples"))
    args = ap.parse_args()

    out_file = Path(args.out) / f"methylation_{args.label}.csv"
    res = wgbs_to_beta(args.input, out_file, sample=args.label,
                       build=args.build, manifest=args.manifest)

    print(f"Wrote {res['out_file']}")
    print(f"Matched {res['matched']}/{res['total']} clock CpGs "
          f"({round(res['coverage'] * 100)}% coverage).")
    if res["coverage"] < 0.6:
        print("\n⚠  Low coverage. Likely causes:")
        print("   • the --build does not match your WGBS alignment, or")
        print("   • the --manifest is for a different build, or")
        print("   • the input is a targeted panel that misses most clock CpGs.")
        print("   The clock still runs, but accuracy drops as coverage falls.")
    else:
        print(f"\nUpload methylation_{args.label}.csv in the Simulator → pick the sample → Compute.")


if __name__ == "__main__":
    main()
