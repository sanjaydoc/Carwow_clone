# StemCells Protocol — Simulator Backend (local research app)

> **Runs on your laptop only.** Nothing here is deployed to the public site.
> The public stemcellsprotocol.com Simulator stays the illustrative demo; this
> is the *real* pipeline you run locally until a server is available.

Ingests **real** whole-genome (SNP/VCF) + **methylation** data, computes a
genuine **epigenetic age** and target CpG sites, assembles the known **OSK
Tet-On** vector (Track A), and drives your **De-Novo-LLM** repo to generate
**novel candidate molecules** (Track B). Your genomic data never leaves the
machine.

## What is real vs illustrative

| Stage | Status |
| --- | --- |
| Parse genotype + methylation | **Real** |
| Epigenetic age (Horvath / Hannum) + target CpGs | **Real** |
| OSK Tet-On construct assembly (Track A) | **Real assembly of known parts** — a research construct, not clinical-grade |
| Novel molecule generation (Track B, De-Novo-LLM) | **Real generation**, but candidates are **research hypotheses — not validated or synthesizable therapeutics** |
| Physical synthesis / wet-lab validation | **Out of scope** (needs a lab) |

## Requirements

- Python **3.12** (De-Novo-LLM needs it for CUDA/RDKit wheels)
- The **De-Novo-LLM** repo cloned locally (for Track B). Point to it with
  `DENOVO_LLM_DIR` (see `.env.example`). Track A + epigenetic age work without it.
- Optional: NVIDIA GPU (developed against RTX 3000, 6 GB) for real generation;
  CPU works for everything except large generations.

## Quick start

**1. Backend (the pipeline):**
```bash
cd simulator-backend
python3.12 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                 # edit DENOVO_LLM_DIR for Track B
uvicorn app.main:app --reload --port 8000
```

**2. The Simulator UI** (built once, then served by the backend):
```bash
cd ../client
npm install
npm run build:local                  # → client/dist-local, served by the backend
```
Now open **http://localhost:8000** — the Simulator page detects the backend and
switches to the **live** pipeline (upload methylation → real epigenetic age →
targets → construct → molecules). Refresh/redeploy the backend to pick up a new
UI build.

**Without building the UI**, you can still drive everything from the built-in
**API docs at http://localhost:8000/docs** (upload files, run `/analyze`,
`/construct`, `/design`).

Helper: `./run.sh` (Linux/macOS) starts the backend.

### Get real data to test with

**A tiny built-in fixture** ships in `data/samples/` so it works before you
download anything (Horvath's example — predicted vs real age 39→39.8, 28→26.4).

**Run a real person (GSE40279 — Hannum et al., methylation + ages):**
1. Download both files:
   - beta matrix: `https://ftp.ncbi.nlm.nih.gov/geo/series/GSE40nnn/GSE40279/suppl/GSE40279_average_beta.txt.gz`
   - ages/meta: `https://ftp.ncbi.nlm.nih.gov/geo/series/GSE40nnn/GSE40279/matrix/GSE40279_series_matrix.txt.gz`
2. The beta matrix is ~2 GB (656 people) — **don't upload it whole.** Slice out a
   few samples + their ages with the helper:
   ```bash
   python scripts/prep_gse40279.py --beta GSE40279_average_beta.txt.gz \
       --series GSE40279_series_matrix.txt.gz --n 3
   ```
   This writes `data/samples/methylation_gse40279.csv` (small) and
   `data/samples/ages_gse40279.csv` (the ages to type in).
3. In the Simulator, upload `methylation_gse40279.csv`, pick a sample, enter its
   age from `ages_gse40279.csv`, and Compute. You'll see the real epigenetic age
   for that actual person, then targets → construct → molecules.

**Genotype (optional, patient-style upload):** grab any raw file from
**openSNP** (`https://opensnp.org/genotypes`) — it's small (~20 MB) and uploads
directly; the parser handles 23andMe/Ancestry/VCF formats.

## Layout

```
app/
  main.py          # FastAPI app: API + serves the local UI (D1)
  config.py        # settings / paths / "laptop mode" flags (D1)
  jobs.py          # async job runner + live progress (SSE) (D1)
  ingest/          # parse genotype + methylation (D2)
  epiage/          # epigenetic clocks + target discovery (D3)
  construct/       # OSK Tet-On assembler — Track A (D9)
  design/          # De-Novo-LLM adapter — Track B (D4)
  scoring/         # RDKit + novelty + ranking (D5)
  report/          # JSON / CSV / PDF export (D6)
  api/             # REST routes
data/samples/      # tiny fixtures for smoke tests
```
