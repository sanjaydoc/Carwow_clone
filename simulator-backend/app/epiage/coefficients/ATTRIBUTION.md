# Clock coefficient sources

**`horvath2013.csv`** — the official supplementary coefficient table (Additional
File 3) from:

> Horvath, S. (2013). *DNA methylation age of human tissues and cell types.*
> Genome Biology 14, R115. https://doi.org/10.1186/gb-2013-14-10-r115

Open-access (Creative Commons). Columns include `CpGmarker`,
`CoefficientTraining` (the 353 elastic-net coefficients + `(Intercept)`), and
gene annotation (`Symbol`, `Chr`) which we reuse for target discovery.

The example methylation data + ages in `../../data/samples/` are derived from
Horvath's published example dataset (same source), sliced to the clock's CpGs
for a compact, offline validation fixture.

These are used to compute a **real** epigenetic age. Everything downstream
(molecule generation) remains an illustrative research hypothesis.
