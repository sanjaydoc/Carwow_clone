"""GEO dataset download + prep (S3).

Fetches a curated methylation dataset from NCBI GEO to the local data folder and
slices out a small, analysis-ready CSV — entirely from the UI, no shell commands.
Everything runs on the user's machine; only the public GEO FTP is contacted.

Three source shapes are handled (see diseases.DATASETS 'method'):
  * series_matrix  — the ...series_matrix.txt.gz carries the beta table inline
                     (ID_REF rows, GSM columns) plus sample ages/characteristics.
  * suppl_avgbeta  — a supplementary matrix with <sample>.AVG_Beta columns.
  * suppl_gse40279 — GSE40279's average_beta.txt.gz (betas) + series_matrix (ages).

Downloads stream in chunks and prep parses line-by-line, so even a 2 GB matrix
never loads fully into RAM. We keep only the first N sample columns.
"""
from __future__ import annotations

import csv
import gzip
import io
import urllib.request
from pathlib import Path
from typing import Callable

Emit = Callable[..., None]

GEO_BASE = "https://ftp.ncbi.nlm.nih.gov/geo/series"
BETA_SUFFIX = ".AVG_Beta"
PVAL_SUFFIX = ".Detection.Pval"


def _series_dir(acc: str) -> str:
    """GSE179571 -> GSE179nnn (GEO's directory bucketing)."""
    digits = acc[3:]
    bucket = digits[:-3] + "nnn" if len(digits) > 3 else "nnn"
    return f"GSE{bucket}"


def series_matrix_url(acc: str) -> str:
    return f"{GEO_BASE}/{_series_dir(acc)}/{acc}/matrix/{acc}_series_matrix.txt.gz"


def suppl_url(acc: str, filename: str) -> str:
    return f"{GEO_BASE}/{_series_dir(acc)}/{acc}/suppl/{filename}"


