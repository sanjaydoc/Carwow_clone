import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import SimulatorLocal from './SimulatorLocal';
import { checkBackend } from '../api/simulator';

// ---- The De novo LLM pipeline stages (front-end simulation) ----------------
const PHASES = [
  { label: 'Reading digital genome', detail: 'Parsing base pairs and flagging age-related markers…' },
  { label: 'De novo LLM designing biomolecules', detail: 'Inventing novel biomolecules to reverse cellular ageing…' },
  { label: 'Multiplying biomolecules in vitro', detail: 'Culturing and amplifying to therapeutic titre…' },
  { label: 'Formulating exosome IV', detail: 'Loading biomolecules into exosomes for infusion…' },
];

// ---- deterministic pseudo-randomness so a given input is reproducible -------
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
function makeRng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const PREFIX = ['Rejuvenol', 'SenoClear', 'TeloRestore', 'MitoSpark', 'NeoGenix', 'ChronoMend', 'VitaLume', 'RegenX', 'CytoBloom', 'EpiReset'];
const SUFFIX = ['-7', '-Ω', '-Δ', '-Σ', '-X2', '-α', '-9', '-Prime', '-Δ4', '-Neo'];
const TARGET = [
  'telomere extension',
  'senescent-cell clearance',
  'mitochondrial renewal',
  'epigenetic reprogramming',
  'stem-cell reactivation',
  'collagen & elastin restoration',
  'NAD⁺ pathway boost',
  'autophagy enhancement',
];

interface Molecule {
  name: string;
  target: string;
  potency: number;
}
interface Report {
  genomeId: string;
  markers: number;
  molecules: Molecule[];
  bioAgeYears: number;
  stemReactivation: number;
  exosomeDose: number;
}

function buildReport(seedKey: string): Report {
  const rng = makeRng(hashStr(seedKey) || 12345);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];

  const molecules: Molecule[] = [];
  const used = new Set<string>();
  while (molecules.length < 4) {
    const name = `${pick(PREFIX)}${pick(SUFFIX)}`;
    if (used.has(name)) continue;
    used.add(name);
    molecules.push({ name, target: pick(TARGET), potency: 72 + Math.floor(rng() * 27) });
  }

  return {
    genomeId: `SCP-${100000 + Math.floor(rng() * 899999)}`,
    markers: 120 + Math.floor(rng() * 180),
    molecules,
    bioAgeYears: 8 + Math.floor(rng() * 11), // 8–18 years younger
    stemReactivation: 42 + Math.floor(rng() * 44), // 42–85 %
    exosomeDose: 15 + Math.floor(rng() * 16), // 15–30 billion
  };
}

type Status = 'idle' | 'ready' | 'running' | 'done';

