import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import type { Car } from '../types';
import Icon from '../components/Icon';
import { synthesize, cellClassOf, type KitRecipe } from '../synth/formulations';

// Genome samples reused from the Simulator (on-device, nothing uploaded).
const SAMPLES = [
  { href: `${import.meta.env.BASE_URL}samples/sample1_age64_chronic_kidney_disease.cov`, label: 'Age 64 · CKD genome', age: 64 },
  { href: `${import.meta.env.BASE_URL}samples/sample2_age47_multiple_sclerosis.cov`, label: 'Age 47 · MS genome', age: 47 },
];
const GENOME_EXT = /\.(csv|cov|tsv|txt|vcf|bedgraph|bed)$/i;

function hashName(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return `PT-${((h >>> 0) % 900000 + 100000)}`;
}

export default function Synthesizer() {
  const [cars, setCars] = useState<Car[]>([]);
  const [therapyId, setTherapyId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [genomeName, setGenomeName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [error, setError] = useState('');

  const [phase, setPhase] = useState<'idle' | 'printing' | 'done'>('idle');
  const [progress, setProgress] = useState(0); // 0..1
  const rafRef = useRef<number | null>(null);
  const recipeRef = useRef<KitRecipe | null>(null);
  const [recipe, setRecipe] = useState<KitRecipe | null>(null);

  useEffect(() => {
    api.getCars({ limit: 300 }).then(({ cars }) => setCars(cars)).catch(() => setError('Could not load the therapy catalogue.'));
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const selected = useMemo(() => cars.find((c) => c.id === therapyId) || null, [cars, therapyId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? cars.filter((c) => `${c.make} ${c.model}`.toLowerCase().includes(q)) : cars;
    return list.slice(0, 60);
  }, [cars, query]);

  // live preview recipe (before printing) so the operator sees the formulation
  const preview = useMemo(() => {
    if (!selected) return null;
    return synthesize(selected, { personalized: !!patientId, patientId: patientId || undefined, age });
  }, [selected, patientId, age]);

  const loadGenomeFile = async (f: File | null) => {
    if (!f) return;
    if (!GENOME_EXT.test(f.name)) { setError('Choose a .csv / .cov / .vcf / .tsv genome or methylation file.'); return; }
    setError(''); setGenomeName(f.name); setPatientId(hashName(f.name + f.size)); setAge(null);
  };
  const loadSample = async (s: typeof SAMPLES[number]) => {
    setError(''); setGenomeName(s.label); setPatientId(hashName(s.href)); setAge(s.age);
  };
  const clearGenome = () => { setGenomeName(''); setPatientId(''); setAge(null); };

  const startPrint = () => {
    if (!selected) { setError('Select a therapy formulation first.'); return; }
    setError('');
    const r = synthesize(selected, { personalized: !!patientId, patientId: patientId || undefined, age });
    recipeRef.current = r; setRecipe(r);
    setPhase('printing'); setProgress(0);

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setProgress(1); setPhase('done'); return; }

    const durationMs = 9000; // fixed pleasant demo length regardless of estSeconds
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs);
      setProgress(p);
      if (p < 1) { rafRef.current = requestAnimationFrame(tick); }
      else { setPhase('done'); setTimeout(() => document.getElementById('kit-out')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); }
    };
    rafRef.current = requestAnimationFrame(tick);
    setTimeout(() => document.getElementById('printer')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const reset = () => { setPhase('idle'); setProgress(0); setRecipe(null); recipeRef.current = null; };

  // which stage is active from progress
  const stages = recipe?.stages ?? [];
  const stageIdx = phase === 'done' ? stages.length - 1 : Math.min(stages.length - 1, Math.floor(progress * stages.length));

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink-900">
        <div className="absolute -right-24 top-0 h-96 w-96 rounded-full bg-clay-500/20 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-72 w-72 rounded-full bg-clay-500/10 blur-3xl" />
        <div className="container-x relative py-12 sm:py-16">
          <span className="chip bg-white/10 text-white"><Icon name="flask" className="h-3.5 w-3.5" /> Universal Synthesizer · investor demo</span>
          <h1 className="mt-4 font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-white sm:text-6xl">
            The <span className="text-clay-500">Synthesizer</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/70">
            The software that drives the StemCells Protocol 3D bio-printer — it prints both the <b className="text-white">organic</b> matter
            (living MSC, exosomes or iPSC-derived cells, grown from the patient's genome) and the <b className="text-white">inorganic</b> kit
            (vial, delivery device, disposables). Pick a formulation, load a genome, and press <b className="text-white">Print</b>.
          </p>
        </div>
      </section>

      <section className="container-x py-10">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
          {/* 1 · Formulation */}
          <div className="card p-6">
            <h2 className="font-display text-lg font-bold text-ink-900">1 · Therapy formulation</h2>
            <p className="mt-1 text-sm text-ink-700/60">Pulled from the Protocol Standard catalogue — {cars.length} formulations.</p>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search therapies…"
              className="mt-4 w-full rounded-xl border border-ink-900/15 bg-cream-100 px-4 py-2.5 text-sm outline-none focus:border-clay-400"
            />
            <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-ink-900/10">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setTherapyId(c.id); setError(''); }}
                  className={`flex w-full items-center justify-between gap-3 border-b border-ink-900/5 px-3 py-2 text-left text-sm last:border-0 transition ${therapyId === c.id ? 'bg-clay-500/10' : 'hover:bg-cream-100'}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink-900">{c.model}</span>
                    <span className="block truncate text-xs text-ink-700/60">{c.make} · {c.body_type} · {c.transmission}</span>
                  </span>
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: `${c.accent}1a`, color: c.accent }}>{cellClassOf(c)}</span>
                </button>
              ))}
              {filtered.length === 0 && <p className="px-3 py-4 text-sm text-ink-700/50">No match.</p>}
            </div>
          </div>

          {/* 2 · Genome */}
          <div className="card p-6">
            <h2 className="font-display text-lg font-bold text-ink-900">2 · Patient genome <span className="font-normal text-ink-700/50">(optional)</span></h2>
            <p className="mt-1 text-sm text-ink-700/60">Supply a DNA-methylation / WGS file to print an <b>autologous</b> line — or skip for the allogeneic bank.</p>
            <label
              className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink-900/15 bg-cream-100 px-4 py-6 text-center transition hover:border-clay-400"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); loadGenomeFile(e.dataTransfer.files?.[0] ?? null); }}
            >
              <input type="file" className="hidden" accept=".csv,.cov,.tsv,.txt,.vcf,.bedgraph,.bed" onChange={(e) => loadGenomeFile(e.target.files?.[0] ?? null)} />
              <span className="icon-tile h-11 w-11"><Icon name="dna" className="h-6 w-6" /></span>
              <span className="mt-2 text-sm font-semibold text-ink-900">{genomeName || 'Drop genome file or browse'}</span>
              <span className="mt-0.5 text-xs text-ink-700/60">on-device — nothing is uploaded</span>
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {SAMPLES.map((s) => (
                <button key={s.href} onClick={() => loadSample(s)} className="rounded-full border border-ink-900/15 px-3 py-1.5 text-xs font-semibold text-ink-700 transition hover:border-clay-400 hover:text-clay-600">{s.label}</button>
              ))}
              {patientId && <button onClick={clearGenome} className="rounded-full bg-ink-900/5 px-3 py-1.5 text-xs font-semibold text-ink-700">Clear</button>}
            </div>
            <div className="mt-3 rounded-xl bg-cream-100 px-3 py-2 text-sm">
              {patientId
                ? <span className="font-semibold text-emerald-700">● Autologous · patient {patientId}{age ? ` · age ${age}` : ''}</span>
                : <span className="font-semibold text-ink-700/60">○ No genome — allogeneic master cell bank</span>}
            </div>
          </div>
        </div>

        {/* Formulation preview + PRINT */}
        {preview && (
          <div className="mx-auto mt-6 max-w-5xl card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink-700/50">Ready to print</p>
                <h3 className="mt-1 font-display text-xl font-extrabold text-ink-900">{preview.therapyName}</h3>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full px-2.5 py-1 font-bold" style={{ background: `${preview.accent}1a`, color: preview.accent }}>{preview.organic.cellClass}</span>
                  <span className="rounded-full bg-cream-200 px-2.5 py-1 font-semibold text-ink-700">{preview.route}</span>
                  <span className="rounded-full bg-cream-200 px-2.5 py-1 font-semibold text-ink-700">Dose {preview.organic.dose}</span>
                </div>
              </div>
              <button
                onClick={startPrint}
                disabled={phase === 'printing'}
                className="inline-flex items-center gap-2 rounded-full bg-clay-500 px-8 py-3.5 font-display text-base font-bold text-white shadow-lg transition hover:bg-clay-600 disabled:opacity-50"
              >
                <Icon name="flask" className="h-5 w-5" /> {phase === 'printing' ? 'Printing…' : 'Print therapy kit'}
              </button>
            </div>
          </div>
        )}

        {error && <p className="mx-auto mt-4 max-w-5xl rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

        {/* Printer animation */}
        {recipe && (
          <div id="printer" className="mx-auto mt-6 max-w-5xl card overflow-hidden p-0">
            <div className="grid gap-0 md:grid-cols-[1fr_320px]">
              <PrinterStage recipe={recipe} progress={progress} phase={phase} stageIdx={stageIdx} />
              <div className="border-t border-ink-900/10 p-5 md:border-l md:border-t-0">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink-700/50">Print log</p>
                <ol className="mt-3 space-y-2">
                  {recipe.stages.map((s, i) => {
                    const state = i < stageIdx || phase === 'done' ? 'done' : i === stageIdx ? 'active' : 'idle';
                    return (
                      <li key={s.key} className="flex items-start gap-3">
                        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${state === 'done' ? 'bg-emerald-500 text-white' : state === 'active' ? 'bg-clay-500 text-white' : 'bg-ink-900/10 text-ink-700/50'}`}>
                          {state === 'done' ? '✓' : i + 1}
                        </span>
                        <span className="min-w-0">
                          <span className={`block text-sm font-semibold ${state === 'idle' ? 'text-ink-700/40' : 'text-ink-900'}`}>{s.label}</span>
                          {state === 'active' && <span className="block text-xs text-ink-700/60">{s.detail}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ol>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-ink-900/10">
                  <div className="h-full rounded-full bg-clay-500 transition-[width] duration-150" style={{ width: `${Math.round((phase === 'done' ? 1 : progress) * 100)}%` }} />
                </div>
                <p className="mt-1 text-right font-mono text-xs text-ink-700/50">{Math.round((phase === 'done' ? 1 : progress) * 100)}%</p>
              </div>
            </div>
          </div>
        )}

        {/* Output kit sheet */}
        {phase === 'done' && recipe && (
          <div id="kit-out" className="mx-auto mt-6 max-w-5xl">
            <div className="card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-emerald-500 text-white"><Icon name="heart" className="h-6 w-6" /></span>
                  <div>
                    <h3 className="font-display text-xl font-extrabold text-ink-900">Therapy kit printed</h3>
                    <p className="text-sm text-ink-700/60">Batch <b className="font-mono text-ink-900">{recipe.batchId}</b> · {new Date().toLocaleString()}</p>
                  </div>
                </div>
                <button onClick={reset} className="rounded-full border border-ink-900/15 px-5 py-2.5 text-sm font-bold text-ink-700 transition hover:border-clay-400 hover:text-clay-600">Print another</button>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {/* Organic */}
                <div className="rounded-2xl border border-ink-900/10 p-4">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-clay-600">Organic — living matter</p>
                  <p className="mt-2 text-lg font-bold text-ink-900">{recipe.organic.productName}</p>
                  <dl className="mt-3 space-y-1.5 text-sm">
                    <Row k="Class" v={recipe.organic.cellClass} />
                    <Row k="Source" v={recipe.organic.source} />
                    <Row k="Dose" v={recipe.organic.dose} />
                    <Row k="Bio-ink volume" v={`${recipe.organic.bioInkMl} mL`} />
                  </dl>
                  <p className="mt-3 text-xs font-semibold text-ink-700/50">Co-printed factors</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {recipe.organic.factors.map((f) => <span key={f} className="rounded-full bg-cream-200 px-2 py-0.5 text-[11px] text-ink-700">{f}</span>)}
                  </div>
                </div>

                {/* Inorganic */}
                <div className="rounded-2xl border border-ink-900/10 p-4">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-clay-600">Inorganic — printed kit ({recipe.inorganic.polymerLayers} layers)</p>
                  <ul className="mt-2 divide-y divide-ink-900/5 text-sm">
                    {recipe.inorganic.items.map((it) => (
                      <li key={it.name} className="flex items-center justify-between gap-2 py-1.5">
                        <span className="min-w-0"><span className="block truncate font-semibold text-ink-900">{it.name}</span><span className="block truncate text-xs text-ink-700/50">{it.material}</span></span>
                        <span className="shrink-0 font-mono text-xs text-ink-700/70">×{it.qty}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* QC */}
              <div className="mt-5 rounded-2xl border border-ink-900/10 p-4">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-clay-600">Quality control</p>
                <div className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {recipe.qc.map((q) => (
                    <div key={q.label} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-ink-700/70">{q.label}</span>
                      <span className={`font-semibold ${q.pass ? 'text-emerald-700' : 'text-red-600'}`}>{q.pass ? '✓ ' : '✗ '}{q.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-5 text-xs text-ink-700/50">
                Demonstration only. The Universal Synthesizer is on the StemCells Protocol hardware roadmap; figures shown are
                illustrative sample data generated in your browser — not a real manufactured product, and not medical advice.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-700/60">{k}</dt>
      <dd className="text-right font-semibold text-ink-900">{v}</dd>
    </div>
  );
}

// ---- animated printer visual (SVG) --------------------------------------------
function PrinterStage({ recipe, progress, phase, stageIdx }: { recipe: KitRecipe; progress: number; phase: 'idle' | 'printing' | 'done'; stageIdx: number }) {
  const p = phase === 'done' ? 1 : progress;
  const accent = recipe.accent || '#4285F4';
  // organic fill runs during stages 1-2 (progress ~0.16..0.5); inorganic build ~0.5..0.83
  const orgFill = Math.max(0, Math.min(1, (p - 0.16) / 0.34));
  const kitBuild = Math.max(0, Math.min(1, (p - 0.5) / 0.33));
  const sealed = p >= 0.83;
  const nozzleX = 60 + Math.sin(p * Math.PI * 8) * 34; // sweeping nozzle
  const kind = recipe.stages[stageIdx]?.kind ?? 'genome';
  const nozzleY = kind === 'inorganic' ? 150 - kitBuild * 40 : 66;

  const vialH = 120, vialY = 92;
  const fillH = orgFill * (vialH - 16);

  return (
    <div className="relative bg-gradient-to-br from-ink-900 to-[#0b1b34] p-5">
      <div className="flex items-center justify-between">
        <span className="chip bg-white/10 text-white/80 text-[11px]">{recipe.stages[stageIdx]?.label}</span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-white/50">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${phase === 'printing' ? 'bg-green-400 animate-pulse' : phase === 'done' ? 'bg-emerald-400' : 'bg-white/30'}`} />
          {phase === 'done' ? 'complete' : phase === 'printing' ? 'printing' : 'ready'}
        </span>
      </div>

      <svg viewBox="0 0 320 240" className="mx-auto mt-2 block h-64 w-full" aria-hidden="true">
        {/* frame */}
        <rect x="14" y="14" width="292" height="212" rx="14" fill="none" stroke="rgba(255,255,255,0.12)" />
        {/* gantry rail */}
        <line x1="26" y1="46" x2="294" y2="46" stroke="rgba(255,255,255,0.18)" strokeWidth="3" />
        {/* nozzle */}
        <g style={{ transition: 'transform 120ms linear' }} transform={`translate(${nozzleX}, ${nozzleY})`}>
          <rect x="-9" y="-16" width="18" height="18" rx="3" fill="#cbd5e1" />
          <path d="M -6 2 L 6 2 L 2 12 L -2 12 Z" fill={accent} />
          {phase === 'printing' && (
            <line x1="0" y1="12" x2="0" y2="26" stroke={accent} strokeWidth="2" strokeDasharray="2 3">
              <animate attributeName="stroke-dashoffset" from="0" to="-10" dur="0.4s" repeatCount="indefinite" />
            </line>
          )}
        </g>

        {/* build plate */}
        <rect x="40" y="212" width="240" height="6" rx="3" fill="rgba(255,255,255,0.15)" />

        {/* ORGANIC — the vial, centre-left, fills with living cells */}
        <g transform="translate(96, 0)">
          <rect x="-22" y={vialY} width="44" height={vialH} rx="10" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.25)" />
          <rect x="-16" y={vialY - 10} width="32" height="12" rx="3" fill="rgba(255,255,255,0.35)" />
          {/* fill */}
          <clipPath id="vialclip"><rect x="-19" y={vialY + (vialH - 13) - fillH} width="38" height={fillH} rx="8" /></clipPath>
          <g clipPath="url(#vialclip)">
            <rect x="-19" y={vialY} width="38" height={vialH} fill={accent} opacity="0.7" />
            {/* floating cells */}
            {[...Array(7)].map((_, i) => (
              <circle key={i} cx={-12 + (i * 5) % 26} cy={vialY + 20 + (i * 17) % (vialH - 30)} r={2 + (i % 3)} fill="#fff" opacity="0.65">
                <animate attributeName="cy" values={`${vialY + vialH};${vialY + 14}`} dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </g>
          <text x="0" y={vialY + vialH + 16} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.6)" fontFamily="monospace">{recipe.organic.cellClass} · {Math.round(orgFill * 100)}%</text>
        </g>

        {/* INORGANIC — the kit, centre-right, builds up in layers */}
        <g transform="translate(210, 0)">
          {[...Array(9)].map((_, i) => {
            const layer = (i + 1) / 9;
            const shown = kitBuild >= layer;
            const y = 202 - i * 12;
            return <rect key={i} x="-30" y={y} width="60" height="10" rx="2" fill={shown ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.06)'} stroke="rgba(255,255,255,0.15)" style={{ transition: 'fill 200ms' }} />;
          })}
          <text x="0" y="222" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.6)" fontFamily="monospace">KIT · {Math.round(kitBuild * 100)}%</text>
        </g>

        {/* seal flash */}
        {sealed && <rect x="14" y="14" width="292" height="212" rx="14" fill="none" stroke="#34d399" strokeWidth="2" opacity={phase === 'done' ? 0.9 : 0.5} />}
      </svg>

      <p className="text-center text-xs text-white/50">
        {recipe.personalized ? `Autologous line · patient ${recipe.patientId}` : 'Allogeneic master cell bank'} · batch {recipe.batchId}
      </p>
    </div>
  );
}
