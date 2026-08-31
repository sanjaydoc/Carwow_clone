"""WGBS / RRBS → clock-ready beta matrix (additive, self-contained).

Whole-genome / reduced-representation bisulfite sequencing reports methylation
per genomic CpG (chromosome + position), NOT by Illumina `cg` probe id. The
Horvath clock needs the 353 `cg` sites. This module maps a bisulfite methylation
file onto those 353 CpGs by genomic coordinate and writes the same
`Name,<sample>` beta CSV the Simulator already ingests — so the output uploads
through the existing flow with no changes to any existing code path.

Coordinates:
  * build "hg18"/"36"  → uses the coordinates already bundled in the clock file
    (Horvath 2013 was published on build 36). No manifest needed.
  * build "hg19"/"hg38" → give an Illumina 450K/EPIC manifest (`--manifest`) that
    maps cg → chr:pos at that build (a public one-time download). Your WGBS must
    be aligned to the same build as the manifest.

Nothing here imports or modifies the existing pipeline; it only READS the clock
coefficient CSV for the CpG list + build-36 coordinates.
"""
from __future__ import annotations

import csv
import gzip
import io
from pathlib import Path

_COEF = Path(__file__).resolve().parent.parent / "epiage" / "coefficients" / "horvath2013.csv"


def _open(path: str | Path) -> io.TextIOBase:
    path = str(path)
    if path.endswith(".gz"):
        return io.TextIOWrapper(gzip.open(path, "rb"), encoding="utf-8", errors="replace")
    return open(path, encoding="utf-8", errors="replace")


def _norm_chr(c: str) -> str:
    c = (c or "").strip()
    if c.lower().startswith("chr"):
        c = c[3:]
    return c.upper()  # 1..22, X, Y, MT


