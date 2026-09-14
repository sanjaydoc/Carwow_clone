# Epigenetic-clock validation benchmark

`bench-clock.ts` validates the simulator's epigenetic clock by reusing the **exact
production code** (`predict` from `src/sim/pipeline.ts`) over a public methylation
dataset with known ages, and reporting predicted DNAm age vs chronological age
(Pearson r, MAE, median error, per-sample CSV). This is the numbers the paper needs.

## Run it (from the `client/` folder)

```
# A) with a GEO series matrix (auto-extracts ages) — turnkey for GSE40279
npx -y tsx@4 scripts/bench-clock.ts \
  --beta GSE40279_average_beta.txt.gz \
  --series-matrix GSE40279_series_matrix.txt.gz \
  --out bench_gse40279.csv

# B) with your own two-column ages file (sample_id,age)
npx -y tsx@4 scripts/bench-clock.ts --beta matrix.csv --ages ages.csv --out results.csv
```

`--beta` = a beta matrix: first column = cg id, header row = sample ids, cells =
beta (0-1, or 0-100 auto-scaled). `.gz` is fine. Output: a summary block + a
per-sample CSV (`sample, chronological_age, dnam_age, error_years, cpg_coverage`).

## Recommended validation datasets (public, have ages)
- **GSE40279** — Hannum healthy-ageing cohort, 656 samples, Illumina 450K, whole blood.
  The canonical clock-validation set. Files:
  - beta: `https://ftp.ncbi.nlm.nih.gov/geo/series/GSE40nnn/GSE40279/suppl/GSE40279_average_beta.txt.gz`
  - ages: `https://ftp.ncbi.nlm.nih.gov/geo/series/GSE40nnn/GSE40279/matrix/GSE40279_series_matrix.txt.gz`
- Any other GEO 450K/EPIC series with an `age` characteristic works the same way.

## What "good" looks like
Horvath (2013) reports **MAE ≈ 3.6 yr** on healthy cohorts and **r > 0.9**. A result in
that range on GSE40279 is the headline validation number for the software paper. CKD /
disease cohorts read epigenetically older — expect positive age acceleration, not a low MAE.

## For the paper
- Report: N, mean CpG coverage, Pearson r, MAE, median error.
- Plot: predicted DNAm age (y) vs chronological age (x) from the CSV, with the y=x line.
- State honestly: this validates the **epigenetic-age computation** (the tool's measured
  core). The reprogramming / tumorigenicity / cellular outputs are illustrative models,
  not validated here.

## Next clocks to add (strengthens the paper)
Only Horvath-2013 is implemented today. Adding **Hannum** and **PhenoAge** (same
coefficient-table pattern in `src/sim/`) and reporting cross-clock agreement removes the
"single-clock" reviewer objection.