export default function Simulator() {
  const [status, setStatus] = useState<Status>('idle');
  const [fileName, setFileName] = useState('');
  const [fileMeta, setFileMeta] = useState('');
  const [phase, setPhase] = useState(-1);
  const [log, setLog] = useState<string[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const timers = useRef<number[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // If the local research backend is reachable (only on the user's laptop),
  // switch to the real pipeline. On the public site this stays false, so the
  // illustrative demo below renders unchanged.
  const [backendReady, setBackendReady] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    checkBackend().then((ok) => alive && setBackendReady(ok));
    return () => {
      alive = false;
    };
  }, []);

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };

  const onFile = (f: File | null) => {
    if (!f) return;
    setFileName(f.name);
    setFileMeta(`${(f.size / 1024).toFixed(0)} KB · uploaded`);
    setStatus('ready');
    setReport(null);
  };

  const useSample = () => {
    setFileName('sample-genome.dna');
    setFileMeta('3.2 GB · reference sample');
    setStatus('ready');
    setReport(null);
  };

  const run = () => {
    clearTimers();
    setStatus('running');
    setPhase(0);
    setLog([]);
    setReport(null);
    const seedKey = fileName + fileMeta;

    PHASES.forEach((p, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setPhase(i);
          setLog((l) => [...l, `▸ ${p.label}`]);
        }, i * 1200)
      );
    });
    timers.current.push(
      window.setTimeout(() => {
        setReport(buildReport(seedKey));
        setStatus('done');
        setPhase(PHASES.length);
        setLog((l) => [...l, '✓ Personalised protocol ready']);
      }, PHASES.length * 1200)
    );
  };

  const reset = () => {
    clearTimers();
    setStatus('idle');
    setFileName('');
    setFileMeta('');
    setPhase(-1);
    setLog([]);
    setReport(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const progress = status === 'done' ? 100 : status === 'running' ? ((phase + 1) / PHASES.length) * 100 : 0;

  // Real pipeline when the local backend is up; otherwise the illustrative demo.
  if (backendReady) return <SimulatorLocal />;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink-900">
        <div className="absolute -right-24 top-0 h-96 w-96 rounded-full bg-clay-500/20 blur-3xl" />
        <div className="container-x relative py-12 sm:py-16">
          <span className="chip bg-white/10 text-white"><Icon name="brain" className="h-3.5 w-3.5" /> De novo LLM</span>
          <h1 className="mt-4 font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-white sm:text-6xl">
            Protocol <span className="text-clay-500">Simulator</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/70">
            Upload your digital DNA and our De novo LLM invents novel biomolecules to reverse cellular ageing —
            reawakening dormant, aged stem cells into younger ones — then formulates them into an exosome IV.
          </p>
        </div>
      </section>

      <section className="container-x grid gap-8 py-12 lg:grid-cols-[1fr_1.2fr]">
        {/* Left: input + pipeline */}
        <div className="space-y-6">
          {/* Upload */}
          <div className="card p-6">
            <h2 className="font-display text-lg font-bold text-ink-900">1 · Digital DNA input</h2>
            <label
              className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink-900/15 bg-cream-100 px-4 py-8 text-center transition hover:border-clay-400"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onFile(e.dataTransfer.files?.[0] ?? null);
              }}
            >
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
              <span className="icon-tile h-12 w-12"><Icon name="dna" className="h-6 w-6" /></span>
              <span className="mt-3 font-semibold text-ink-900">
                {fileName ? fileName : 'Drop your digital DNA file or browse'}
              </span>
              <span className="mt-1 text-sm text-ink-700/60">
                {fileMeta || '.dna / .vcf / .fasta — nothing is uploaded to a server'}
              </span>
            </label>
            <div className="mt-3 flex items-center justify-between text-sm">
              <button onClick={useSample} className="btn-ghost px-0 text-clay-600">
                or use a sample genome
              </button>
              {status !== 'idle' && (
                <button onClick={reset} className="text-ink-700/60 hover:text-ink-900">
                  Reset
                </button>
              )}
            </div>

            <button
              onClick={run}
              disabled={status === 'idle' || status === 'running'}
              className="btn-primary mt-5 w-full justify-center py-3 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {status === 'running' ? 'Simulating…' : status === 'done' ? 'Run again' : 'Run Protocol Simulator'}
            </button>
          </div>

          {/* Pipeline */}
          <div className="card p-6">
            <h2 className="font-display text-lg font-bold text-ink-900">2 · De novo LLM pipeline</h2>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-cream-300">
              <div
                className="h-full rounded-full bg-clay-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <ol className="mt-5 space-y-3">
              {PHASES.map((p, i) => {
                const state = status === 'idle' || status === 'ready'
                  ? 'pending'
                  : i < phase || status === 'done'
                    ? 'done'
                    : i === phase
                      ? 'active'
                      : 'pending';
                return (
                  <li key={p.label} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                        state === 'done'
                          ? 'bg-clay-500 text-white'
                          : state === 'active'
                            ? 'bg-clay-100 text-clay-700 ring-2 ring-clay-400'
                            : 'bg-cream-300 text-ink-700/50'
                      }`}
                    >
                      {state === 'done' ? '✓' : i + 1}
                    </span>
                    <div>
                      <p className={`font-semibold ${state === 'pending' ? 'text-ink-700/50' : 'text-ink-900'}`}>
                        {p.label}
                        {state === 'active' && <span className="ml-1 animate-pulse text-clay-500">●</span>}
                      </p>
                      {state === 'active' && <p className="text-sm text-ink-700/60">{p.detail}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* Right: output */}
        <div className="card p-6 lg:p-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-ink-900">3 · Personalised protocol</h2>
            {report && <span className="chip bg-clay-50 text-clay-700">Simulated output</span>}
          </div>

          {!report ? (
            status === 'running' ? (
              <div className="mt-8 grid place-items-center rounded-2xl bg-ink-900 py-14 text-center">
                <DnaHelix />
                <p className="mt-8 max-w-xs text-white/70">The De novo LLM is inventing your biomolecules…</p>
                {log.length > 0 && (
                  <div className="mt-6 w-full max-w-sm space-y-1 rounded-xl bg-black/40 p-4 text-left font-mono text-xs text-clay-300 ring-1 ring-white/10">
                    {log.map((l, i) => (
                      <div key={i}>{l}</div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-8 grid place-items-center rounded-2xl bg-cream-100 py-20 text-center">
                <span className="icon-tile h-16 w-16"><Icon name="dna" className="h-8 w-8" /></span>
                <p className="mt-4 max-w-xs text-ink-700/60">
                  Upload your digital DNA and run the simulator to generate your protocol.
                </p>
              </div>
            )
          ) : (
            <div className="mt-6 space-y-6 animate-fade-up">
              {/* Summary */}
              <div className="flex flex-wrap gap-3">
                <Stat label="Genome ID" value={report.genomeId} />
                <Stat label="Age markers" value={String(report.markers)} />
                <Stat label="Exosome dose" value={`${report.exosomeDose}B`} />
              </div>

              {/* Bio-age reversal */}
              <div className="rounded-2xl bg-ink-900 p-6 text-white">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm text-white/60">Projected biological age reversal</p>
                    <p className="font-display text-4xl font-extrabold text-clay-400">
                      −{report.bioAgeYears} <span className="text-2xl">years</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white/60">Dormant stem cells reactivated</p>
                    <p className="font-display text-4xl font-extrabold text-clay-400">{report.stemReactivation}%</p>
                  </div>
                </div>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-clay-500" style={{ width: `${report.stemReactivation}%` }} />
                </div>
              </div>

              {/* Molecules */}
              <div>
                <h3 className="font-display text-lg font-bold text-ink-900">Novel biomolecules invented</h3>
                <div className="mt-3 space-y-2">
                  {report.molecules.map((m) => (
                    <div key={m.name} className="flex items-center justify-between rounded-xl border border-cream-300 px-4 py-3">
                      <div>
                        <p className="font-mono font-bold text-ink-900">{m.name}</p>
                        <p className="text-sm text-ink-700/60 capitalize">{m.target}</p>
                      </div>
                      <span className="chip bg-clay-50 text-clay-700">{m.potency}% potency</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="flex flex-col gap-3 border-t border-cream-300 pt-5 sm:flex-row">
                <Link to="/consultation" className="btn-primary flex-1 justify-center py-3">
                  Book your exosome IV
                </Link>
                <Link to="/browse?make=Age%20Rejuvenation" className="btn-outline flex-1 justify-center py-3">
                  Explore therapies
                </Link>
              </div>
              <p className="text-xs italic text-ink-700/50">
                Output is generated by the simulator to illustrate the platform flow; a specialist confirms every
                protocol before treatment.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ---------- WHAT IS DIGITAL DNA — SAMPLE & SEQUENCING ---------- */}
      <section className="container-x pb-16">
        <div className="rounded-3xl bg-cream-200 p-6 sm:p-10">
          <span className="chip bg-clay-100 text-clay-700"><Icon name="dna" className="h-3.5 w-3.5" /> Your digital DNA</span>
          <h2 className="mt-4 font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
            What we need to read from you
          </h2>
          <p className="mt-3 max-w-3xl text-ink-700/80">
            To engineer a therapy for <b>your</b> body, we first have to read your biology. Two data
            layers matter — and they are not the same test.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <span className="icon-tile h-11 w-11"><Icon name="dish" className="h-6 w-6" /></span>
                <div>
                  <h3 className="font-display text-lg font-bold text-ink-900">Methylation sequencing</h3>
                  <span className="text-xs font-bold uppercase tracking-wide text-clay-600">Essential</span>
                </div>
              </div>
              <p className="mt-3 text-sm text-ink-700/75">
                Reads your <b>epigenome</b> — the chemical marks on top of your DNA. Your biological
                (epigenetic) age and every age-reversal target are defined here. This is what the
                therapy actually acts on.
              </p>
            </div>
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <span className="icon-tile h-11 w-11"><Icon name="dna" className="h-6 w-6" /></span>
                <div>
                  <h3 className="font-display text-lg font-bold text-ink-900">Whole genome sequencing</h3>
                  <span className="text-xs font-bold uppercase tracking-wide text-ink-700/50">Recommended</span>
                </div>
              </div>
              <p className="mt-3 text-sm text-ink-700/75">
                Reads your <b>genome</b> — the A, T, G, C sequence. Used for safety screening before
                treatment and for deeper, per-DNA personalisation. Not needed just to read the
                epigenetic clock, but strongly recommended.
              </p>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[420px] overflow-hidden rounded-2xl bg-white text-left text-sm">
              <thead>
                <tr className="bg-cream-100 text-ink-700/60">
                  <th className="px-5 py-3 font-semibold">Tier</th>
                  <th className="px-5 py-3 font-semibold">What is sequenced</th>
                  <th className="px-5 py-3 font-semibold">Illustrative cost (India)</th>
                </tr>
              </thead>
              <tbody className="text-ink-900">
                <tr className="border-t border-cream-300">
                  <td className="px-5 py-3 font-bold">Minimum viable</td>
                  <td className="px-5 py-3">Methylation only — EPIC array (~850k CpG sites)</td>
                  <td className="px-5 py-3 font-semibold">₹15,000 – ₹30,000</td>
                </tr>
                <tr className="border-t border-cream-300">
                  <td className="px-5 py-3 font-bold">Full / safer</td>
                  <td className="px-5 py-3">Methylation (WGBS / EM-seq) + WGS for safety &amp; personalisation</td>
                  <td className="px-5 py-3 font-semibold">₹80,000 – ₹1,50,000+</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs italic text-ink-700/50">
            Costs are illustrative early-2026 retail estimates and vary by lab; this is educational
            information, not a quote or medical advice.
          </p>
        </div>
      </section>
    </div>
  );
}

// Animated spinning DNA double-helix (pure CSS/Tailwind, no libraries).
function DnaHelix() {
  const bars = Array.from({ length: 16 });
  return (
    <div className="flex h-24 items-center justify-center gap-[7px] [perspective:900px]">
      {bars.map((_, i) => (
        <div
          key={i}
          className="animate-dna-spin relative h-full w-[3px] [transform-style:preserve-3d]"
          style={{ animationDelay: `${i * -0.13}s` }}
        >
          {/* the base-pair rung */}
          <span className="absolute left-1/2 top-1/2 h-full w-px -translate-x-1/2 -translate-y-1/2 bg-white/20" />
          {/* the two backbone nodes */}
          <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-clay-500 shadow-[0_0_8px] shadow-clay-500/60" />
          <span className="absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-cyan-400 shadow-[0_0_8px] shadow-cyan-400/60" />
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-cream-100 px-4 py-3">
      <p className="text-xs text-ink-700/60">{label}</p>
      <p className="font-display text-lg font-bold text-ink-900">{value}</p>
    </div>
  );
}
