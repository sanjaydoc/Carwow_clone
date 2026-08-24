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

```bash
cd simulator-backend
python3.12 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                 # then edit paths if needed
uvicorn app.main:app --reload --port 8000
# open http://localhost:8000  (API docs at http://localhost:8000/docs)
```

Or use the helper: `./run.sh` (Linux/macOS) — see `run.sh`.

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
