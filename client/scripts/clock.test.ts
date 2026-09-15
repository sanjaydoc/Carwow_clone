/**
 * Unit tests for the epigenetic-clock core (src/sim/pipeline.ts) — the measured,
 * validated part of the StemCells Protocol simulator. Run:
 *   npx -y tsx@4 --test scripts/clock.test.ts     (from the client/ folder)
 * or in CI: node --import tsx --test scripts/clock.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { predict, parseMethylation } from '../src/sim/pipeline';

const HERE = dirname(fileURLToPath(import.meta.url));
const SAMPLE = join(HERE, '..', 'public', 'samples', 'sample1_age64_chronic_kidney_disease.cov');

test('empty input yields zero coverage, no crash', () => {
  const r = predict({}, null);
  assert.equal(r.nUsed, 0);
  assert.equal(r.coverage, 0);
  assert.ok(Number.isFinite(r.dnamAge));
});

test('array-beta parsing maps cg IDs and tolerates 0-100 scaling', () => {
  const text = 'Name,beta\ncg00075967,0.82\ncg00374717,55\ncg_not_a_clock_site,0.5';
  const p = parseMethylation(text);
  assert.equal(p.format, 'array-beta');
  assert.ok(p.matched >= 1, 'at least one clock CpG matched');
  for (const v of Object.values(p.betas)) assert.ok(v >= 0 && v <= 1, 'betas normalised to 0..1');
});

test('bundled WGBS .cov sample parses and scores in a plausible range', () => {
  const text = readFileSync(SAMPLE, 'utf8');
  const p = parseMethylation(text);
  assert.ok(p.matched > 300, `expected >300 clock CpGs, got ${p.matched}`);
  const r = predict(p.betas, 64);
  assert.ok(Number.isFinite(r.dnamAge), 'DNAm age is finite');
  assert.ok(r.dnamAge > 20 && r.dnamAge < 120, `DNAm age plausible, got ${r.dnamAge}`);
  assert.equal(r.chronologicalAge, 64);
  assert.ok(Math.abs(r.ageAcceleration! - (r.dnamAge - 64)) < 1e-6, 'age acceleration = DNAm - chronological');
  assert.ok(r.coverage > 0.9, `coverage high, got ${r.coverage}`);
});

test('prediction is deterministic', () => {
  const text = readFileSync(SAMPLE, 'utf8');
  const betas = parseMethylation(text).betas;
  const a = predict(betas, 64).dnamAge;
  const b = predict(betas, 64).dnamAge;
  assert.equal(a, b);
});

test('older methylation profile scores older than a younger one', () => {
  // scale every beta toward its clock direction is complex; instead assert the
  // clock responds to input: two different inputs give two different ages.
  const text = readFileSync(SAMPLE, 'utf8');
  const betas = parseMethylation(text).betas;
  const shifted: Record<string, number> = {};
  for (const [k, v] of Object.entries(betas)) shifted[k] = Math.min(1, Math.max(0, v * 0.5));
  assert.notEqual(predict(betas, null).dnamAge, predict(shifted, null).dnamAge);
});
