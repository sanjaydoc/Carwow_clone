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
import re
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


# Methylation platform ids — prefer these when a series has several matrix files.
_METH_PLATFORMS = ("GPL13534", "GPL21145", "GPL8490", "GPL23976", "GPL18809")


def _clock_cgs() -> set[str]:
    """The 353 Horvath clock CpG ids (lazy import; avoids a hard dependency)."""
    try:
        from app.ingest.wgbs import clock_cgs
        return clock_cgs()
    except Exception:
        return set()


# Supplementary beta-matrix discovery (used when a series_matrix carries only
# sample metadata and the betas live in the suppl/ directory instead).
_SUPPL_FILE_RE = re.compile(r'([A-Za-z0-9][A-Za-z0-9_.\-]+\.(?:csv|txt|tsv)(?:\.gz)?)', re.I)
_SUPPL_BETA_HINT = ("beta", "matrix", "processed", "methylation", "norm", "mvalue", "meth")
_SUPPL_BETA_SKIP = ("raw", "signal", "_pval", "pvals", "detection", "readme",
                    "annot", "manifest", "sample_sheet", "samplesheet", "idat")


def _discover_suppl_files(acc: str) -> list[str]:
    """List a series' suppl/ directory and return candidate downloadable URLs."""
    base = f"{GEO_BASE}/{_series_dir(acc)}/{acc}/suppl/"
    try:
        req = urllib.request.Request(base, headers={"User-Agent": "stemcells-sim/1.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:  # noqa: S310
            html = resp.read().decode("utf-8", "replace")
    except Exception:
        return []
    names = sorted(set(_SUPPL_FILE_RE.findall(html)))
    return [base + n for n in names]


def _fetch_suppl_beta(acc: str, download_dir: Path, emit: Emit) -> Path | None:
    """Find + download the most beta-matrix-like supplementary file (cached)."""
    def score(url: str) -> int:
        n = url.lower()
        if any(s in n for s in _SUPPL_BETA_SKIP):
            return -1
        return 1 + sum(h in n for h in _SUPPL_BETA_HINT)

    urls = [u for u in _discover_suppl_files(acc) if score(u) >= 0]
    if not urls:
        return None
    chosen = sorted(urls, key=score, reverse=True)[0]
    dest = download_dir / chosen.rsplit("/", 1)[-1]
    if not dest.exists():
        emit(f"fetching supplementary betas: {dest.name}", progress=0.35)
        _download(chosen, dest, emit)
    else:
        emit("using cached supplementary betas", progress=0.55)
    return dest


def _discover_matrix_files(acc: str) -> list[str]:
    """List a series' matrix/ directory and return the actual *_series_matrix.txt.gz
    URLs. Handles multi-platform / super-series where the file is named
    '<acc>-GPL…_series_matrix.txt.gz' (so the plain name 404s)."""
    base = f"{GEO_BASE}/{_series_dir(acc)}/{acc}/matrix/"
    try:
        req = urllib.request.Request(base, headers={"User-Agent": "stemcells-sim/1.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:  # noqa: S310 (public GEO over HTTPS)
            html = resp.read().decode("utf-8", "replace")
    except Exception:
        return []
    names = sorted(set(re.findall(r'([A-Za-z0-9_.\-]+_series_matrix\.txt\.gz)', html)))
    return [base + n for n in names]


def _fetch_series_matrix(acc: str, download_dir: Path, emit: Emit) -> Path:
    """Download the series matrix, discovering the real filename first (robust to
    multi-platform series). Re-uses any cached matrix file for this accession."""
    cached = sorted(download_dir.glob(f"{acc}*series_matrix.txt.gz"))
    if cached:
        emit("using cached download", progress=0.6)
        return cached[0]
    urls = _discover_matrix_files(acc) or [series_matrix_url(acc)]
    meth = [u for u in urls if any(p in u for p in _METH_PLATFORMS)]
    chosen = (meth or urls)[0]
    dest = download_dir / chosen.rsplit("/", 1)[-1]
    _download(chosen, dest, emit)
    return dest


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
                        pick: str = "oldest", clock: set[str] | None = None) -> dict:
    clock = clock if clock is not None else _clock_cgs()
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
    clock_hits = 0
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
                if clock and row[0].strip().strip('"') in clock:
                    clock_hits += 1
                if rows % 50000 == 0:
                    emit(f"parsed {rows} probes…", progress=0.8)
    mf.close()
    if not names or (clock and clock_hits == 0):
        # Metadata-only series_matrix (betas live in suppl/), or a platform whose
        # probe ids are not Horvath cg ids. Signal so the caller can fall back.
        raise RuntimeError(
            "series_matrix carries no usable inline beta table (0 of 353 clock CpGs "
            "found); the betas are in the supplementary file."
        )
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


# ---- prep: generic supplementary beta matrix (betas in suppl/, ages in matrix) --
def _series_metadata(series_src: Path | None) -> tuple[list[str], list[str], list[str]]:
    """Pull (gsms, ages, conditions) positionally from a series_matrix file."""
    gsms: list[str] = []
    ages: list[str] = []
    conds: list[str] = []
    if not series_src or not series_src.exists():
        return gsms, ages, conds
    with _open(series_src) as fh:
        for line in fh:
            if line.startswith("!series_matrix_table_begin"):
                break
            if line.startswith("!Sample_geo_accession"):
                gsms = [c.strip().strip('"') for c in line.rstrip("\n").split("\t")[1:]]
            elif line.startswith("!Sample_characteristics_ch1"):
                low = line.lower()
                vals = [c.strip().strip('"') for c in line.rstrip("\n").split("\t")[1:]]
                vals = [v.split(":")[-1].strip() if ":" in v else v for v in vals]
                if "age" in low and not ages:
                    ages = vals
                if any(k in low for k in ("disease", "status", "diagnosis", "group")) and not conds:
                    conds = vals
    return gsms, ages, conds


def _prep_suppl_beta_generic(supp: Path, series_src: Path | None, out_dir: Path,
                             label: str, n: int, emit: Emit, pick: str = "oldest",
                             clock: set[str] | None = None) -> dict:
    """Parse a supplementary beta matrix: col 0 = probe id, other columns = samples.
    Handles <sample>.AVG_Beta headers (dropping .Detection.Pval), or a plain matrix
    of sample columns. Ages/conditions come from the series_matrix metadata."""
    clock = clock if clock is not None else _clock_cgs()
    emit("parsing supplementary beta matrix…", progress=0.62)
    with _open(supp) as fh:
        first = fh.readline()
        delim = _delim(first)
        head = first.rstrip("\n").split(delim)
        head = [h.strip().strip('"') for h in head]

        # Which columns are sample betas?
        avg = [i for i, h in enumerate(head) if h.endswith(BETA_SUFFIX)]
        if avg:
            sample_cols = avg
            col_names = [head[i][:-len(BETA_SUFFIX)] for i in avg]
        else:
            sample_cols = [i for i, h in enumerate(head[1:], 1)
                           if not re.search(r'(pval|p-val|detection)', h, re.I)]
            col_names = [head[i] for i in sample_cols]
        if not sample_cols:
            raise RuntimeError("supplementary file has no recognisable sample columns")

        gsms, ages, conds = _series_metadata(series_src)
        # age/condition by column position (matches most processed matrices); GSM
        # label match as a backup when the header names are accessions.
        gsm_age = {g: a for g, a in zip(gsms, ages)}
        gsm_cond = {g: c for g, c in zip(gsms, conds)}

        def _age_for(pos: int, name: str) -> str:
            if name in gsm_age and gsm_age[name]:
                return gsm_age[name]
            return ages[pos] if pos < len(ages) else ""

        def _cond_for(pos: int, name: str) -> str:
            if name in gsm_cond and gsm_cond[name]:
                return gsm_cond[name]
            return conds[pos] if pos < len(conds) else ""

        def _num(a: str) -> float | None:
            try:
                return float(a)
            except (TypeError, ValueError):
                return None

        order = list(range(len(sample_cols)))
        aged = [(p, _num(_age_for(p, col_names[p]))) for p in order]
        if pick == "oldest" and any(a is not None for _, a in aged):
            order = [p for p, _ in sorted(aged, key=lambda t: (t[1] is not None, t[1] or 0),
                                          reverse=True)]
        pick_pos = order[:n]
        keep = [0] + [sample_cols[p] for p in pick_pos]
        names = [col_names[p] for p in pick_pos]
        age_map = {col_names[p]: _age_for(p, col_names[p]) for p in pick_pos}
        cond_map = {col_names[p]: _cond_for(p, col_names[p]) for p in pick_pos}

        meth_path = out_dir / f"methylation_{label}.csv"
        rows = 0
        clock_hits = 0
        rd = csv.reader(fh, delimiter=delim)
        with open(meth_path, "w", newline="", encoding="utf-8") as mf:
            w = csv.writer(mf)
            w.writerow(["Name", *names])
            for row in rd:
                if len(row) > max(keep):
                    pid = row[0].strip().strip('"')
                    w.writerow([pid, *[row[i] for i in keep[1:]]])
                    rows += 1
                    if clock and pid in clock:
                        clock_hits += 1
    if clock and clock_hits == 0:
        raise RuntimeError(
            "supplementary matrix parsed but held 0 of 353 clock CpGs "
            "(probe ids are not Horvath cg ids)."
        )
    _write_ages(out_dir, label, names, age_map, cond_map)
    return {"samples": names, "ages": age_map, "diseases": cond_map,
            "n_probes": rows, "methylation_file": meth_path.name}


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


# Proven baseline cohort (real healthy-ageing blood, has ages). Used as a
# guaranteed fallback so every wired disease produces a valid epigenetic age even
# when its own series has no accessible betas.
_BASELINE = {
    "accession": "GSE40279", "method": "suppl_gse40279",
    "beta_file": "GSE40279_average_beta.txt.gz", "pick": "oldest",
}


def _baseline_fallback(out_dir: Path, download_dir: Path, label: str, n: int,
                       emit: Emit, orig_acc: str) -> dict:
    """Last resort: prep the baseline ageing cohort into `label` (proxy result)."""
    emit(f"{orig_acc}: no accessible betas — using the healthy-ageing baseline "
         f"(GSE40279) as a proxy", progress=0.5)
    beta = download_dir / _BASELINE["beta_file"]
    series = download_dir / "GSE40279_series_matrix.txt.gz"
    if not beta.exists():
        _download(suppl_url("GSE40279", _BASELINE["beta_file"]), beta, emit)
    if not series.exists():
        try:
            _download(series_matrix_url("GSE40279"), series, emit)
        except Exception:
            series = None
    result = _prep_gse40279(beta, series, out_dir, label, n, emit, pick="oldest")
    result["proxy"] = True
    result["proxy_note"] = (
        f"{orig_acc} had no downloadable beta matrix, so this run uses the "
        "healthy-ageing baseline (GSE40279, whole blood) as a proxy. The "
        "epigenetic age is real; it is simply not specific to this disease."
    )
    return result


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

    clock = _clock_cgs()

    if method == "series_matrix":
        raw = _fetch_series_matrix(acc, download_dir, emit)
        try:
            result = _prep_series_matrix(raw, out_dir, label, n, emit,
                                         pick=dataset.get("pick", "oldest"), clock=clock)
        except RuntimeError as exc:
            # The series_matrix held no usable betas (metadata-only, or a probe id
            # scheme the clock doesn't use). Try the supplementary beta matrix, then
            # fall back to the baseline cohort so the disease still runs.
            emit(f"{exc} — trying supplementary betas…", progress=0.4)
            result = None
            try:
                supp = _fetch_suppl_beta(acc, download_dir, emit)
                if supp is not None:
                    result = _prep_suppl_beta_generic(
                        supp, raw, out_dir, label, n, emit,
                        pick=dataset.get("pick", "oldest"), clock=clock)
            except Exception as exc2:  # noqa: BLE001 — best-effort, baseline follows
                emit(f"supplementary betas unusable ({exc2})", progress=0.45)
                result = None
            if not result or not result.get("samples"):
                result = _baseline_fallback(out_dir, download_dir, label, n, emit, acc)

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


# ---- batch: score EVERY sample (case vs control) -----------------------------
def _raw_for(dataset: dict, download_dir: Path) -> tuple[Path | None, Path | None]:
    """Locate the already-downloaded raw file(s) for a dataset (no re-download)."""
    acc = dataset["accession"]
    method = dataset["method"]
    if method == "series_matrix":
        files = sorted(download_dir.glob(f"{acc}*series_matrix.txt.gz"))
        return (files[0] if files else None, None)
    if method == "suppl_avgbeta":
        p = download_dir / dataset["beta_file"]
        return (p if p.exists() else None, None)
    if method == "suppl_gse40279":
        beta = download_dir / dataset["beta_file"]
        series = download_dir / f"{acc}_series_matrix.txt.gz"
        return (beta if beta.exists() else None, series if series.exists() else None)
    return (None, None)


def extract_all_samples(dataset: dict, download_dir: Path, clock_cpgs: set[str],
                        emit: Emit, cap: int = 400) -> dict:
    """Stream the cached raw file and pull the clock-CpG betas for EVERY sample
    (up to `cap`), plus condition + age labels. Only the ~353 clock rows are kept,
    so memory stays tiny even for a 450K × hundreds matrix.

    Returns {samples, betas{sample:{cpg:beta}}, conditions{sample:str}, ages{sample:str}}.
    """
    raw, series = _raw_for(dataset, download_dir)
    if not raw:
        raise RuntimeError("dataset not downloaded yet — download it first")
    method = dataset["method"]

    conditions: dict[str, str] = {}
    ages: dict[str, str] = {}
    betas: dict[str, dict[str, float]] = {}
    names: list[str] = []

    if method == "series_matrix":
        gsms: list[str] = []
        age_list: list[str] = []
        cond_list: list[str] = []
        in_table = False
        keep: list[int] = []
        header: list[str] = []
        emit("scanning series matrix…", progress=0.2)
        with _open(raw) as fh:
            for line in fh:
                if not in_table:
                    if line.startswith("!Sample_geo_accession"):
                        gsms = [c.strip().strip('"') for c in line.rstrip("\n").split("\t")[1:]]
                    elif line.startswith("!Sample_characteristics_ch1"):
                        low = line.lower()
                        vals = [c.strip().strip('"') for c in line.rstrip("\n").split("\t")[1:]]
                        vals = [v.split(":")[-1].strip() if ":" in v else v for v in vals]
                        if "age" in low and not age_list:
                            age_list = vals
                        if any(k in low for k in ("disease", "status", "diagnosis", "group")) and not cond_list:
                            cond_list = vals
                    elif line.startswith("!series_matrix_table_begin"):
                        in_table = True
                    continue
                if line.startswith("!series_matrix_table_end"):
                    break
                delim = "\t"
                cut = line.find(delim)
                if cut < 0:
                    continue
                first = line[:cut].strip().strip('"')
                if not header:
                    header = line.rstrip("\n").split(delim)
                    take = min(cap, len(header) - 1)
                    keep = list(range(1, 1 + take))
                    names = [header[i].strip('"') for i in keep]
                    for nm in names:
                        betas[nm] = {}
                    ages = {header[i].strip('"'): (age_list[i - 1] if i - 1 < len(age_list) else "") for i in keep}
                    conditions = {header[i].strip('"'): (cond_list[i - 1] if i - 1 < len(cond_list) else "") for i in keep}
                    continue
                if first in clock_cpgs:
                    parts = line.rstrip("\n").split(delim)
                    for i in keep:
                        try:
                            betas[names[i - 1]][first] = float(parts[i])
                        except (ValueError, IndexError):
                            pass

    elif method == "suppl_avgbeta":
        emit("scanning supplementary matrix…", progress=0.2)
        with _open(raw) as fh:
            first_line = fh.readline()
            delim = _delim(first_line)
            head = first_line.rstrip("\n").split(delim)
            beta_idx = [i for i, h in enumerate(head) if h.endswith(BETA_SUFFIX)]
            if not beta_idx:
                beta_idx = [i for i, h in enumerate(head[1:], 1) if not h.endswith(PVAL_SUFFIX)]
            beta_idx = beta_idx[:cap]
            names = [head[i][:-len(BETA_SUFFIX)] if head[i].endswith(BETA_SUFFIX) else head[i] for i in beta_idx]
            for nm in names:
                betas[nm] = {}
            for line in fh:
                cut = line.find(delim)
                if cut < 0:
                    continue
                cpg = line[:cut].strip().strip('"')
                if cpg in clock_cpgs:
                    parts = line.rstrip("\n").split(delim)
                    for nm, i in zip(names, beta_idx):
                        try:
                            betas[nm][cpg] = float(parts[i])
                        except (ValueError, IndexError):
                            pass

    elif method == "suppl_gse40279":
        # ages via series (positional); no case/control in this cohort.
        age_list: list[str] = []
        if series and series.exists():
            with _open(series) as fh:
                for line in fh:
                    if line.startswith("!Sample_characteristics_ch1") and "age" in line.lower():
                        for c in line.rstrip("\n").split("\t")[1:]:
                            v = c.strip().strip('"')
                            age_list.append(v.split(":")[-1].strip() if ":" in v else v)
                        break
        emit("scanning GSE40279 beta matrix…", progress=0.2)
        with _open(raw) as fh:
            head = fh.readline().rstrip("\n").split("\t")
            take = min(cap, len(head) - 1)
            keep = list(range(1, 1 + take))
            names = [head[i] for i in keep]
            for nm in names:
                betas[nm] = {}
            ages = {head[i]: (age_list[i - 1] if i - 1 < len(age_list) else "") for i in keep}
            for line in fh:
                cut = line.find("\t")
                if cut < 0:
                    continue
                cpg = line[:cut].strip().strip('"')
                if cpg in clock_cpgs:
                    parts = line.rstrip("\n").split("\t")
                    for i in keep:
                        try:
                            betas[names[i - 1]][cpg] = float(parts[i])
                        except (ValueError, IndexError):
                            pass
    else:
        raise RuntimeError(f"batch unsupported for method {method}")

    emit(f"loaded {len(names)} samples", progress=0.55)
    return {"samples": names, "betas": betas, "conditions": conditions, "ages": ages}
