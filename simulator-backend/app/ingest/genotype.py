"""Genotype parsing (D2).

Supports the file formats a person actually gets from a consumer test or a
sequencing pipeline:

  * 23andMe raw data      — TSV: rsid, chromosome, position, genotype
  * AncestryDNA raw data  — TSV: rsid, chromosome, position, allele1, allele2
  * VCF (v4.x)            — standard variant call format (genotypes optional)

Everything is parsed locally; nothing is uploaded.
"""
from __future__ import annotations

import gzip
import io
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Genotype:
    source: str                       # "23andme" | "ancestrydna" | "vcf"
    calls: dict[str, str]             # rsid -> genotype (e.g. "AG"); VCF: "0/1"
    n_variants: int
    build: str | None = None          # e.g. "GRCh37" / "GRCh38" if known

    def get(self, rsid: str) -> str | None:
        return self.calls.get(rsid)


def _open_text(path: Path) -> io.TextIOBase:
    if str(path).endswith(".gz"):
        return io.TextIOWrapper(gzip.open(path, "rb"), encoding="utf-8", errors="replace")
    return open(path, "r", encoding="utf-8", errors="replace")


def _sniff(path: Path, header_lines: list[str]) -> str:
    text = "\n".join(header_lines).lower()
    if str(path).endswith((".vcf", ".vcf.gz")) or "##fileformat=vcf" in text:
        return "vcf"
    if "ancestrydna" in text or "allele1" in text:
        return "ancestrydna"
    return "23andme"  # 23andMe is the common default


def _detect_build(header_lines: list[str]) -> str | None:
    text = "\n".join(header_lines).lower()
    if "grch38" in text or "build 38" in text or "hg38" in text:
        return "GRCh38"
    if "grch37" in text or "build 37" in text or "hg19" in text:
        return "GRCh37"
    return None


def load_genotype(path: str | Path) -> Genotype:
    path = Path(path)
    # Peek at the first comment/header lines to detect format + build.
    header: list[str] = []
    with _open_text(path) as fh:
        for line in fh:
            if line.startswith("#") or "allele1" in line.lower() or "rsid" in line.lower():
                header.append(line.rstrip("\n"))
                if len(header) > 40:
                    break
            else:
                break
    fmt = _sniff(path, header)
    build = _detect_build(header)

    if fmt == "vcf":
        return _load_vcf(path, build)
    return _load_array(path, fmt, build)


def _load_array(path: Path, fmt: str, build: str | None) -> Genotype:
    calls: dict[str, str] = {}
    with _open_text(path) as fh:
        for line in fh:
            if not line or line.startswith("#"):
                continue
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 4:
                parts = line.split()
            if len(parts) < 4 or parts[0].lower() in ("rsid", "rs_id"):
                continue
            rsid = parts[0]
            if fmt == "ancestrydna" and len(parts) >= 5:
                geno = f"{parts[3]}{parts[4]}"
            else:
                geno = parts[3]
            geno = geno.strip().upper()
            # Keep real indel calls (D/I) — CCR5-Δ32 (rs333) is an indel; only drop no-calls.
            if geno and geno not in ("--", "00", "NN", "__"):
                calls[rsid] = geno
    return Genotype(source=fmt, calls=calls, n_variants=len(calls), build=build)


def _load_vcf(path: Path, build: str | None) -> Genotype:
    calls: dict[str, str] = {}
    with _open_text(path) as fh:
        for line in fh:
            if line.startswith("##"):
                low = line.lower()
                if build is None and "grch38" in low:
                    build = "GRCh38"
                elif build is None and ("grch37" in low or "hg19" in low):
                    build = "GRCh37"
                continue
            if line.startswith("#"):
                continue
            cols = line.rstrip("\n").split("\t")
            if len(cols) < 8:
                continue
            rsid = cols[2]
            if rsid in (".", ""):
                rsid = f"{cols[0]}:{cols[1]}"
            # Genotype call (GT) from the first sample, if present.
            gt = None
            if len(cols) >= 10:
                fmt_keys = cols[8].split(":")
                if "GT" in fmt_keys:
                    gt = cols[9].split(":")[fmt_keys.index("GT")]
            calls[rsid] = gt or f"{cols[3]}>{cols[4]}"
    return Genotype(source="vcf", calls=calls, n_variants=len(calls), build=build)
