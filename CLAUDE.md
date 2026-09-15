# CLAUDE.md — StemCells Protocol (project memory)

This file is auto-loaded at the start of every session. It is the durable memory of
this project so no one has to re-read the whole chat history. Keep it updated when
big decisions change.

## What this project is
**StemCells Protocol** — a stem-cell / regenerative-medicine hospital website + research
tooling. It began as a Carwow car-marketplace clone and was reskinned into a
regenerative-medicine SPA. Founder: **Dr. Sanjay Anbu, MBBS** (dr.sanjay@stemcellsprotocol.com;
personal dr.sanjayanbu@gmail.com — the only admin account). Flagship therapy = **"Persona
Reversal"** (OSK partial epigenetic reprogramming; formerly named "ER-100").

Credential line to use for the founder (exact): `Founder · MBBS · (Bachelor of Medicine and
Bachelor of Surgery)` / `Regenerative Medicine & AI` / `pursuing Fellowship in Regenerative
Medicine`.

## ⚠️ Deploy flow — READ THIS FIRST
- The **live site (stemcellsprotocol.com) is served from `github.com/sanjaydoc/Stemcellsprotocol`,
  `main` branch, `/docs` folder.** NOT from carwow_clone.
- This working directory is a clone of `sanjaydoc/carwow_clone`. It has TWO remotes:
  - `origin` → sanjaydoc/carwow_clone (a parallel deploy; NOT the live domain)
  - `stemcells` → sanjaydoc/Stemcellsprotocol (**the live one**)
- Develop on branch **`claude/carwow-clone-g3lkf2`**. On every change:
  1. `cd client && npm run build` then from repo root `npm run build:pages` (regenerates `docs/`).
  2. Commit.
  3. **Push to BOTH:** `git push stemcells claude/carwow-clone-g3lkf2:main` (this is what goes
     live) AND `git push origin claude/carwow-clone-g3lkf2` (keep in sync).
- GitHub Pages runs a "pages build and deployment" action per push. Verify success via
  `curl -s "https://api.github.com/repos/sanjaydoc/Stemcellsprotocol/actions/runs?branch=main&per_page=3"`.
  Occasionally a push produces NO build (deploy falls behind main) — fix with an empty commit:
  `git commit --allow-empty -m "chore: re-trigger Pages deploy"` then push to stemcells:main.
- A background **watchdog routine** polls this hourly and auto-heals stuck/failed deploys; stay
  quiet when the newest run is success.