def clock_coords_build36() -> dict[str, tuple[str, int]]:
    """cg -> (chr, pos) for the 353 clock CpGs, from the bundled clock file (hg18)."""
    out: dict[str, tuple[str, int]] = {}
    with open(_COEF, encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            cg = (r.get("CpGmarker") or "").strip()
            chrom = (r.get("Chr") or "").strip()
            pos = (r.get("MapInfo") or "").strip()
            if cg.startswith("cg") and chrom and pos:
                try:
                    out[cg] = (_norm_chr(chrom), int(pos))
                except ValueError:
                    continue
    return out


def bundled_coords(build: str) -> dict[str, tuple[str, int]]:
    """cg -> (chr, pos) for the 353 clock CpGs at hg19/hg38, from bundled tables
    (extracted from the Zhou-lab HM450 manifest). No user manifest needed."""
    b = "hg38" if build in ("hg38", "grch38", "38") else "hg19"
    path = _COEF.parent / f"clock_coords_{b}.csv"
    out: dict[str, tuple[str, int]] = {}
    if not path.is_file():
        return out
    with open(path, encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            try:
                out[r["Name"]] = (_norm_chr(r["chr"]), int(r["pos"]))
            except (KeyError, ValueError):
                continue
    return out


def clock_cgs() -> set[str]:
    with open(_COEF, encoding="utf-8") as fh:
        return {(r.get("CpGmarker") or "").strip()
                for r in csv.DictReader(fh) if (r.get("CpGmarker") or "").startswith("cg")}


def coords_from_manifest(manifest_path: str | Path, wanted: set[str]) -> dict[str, tuple[str, int]]:
    """cg -> (chr, pos) from an Illumina 450K/EPIC manifest, for the wanted cgs.

    Tolerant to the usual column names: id in IlmnID/Name/probeID; chromosome in
    CHR/CHR_hg38/Chromosome; position in MAPINFO/Start_hg38/position.
    """
    with _open(manifest_path) as fh:
        # Illumina manifests have a preamble; find the header row with the id col.
        header: list[str] = []
        reader = csv.reader(fh)
        for row in reader:
            low = [c.strip().lower() for c in row]
            if any(k in low for k in ("ilmnid", "name", "probeid")) and \
               any(k in low for k in ("mapinfo", "start_hg38", "position", "pos")):
                header = row
                break
        if not header:
            raise ValueError("Could not find a manifest header row (need an id + position column).")
        low = [c.strip().lower() for c in header]

        def col(*names: str) -> int:
            for n in names:
                if n in low:
                    return low.index(n)
            return -1

        i_id = col("ilmnid", "name", "probeid")
        i_chr = col("chr_hg38", "chr", "chromosome", "chr_hg19")
        i_pos = col("start_hg38", "mapinfo", "position", "pos")
        if min(i_id, i_chr, i_pos) < 0:
            raise ValueError("Manifest missing id/chr/pos columns.")

        out: dict[str, tuple[str, int]] = {}
        for row in reader:
            if len(row) <= max(i_id, i_chr, i_pos):
                continue
            cg = row[i_id].strip()
            if cg in wanted:
                try:
                    out[cg] = (_norm_chr(row[i_chr]), int(float(row[i_pos])))
                except (ValueError, TypeError):
                    continue
        return out


def _parse_records(path: str | Path):
    """Yield (chrom, pos, beta) from a bisulfite methylation file.

    Handles Bismark coverage (.cov: chr start end meth% countM countU), Bismark
    bedGraph (chr start end meth%), and generic TSV/CSV with a header naming the
    columns. Beta is the methylation FRACTION (0-1).
    """
    with _open(path) as fh:
        first = fh.readline()
        if not first:
            return
        delim = "\t" if first.count("\t") >= first.count(",") else ","
        cols_first = first.rstrip("\n").split(delim)
        # Header?  (non-numeric second field)
        has_header = False
        low = [c.strip().lower() for c in cols_first]
        if any(k in low for k in ("chr", "chrom", "chromosome")) or \
           any(k in low for k in ("meth", "beta", "methylation", "start", "pos")):
            try:
                float(cols_first[-1])
            except ValueError:
                has_header = True

        idx = None
        if has_header:
            def find(*names):
                for n in names:
                    if n in low:
                        return low.index(n)
                return -1
            idx = {
                "chr": find("chr", "chrom", "chromosome"),
                "pos": find("start", "pos", "position", "mapinfo"),
                "beta": find("beta", "methylation", "meth", "methylation_level", "freq"),
                "mc": find("count_methylated", "countm", "meth_count", "numcs"),
                "uc": find("count_unmethylated", "countu", "unmeth_count", "numts"),
            }
        else:
            # Push the first data line back through by processing it below.
            fh_iter = _prepend(first, fh)
            for rec in _emit_positional(fh_iter, delim):
                yield rec
            return

        rd = csv.reader(fh, delimiter=delim)
        for row in rd:
            vk = _row_beta(row, idx)
            if vk is None:
                continue
            try:
                yield (_norm_chr(row[idx["chr"]]), int(float(row[idx["pos"]])), vk[0], vk[1])
            except (ValueError, IndexError):
                continue


def _prepend(line: str, fh):
    yield line
    for ln in fh:
        yield ln


def _emit_positional(lines, delim):
    """No header: infer format and yield (chrom, pos, value, kind).

    kind marks how `value` must be interpreted so scaling is exact, not guessed:
      'frac' — already a 0-1 fraction (from read counts); trust it.
      'pct'  — a 0-100 percentage (ENCODE bedMethyl col 11, by spec); ÷100.
      'raw'  — an un-scaled number (bedGraph could be 0-1 OR 0-100); the caller
               decides ONCE per file from the whole matched set (never per value).

    Formats: ENCODE bedMethyl (≥11 col, strand at col 6), Bismark .cov
    (6 col: chr start end meth% countM countU), or bedGraph (4 col)."""
    for ln in lines:
        row = ln.rstrip("\n").split(delim)
        if len(row) < 4:
            continue
        try:
            chrom = _norm_chr(row[0])
            pos = int(float(row[1]))
        except (ValueError, IndexError):
            continue
        if len(row) >= 11 and row[5] in ("+", "-", "."):  # ENCODE bedMethyl
            try:
                cov, pm = float(row[9]), float(row[10])
            except ValueError:
                continue
            if cov > 0:
                yield (chrom, pos, pm, "pct")            # col 11 is 0-100 by spec
        elif len(row) >= 6:  # Bismark .cov (counts are unambiguous)
            try:
                m, u = float(row[4]), float(row[5])
                if (m + u) > 0:
                    yield (chrom, pos, m / (m + u), "frac")
            except ValueError:
                try:
                    yield (chrom, pos, float(row[3]), "raw")
                except ValueError:
                    continue
        else:  # bedGraph — scale decided globally by the caller
            try:
                yield (chrom, pos, float(row[3]), "raw")
            except ValueError:
                continue


def _row_beta(row, idx) -> tuple[float, str] | None:
    """Return (value, kind) for a header-based row. Counts → exact 'frac';
    a beta/methylation column → 'raw' (0-1 or 0-100 decided globally later)."""
    if idx.get("mc", -1) >= 0 and idx.get("uc", -1) >= 0:
        try:
            m, u = float(row[idx["mc"]]), float(row[idx["uc"]])
            return (m / (m + u), "frac") if (m + u) > 0 else None
        except (ValueError, IndexError):
            pass
    if idx.get("beta", -1) >= 0:
        try:
            return (float(row[idx["beta"]]), "raw")
        except (ValueError, IndexError):
            return None
    return None


def wgbs_to_beta(input_path: str | Path, out_path: str | Path, *, sample: str = "sample",
                 build: str = "hg38", manifest: str | Path | None = None) -> dict:
    """Convert a bisulfite methylation file to a clock-ready beta CSV.

    Returns {matched, total, coverage, out_file}. Matches by coordinate with ±1
    tolerance (CpG strand / 0-vs-1-based off-by-one)."""
    cgs = clock_cgs()
    b = (build or "").lower()
    if manifest:                                   # user-supplied manifest wins
        coords = coords_from_manifest(manifest, cgs)
    elif b in ("hg18", "36", "ncbi36", "build36"):
        coords = clock_coords_build36()
    elif b in ("hg19", "grch37", "37"):
        coords = bundled_coords("hg19")            # bundled — no manifest needed
    elif b in ("hg38", "grch38", "38"):
        coords = bundled_coords("hg38")            # bundled — no manifest needed
    else:
        raise ValueError(f"Unknown build '{build}'. Use hg18/hg19/hg38, or pass a manifest.")
    if not coords:
        raise ValueError(f"No clock-CpG coordinates for build '{build}'. "
                         "Pass an Illumina manifest, or use hg18/hg19/hg38.")

    # position index with ±1 tolerance
    pos_index: dict[tuple[str, int], str] = {}
    for cg, (chrom, pos) in coords.items():
        for d in (0, -1, 1):
            pos_index.setdefault((chrom, pos + d), cg)

    # Collect the raw matched values with their kind; decide the 0-1 vs 0-100
    # scale for ambiguous 'raw' values ONCE, from the whole matched set (a real
    # methylation profile always has some highly-methylated clock CpGs, so a
    # percent file exceeds 1.5 somewhere while a fraction file never exceeds 1.0).
    matched: dict[str, tuple[float, str]] = {}
    for chrom, pos, value, kind in _parse_records(input_path):
        cg = pos_index.get((chrom, pos))
        if cg and cg not in matched:
            matched[cg] = (value, kind)

    raw_vals = [v for (v, k) in matched.values() if k == "raw"]
    raw_div = 100.0 if (raw_vals and max(raw_vals) > 1.5) else 1.0

    betas: dict[str, float] = {}
    for cg, (value, kind) in matched.items():
        if kind == "frac":
            b = value
        elif kind == "pct":
            b = value / 100.0
        else:  # raw
            b = value / raw_div
        betas[cg] = round(min(1.0, max(0.0, b)), 4)

    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["Name", sample])
        for cg in sorted(cgs):
            if cg in betas:
                w.writerow([cg, betas[cg]])
    matched = len(betas)
    return {"matched": matched, "total": len(cgs),
            "coverage": round(matched / len(cgs), 3) if cgs else 0.0,
            "out_file": str(out_path)}