def _download(url: str, dest: Path, emit: Emit) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    emit(f"downloading {url}", progress=0.1)
    req = urllib.request.Request(url, headers={"User-Agent": "stemcells-sim/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:  # noqa: S310 (public GEO FTP over HTTPS)
        total = int(resp.headers.get("Content-Length") or 0)
        done = 0
        with open(dest, "wb") as fh:
            while True:
                chunk = resp.read(1024 * 1024)
                if not chunk:
                    break
                fh.write(chunk)
                done += len(chunk)
                if total:
                    emit(f"downloaded {done // (1024*1024)} / {total // (1024*1024)} MB",
                         progress=0.1 + 0.5 * (done / total))
                else:
                    emit(f"downloaded {done // (1024*1024)} MB", progress=0.3)
    emit("download complete", progress=0.6)
    return dest


def _open(path: Path) -> io.TextIOBase:
    if str(path).endswith(".gz"):
        return io.TextIOWrapper(gzip.open(path, "rb"), encoding="utf-8", errors="replace")
    return open(path, encoding="utf-8", errors="replace")


def _delim(line: str) -> str:
    return "\t" if line.count("\t") >= line.count(",") else ","


# ---- prep: series_matrix (betas inline + ages) -------------------------------
def _prep_series_matrix(src: Path, out_dir: Path, label: str, n: int, emit: Emit,
                        pick: str = "oldest") -> dict:
    gsms: list[str] = []
    ages: list[str] = []
    diseases: list[str] = []
    in_table = False
    header: list[str] = []
    keep_idx: list[int] = []
    names: list[str] = []
    _chosen_age: dict[str, str] = {}
    _chosen_dis: dict[str, str] = {}
    rows = 0
    meth_path = out_dir / f"methylation_{label}.csv"
    mf = open(meth_path, "w", newline="", encoding="utf-8")
    w = csv.writer(mf)
    emit("parsing series matrix…", progress=0.65)
    with _open(src) as fh:
        for line in fh:
            if not in_table:
                if line.startswith("!Sample_geo_accession"):
                    gsms = [c.strip().strip('"') for c in line.rstrip("\n").split("\t")[1:]]
                elif line.startswith("!Sample_characteristics_ch1"):
                    low = line.lower()
                    vals = [c.strip().strip('"') for c in line.rstrip("\n").split("\t")[1:]]
                    if "age" in low and not ages:
                        ages = [v.split(":")[-1].strip() if ":" in v else v for v in vals]
                    if ("disease" in low or "status" in low or "diagnosis" in low) and not diseases:
                        diseases = [v.split(":")[-1].strip() if ":" in v else v for v in vals]
                elif line.startswith("!series_matrix_table_begin"):
                    in_table = True
                continue
            if line.startswith("!series_matrix_table_end"):
                break
            delim = _delim(line)
            row = next(csv.reader([line.rstrip("\n")], delimiter=delim))
            if not header:
                header = row
                sample_cols = header[1:]
                # Prefer the OLDEST samples when ages are available (column j pairs
                # with ages[j-1] positionally); else keep the first n.
                def _num(a: str) -> float | None:
                    try:
                        return float(a)
                    except (TypeError, ValueError):
                        return None

                if pick == "oldest" and ages:
                    ranked = sorted(
                        (j for j in range(1, len(sample_cols) + 1)
                         if j - 1 < len(ages) and _num(ages[j - 1]) is not None),
                        key=lambda j: _num(ages[j - 1]), reverse=True,
                    )
                    chosen = ranked[:n] or list(range(1, 1 + min(n, len(sample_cols))))
                else:
                    chosen = list(range(1, 1 + min(n, len(sample_cols))))
                keep_idx = [0] + chosen
                names = [header[i] for i in chosen]
                # Ages/diseases keyed positionally to the chosen columns.
                _chosen_age = {header[j]: (ages[j - 1] if j - 1 < len(ages) else "") for j in chosen}
                _chosen_dis = {header[j]: (diseases[j - 1] if j - 1 < len(diseases) else "") for j in chosen}
                w.writerow(["Name", *names])
                continue
            if len(row) > max(keep_idx):
                w.writerow([row[i] for i in keep_idx])
                rows += 1
                if rows % 50000 == 0:
                    emit(f"parsed {rows} probes…", progress=0.8)
    mf.close()
    if not names:
        raise RuntimeError("series_matrix had no inline beta table; use the supplementary file instead.")
    age_map = _chosen_age if ages else {}
    dis_map = _chosen_dis if diseases else {}
    _write_ages(out_dir, label, names, age_map, dis_map)
    return {"samples": names, "ages": age_map, "diseases": dis_map, "n_probes": rows,
            "methylation_file": meth_path.name}


# ---- prep: supplementary <sample>.AVG_Beta matrix ----------------------------
def _prep_suppl_avgbeta(src: Path, out_dir: Path, label: str, n: int, emit: Emit) -> dict:
    meth_path = out_dir / f"methylation_{label}.csv"
    emit("parsing supplementary matrix…", progress=0.65)
    with _open(src) as fh:
        first = fh.readline()
        delim = _delim(first)
        head = first.rstrip("\n").split(delim)
        beta_idx = [i for i, h in enumerate(head) if h.endswith(BETA_SUFFIX)]
        if not beta_idx:
            beta_idx = [i for i, h in enumerate(head[1:], 1) if not h.endswith(PVAL_SUFFIX)]
        beta_idx = beta_idx[:n]
        names = [head[i][:-len(BETA_SUFFIX)] if head[i].endswith(BETA_SUFFIX) else head[i] for i in beta_idx]
        keep = [0] + beta_idx
        rd = csv.reader(fh, delimiter=delim)
        rows = 0
        with open(meth_path, "w", newline="", encoding="utf-8") as mf:
            w = csv.writer(mf)
            w.writerow(["Name", *names])
            for row in rd:
                if len(row) > max(keep):
                    w.writerow([row[i] for i in keep])
                    rows += 1
    _write_ages(out_dir, label, names, {}, {})
    return {"samples": names, "ages": {}, "diseases": {}, "n_probes": rows,
            "methylation_file": meth_path.name}


# ---- prep: GSE40279 (two files) ----------------------------------------------
def _prep_gse40279(beta_src: Path, series_src: Path | None, out_dir: Path,
                   label: str, n: int, emit: Emit, pick: str = "oldest") -> dict:
    # GSE40279's beta-matrix columns are internal labels (e.g. "X1001") that do
    # NOT match the GSM accessions in the series-matrix — label matching is
    # unreliable. The beta columns are, however, in the SAME ORDER as the samples
    # in the series-matrix, so we pair ages by column POSITION (the epigenetic
    # clock itself confirms the pairing: a sample labelled 80 should compute ~80).
    # We also keep the label maps as a secondary check.
    gsm_age: dict[str, str] = {}
    title_age: dict[str, str] = {}
    age_list: list[str] = []
    if series_src and series_src.exists():
        with _open(series_src) as fh:
            gsms: list[str] = []
            titles: list[str] = []
            for line in fh:
                if line.startswith("!Sample_geo_accession"):
                    gsms = [c.strip().strip('"') for c in line.rstrip("\n").split("\t")[1:]]
                elif line.startswith("!Sample_title"):
                    titles = [c.strip().strip('"') for c in line.rstrip("\n").split("\t")[1:]]
                elif line.startswith("!Sample_characteristics_ch1") and "age" in line.lower():
                    for c in line.rstrip("\n").split("\t")[1:]:
                        v = c.strip().strip('"')
                        age_list.append(v.split(":")[-1].strip() if ":" in v else v)
            gsm_age = {g: a for g, a in zip(gsms, age_list)}
            title_age = {t: a for t, a in zip(titles, age_list)}

    def _num(a: str) -> float | None:
        try:
            return float(a)
        except (TypeError, ValueError):
            return None

    meth_path = out_dir / f"methylation_{label}.csv"
    emit("parsing GSE40279 beta matrix…", progress=0.65)
    with _open(beta_src) as fh:
        rd = csv.reader(fh, delimiter="\t")
        header = next(rd)
        n_cols = len(header) - 1  # sample columns (col 0 = probe id)

        # Decide which sample columns to keep. Column i (1-based sample index)
        # pairs with age_list[i-1] positionally.
        if pick == "oldest" and age_list:
            ranked = sorted(
                (i for i in range(1, n_cols + 1) if _num(age_list[i - 1] if i - 1 < len(age_list) else "") is not None),
                key=lambda i: _num(age_list[i - 1]),
                reverse=True,
            )
            chosen = ranked[:n] or list(range(1, 1 + min(n, n_cols)))
        else:
            chosen = list(range(1, 1 + min(n, n_cols)))

        keep = [0] + chosen
        names = [header[i] for i in chosen]
        rows = 0
        with open(meth_path, "w", newline="", encoding="utf-8") as mf:
            w = csv.writer(mf)
            w.writerow(["Name", *names])
            for row in rd:
                if len(row) > max(keep):
                    w.writerow([row[i] for i in keep])
                    rows += 1

    def _resolve_age(name: str, col_index: int) -> str:
        # Positional first (reliable for GSE40279), label maps as backup.
        if col_index - 1 < len(age_list) and age_list[col_index - 1]:
            return age_list[col_index - 1]
        for key in (name, name.lstrip("X"), "X" + name):
            if key in title_age:
                return title_age[key]
            if key in gsm_age:
                return gsm_age[key]
        return ""

    resolved = {header[ci]: _resolve_age(header[ci], ci) for ci in chosen}
    _write_ages(out_dir, label, names, resolved, {})
    return {"samples": names, "ages": resolved,
            "diseases": {}, "n_probes": rows, "methylation_file": meth_path.name}


def _write_ages(out_dir: Path, label: str, names: list[str],
                ages: dict[str, str], diseases: dict[str, str]) -> None:
    with open(out_dir / f"ages_{label}.csv", "w", newline="", encoding="utf-8") as af:
        w = csv.writer(af)
        w.writerow(["sample", "age", "condition"])
        for nm in names:
            w.writerow([nm, ages.get(nm, ""), diseases.get(nm, "")])


def download_and_prep(dataset: dict, out_dir: Path, download_dir: Path,
                      label: str, n: int, emit: Emit) -> dict:
    """Download the curated dataset and prep a small methylation CSV.

    Returns {samples, ages, diseases, methylation_file, n_probes, accession}.
    Re-uses an already-downloaded raw file if present (so re-runs are instant).
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    download_dir.mkdir(parents=True, exist_ok=True)
    acc = dataset["accession"]
    method = dataset["method"]

    if method == "series_matrix":
        raw = download_dir / f"{acc}_series_matrix.txt.gz"
        if not raw.exists():
            _download(series_matrix_url(acc), raw, emit)
        else:
            emit("using cached download", progress=0.6)
        result = _prep_series_matrix(raw, out_dir, label, n, emit,
                                     pick=dataset.get("pick", "oldest"))

    elif method == "suppl_avgbeta":
        fname = dataset["beta_file"]
        raw = download_dir / fname
        if not raw.exists():
            _download(suppl_url(acc, fname), raw, emit)
        else:
            emit("using cached download", progress=0.6)
        result = _prep_suppl_avgbeta(raw, out_dir, label, n, emit)

    elif method == "suppl_gse40279":
        beta = download_dir / dataset["beta_file"]
        series = download_dir / f"{acc}_series_matrix.txt.gz"
        if not beta.exists():
            _download(suppl_url(acc, dataset["beta_file"]), beta, emit)
        if not series.exists():
            try:
                _download(series_matrix_url(acc), series, emit)
            except Exception as exc:  # ages optional
                emit(f"ages unavailable ({exc}); continuing without ages", progress=0.6)
                series = None
        result = _prep_gse40279(beta, series, out_dir, label, n, emit,
                                pick=dataset.get("pick", "oldest"))

    else:
        raise RuntimeError(f"unknown dataset method: {method}")

    result["accession"] = acc
    emit(f"prepared {result['methylation_file']} · {len(result['samples'])} samples", progress=1.0)
    return result