## Tech stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind, HashRouter SPA. Blue theme
  (#4285F4 / #2F6FE0). White neumorphic styling in many components. `docs/` is the built output.
- **Backend (no server we run):**
  - **Cloudflare Worker** `stemcells-chat` (`chat-worker/`) — powers the "De Novo AI assistant"
    chat via the **Anthropic API**; rate-limited via a KV namespace `RATE_LIMIT`; auto-deploys
    from the repo. Secrets (ANTHROPIC_API_KEY, NOTIFY_SECRET, RESEND_API_KEY, ALLOWED_ORIGINS,
    ADMIN_EMAIL) live in the Worker — **never commit secrets**.
  - **Supabase** (project `kfpjlesdojaslvrmeikt`) — Postgres + RLS for consultations, waitlist,
    sign-ups, chat logs, page_views analytics; Google auth; Resend email alerts on new
    consultation (DB webhook → Worker `/notify`).
- **PWA:** `client/public/sw.js` (cache `stemcells-vN` — bump N on shell change) + install prompt.
  Registration in `client/src/main.tsx` uses `updateViaCache:'none'` + controllerchange auto-reload
  so new deploys show without a manual hard-refresh.

## Key app architecture
- **Simulator (3 surfaces, ONE shared pipeline):** `client/src/sim/full.ts::buildRun()` produces a
  `FullRun` object; `client/src/components/SimRun.tsx` renders it as an animated step list. Both the
  **manual Simulator page** and the **AI chat** render through these, so adding a step to the shared
  path shows up in both. Pipeline (`client/src/sim/pipeline.ts`): Horvath-2013 epigenetic age →
  reprogramming (`projectRejuvenation`) / regeneration (`projectRegeneration`) → construct/exosome
  (`construct.ts`) → safety pre-screen → tumorigenicity (`tumorSafety`) → immunogenicity
  (`immune.ts`) → **cellular outcome** (`cell.ts`, variant-informed pathway model — illustrative,
  NOT a molecular whole-cell sim). Modality: `Age Rejuvenation` = reprogramming (OSK); everything
  else = cell therapy (MSC/exosome). PDF export: `sim/pdf.ts` (jsPDF; all drawn text runs through a
  CP1252 sanitizer because built-in fonts mangle non-Latin1 glyphs like β).
- **Local research simulator** (`simulator-backend/`, FastAPI Python) — runs on the founder's laptop
  (RTX 3000 6GB, 16GB RAM) with the real De-Novo-LLM for molecule generation; separate from the
  browser simulator.
- **Images:** `client/src/components/CarImage.tsx` — `BY_MODEL` maps each therapy → jpg in
  `client/public/therapy/`; infographics use object-contain, department photos object-cover;
  `IMG_VERSION` query param busts cache. Approved-rail images in `client/public/approved/`.
- **Data:** therapy catalogue in `server/src/db/therapies.js` → `scripts/gen-staticdata.mjs` →
  `client/src/api/staticData.ts`. Car-type fields repurposed (make=department, model=therapy, etc.).

## Honesty rules (non-negotiable)
- The site's simulator outputs are **illustrative model estimates**, not measured/clinical results;
  de novo molecules are unvalidated hypotheses. Never present them as cures or validated therapy.
- Keep the disclaimers the founder has approved; don't reintroduce "demo project" wording he removed.

## Separate repo: Skynet / LSM (not this working dir)
`github.com/sanjaydoc/skynet` (private) — a from-scratch 37M-param "Large Sentient Model" trained on
the founder's laptop. Goal: turn 10 capability tiles green at 37M before scaling. Capabilities 1-5
built (state-conditioning, affective m_t, self-model, metacognition, empathy); 6-10 wired
(conscience, judgment, corrigibility, temporal continuity, embodied agency); plus a bounded RSI
(recursive self-improvement) loop with a corrigibility floor + kill switch. Eval tools:
`eval_ppl`, `eval_lsm`, `probe_state`, `eval_metacog`, `eval_caps`, `rsi_loop`. Artifacts: LSM
Training Lab + LSM Architecture (claude.ai). GTA/CARLA game adapter is planned AFTER 10/10 green.

## Publication & benchmarking (the epigenetic-clock software paper)
Goal: publish the simulator's epigenetic clock as a **software paper** for academic credibility.
(That is NOT clinical/regulatory accreditation — ISO 15189 / CLIA / GMP / IRB / CDSCO-FDA is a
separate ladder.) Frame the paper honestly: only the **epigenetic-age computation is validated**;
reprogramming / tumorigenicity / immunogenicity / cellular modules are illustrative, said so.

- **Validation benchmark:** `client/scripts/bench-clock.ts` (dev-only, not in the shipped build;
  `tsconfig` include is `["src"]`). Reuses the production `predict()`. Run from `client/`:
  `npx -y tsx@4 scripts/bench-clock.ts --beta <GSE40279_average_beta.txt.gz> --series-matrix
  <GSE40279_series_matrix.txt.gz> --out results.csv`. It joins GEO samples on the **trailing numeric
  id** (matrix columns `X1001` ↔ series titles `age 67y 1001`). Docs: `client/scripts/BENCH.md`.
  **Result on GSE40279 (Hannum whole-blood, n=656, 100% coverage): Pearson r = 0.918, MAE = 4.77 yr,
  median 3.87 yr** — matches Horvath 2013 (~3.6 yr). This is the paper's headline number.
- **Manuscript files (in `paper/`):** `paper.md` (JOSS format) + `paper.bib` + `validation.png`
  (predicted-vs-actual scatter, built with **Pillow** — no matplotlib here) + `paper.pdf`
  (bioRxiv-ready, built with **reportlab**, script in scratchpad — `pandoc` is NOT installed).
  Author: **Dr. Sanjay Anbu**; affiliation **StemCells Protocol, Kilpauk, Chennai, Tamil Nadu
  600010, India**; ORCID pending (only outstanding item).
- **Tests + CI (JOSS requirement, done):** `client/scripts/clock.test.ts` (node:test, 5 tests,
  run with `npx tsx@4 --test`) + `.github/workflows/ci.yml` ("CI" workflow: `tsc -b` + the tests
  on every push/PR). Separate from the Pages "pages build and deployment" workflow.
- **Publishing venues — recommended path: ORCID → Zenodo DOI → bioRxiv preprint → JOSS.** Optional
  extras: arXiv (q-bio.GN), SoftwareX, GigaScience. Warn about predatory journals.
- **Tracker artifact: "StemCells Publication Tracker"** —
  https://claude.ai/artifact/QPQaUpgpgpR4tYRsjoX8qg (pinned; capabilities `artifact` + `db`). Holds a
  benchmarks table, publishing-venue status pills, a readiness checklist, and a dynamic **Source
  files** panel that lists the whole `manuscript` db collection. The text files are stored in the
  artifact database (collection `manuscript`, doc ids `paper_md`, `paper_bib`, `clock_test`,
  `ci_yml`). **When you change a paper file, update BOTH the repo file AND the db doc** (Artifact
  `write_db` set, if_version-pinned) so the tracker stays in sync. Binaries (PDF, figure) live only
  in the repo, not the db.
- Optional next strengthener: add **Hannum + PhenoAge** clocks (multi-clock) to remove the
  single-clock reviewer objection.

## Working style with this founder
- He is busy and dislikes long paragraphs — answer in short, scannable lines/bullets.
- He often runs commands on his own Windows laptop and pastes output back; give copy-paste-ready
  commands.
- Confirm deploys actually went live (check the Actions API), don't just assume.
