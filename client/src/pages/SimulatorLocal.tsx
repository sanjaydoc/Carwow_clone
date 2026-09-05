import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon';
import SimHeaderBand from '../components/SimHeaderBand';
import SimulatorChat from './SimulatorChat';
import {
  analyze,
  assembleConstruct,
  convertWgbs,
  datasetSamples,
  engines,
  getCatalog,
  interpret,
  listConverted,
  listSamples,
  reportCsv,
  reportPdf,
  safetyPrescreen,
  tumorSafety,
  startBatch,
  startDatasetDownload,
  startDesign,
  streamJob,
  type Catalog,
  type ConvertedFile,
  type DiseaseEntry,
} from '../api/simulator';

/**
 * Real-mode Simulator — talks to the local Python backend (localhost:8000).
 * Only rendered when the backend is reachable; otherwise the illustrative
 * Simulator is shown instead, so the public site is unaffected.
 *
 * Disease-driven flow: pick a disease (one of the therapies on the site) →
 * one-click download its curated methylation dataset (or upload your own) →
 * real epigenetic age → then Persona Reversal OSK construct and/or De-Novo-LLM molecules.
 */
type Approach = 'both' | 'er100' | 'molecules';

export default function SimulatorLocal() {
  const [mode, setMode] = useState<'chat' | 'advanced'>('chat');
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [diseaseKey, setDiseaseKey] = useState('');
  const [approach, setApproach] = useState<Approach>('both');

  const [datasetLabel, setDatasetLabel] = useState('');   // server-side curated dataset in use
  const [downloading, setDownloading] = useState(false);
  const [dlLog, setDlLog] = useState<string[]>([]);

  const [methFile, setMethFile] = useState<File | null>(null);
  const [genoFile, setGenoFile] = useState<File | null>(null);
  const [samples, setSamples] = useState<string[]>([]);
  const [sample, setSample] = useState('');
  const [age, setAge] = useState<string>('');

  const [cycles, setCycles] = useState(1);   // number of reprogramming cycles (projection)
  const [safety, setSafety] = useState<any>(null);          // Step 6 pre-screen result
  const [safetyHost, setSafetyHost] = useState('mouse');
  const [safetySens, setSafetySens] = useState(90);         // avatar screen sensitivity %
  const [safetyBusy, setSafetyBusy] = useState(false);
  const [tumor, setTumor] = useState<any>(null);           // Step 7 tumorigenicity envelope
  const [tumorBusy, setTumorBusy] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [construct, setConstruct] = useState<any>(null);
  const [ranked, setRanked] = useState<any>(null);
  const [interpretation, setInterpretation] = useState<string | null>(null);

  const [engineReady, setEngineReady] = useState<{ available: boolean; reason: string } | null>(null);
  const [busy, setBusy] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [optimizeFor, setOptimizeFor] = useState('qed');
  const [customLogp, setCustomLogp] = useState('2.5');
  const [batch, setBatch] = useState<any>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchLog, setBatchLog] = useState('');
  // WGBS/RRBS sequencing → beta conversion (optional, additive)
  const [wgbsFile, setWgbsFile] = useState<File | null>(null);
  const [manifestFile, setManifestFile] = useState<File | null>(null);
  const [wgbsBuild, setWgbsBuild] = useState('hg38');
  const [converting, setConverting] = useState(false);
  const [convertMsg, setConvertMsg] = useState('');
  const [wgbsName, setWgbsName] = useState('');       // patient name/label to save the converted file under
  const [converted, setConverted] = useState<ConvertedFile[]>([]); // user's saved converted files (reload-safe)
  const methRef = useRef<HTMLInputElement>(null);

  const refreshConverted = () => { listConverted().then(setConverted).catch(() => {}); };

  useEffect(() => {
    engines().then((e) => setEngineReady(e['denovo-llm'])).catch(() => {});
    getCatalog().then(setCatalog).catch(() => {});
    refreshConverted();   // reload-safe: show any files converted in earlier visits
  }, []);

  const disease: DiseaseEntry | null = useMemo(
    () => catalog?.diseases.find((d) => d.key === diseaseKey) ?? null,
    [catalog, diseaseKey],
  );

  // When the disease changes, reset the downstream state and preset the approach.
  const pickDisease = (key: string) => {
    setDiseaseKey(key);
    setDatasetLabel('');
    setSamples([]);
    setSample('');
    setMethFile(null);
    setAnalysis(null);
    setConstruct(null);
    setRanked(null);
    setInterpretation(null);
    setBatch(null);
    setError('');
    const d = catalog?.diseases.find((x) => x.key === key);
    if (d?.default_approach) setApproach(d.default_approach as Approach);
    setOptimizeFor(defaultOptimizeFor(d?.tissue_key));
    // If its curated dataset is already on disk, load its samples straight away.
    if (d?.dataset?.downloaded) {
      const label = d.dataset.label;
      setDatasetLabel(label);
      datasetSamples(label).then(setSamples).catch(() => {});
    }
  };

  const runDownload = async () => {
    if (!disease?.dataset) return;
    setError('');
    setDownloading(true);
    setDlLog([]);
    setSamples([]);
    setSample('');
    setMethFile(null);
    try {
      const { job_id, label } = await startDatasetDownload(disease.key, 8);
      const final = await streamJob(job_id, (ev) => {
        if (ev.message) setDlLog((l) => [...l, ev.message]);
      });
      if (final.status === 'error') {
        setError(final.error || 'Download failed');
      } else {
        setDatasetLabel(label);
        setSamples(final.result?.samples || []);
        setSample('');
      }
    } catch (e: any) {
      setError(e.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  // .cov / bedGraph are position-based sequencing output (not cg-id beta), so
  // they must go through the WGBS→beta conversion before the clock can read them.
  const COV_EXT = /\.(cov|bedgraph|bed)(\.gz)?$/i;

  const pickMeth = async (f: File | null) => {
    setDatasetLabel(''); // uploading overrides the curated dataset
    setSamples([]);
    setSample('');
    if (f && COV_EXT.test(f.name)) {
      // Auto-route a .cov to the conversion step and open it.
      setMethFile(null);
      setWgbsFile(f);
      if (!wgbsName) setWgbsName(f.name.replace(COV_EXT, ''));
      setConvertMsg('Detected a .cov sequencing file — pick the genome build and click “Convert → beta” below, then Compute epigenetic age.');
      return;
    }
    setMethFile(f);
    if (f) {
      try {
        setSamples(await listSamples(f));
      } catch {
        /* single-sample file — no columns to pick */
      }
    }
  };

  const runConvert = async () => {
    if (!wgbsFile) return;
    setConverting(true);
    setConvertMsg('Converting sequencing file → clock CpGs…');
    setError('');
    try {
      const res = await convertWgbs({
        wgbs: wgbsFile,
        manifest: manifestFile,
        build: wgbsBuild,
        label: wgbsName.trim() || 'wgbs',   // saved as methylation_<name>.csv — easy to spot
      });
      // Route the converted file through the existing server-side dataset path.
      setMethFile(null);
      setDatasetLabel(res.label);
      setSamples(res.samples);
      setSample('');
      refreshConverted();  // add it to the reload-safe "your converted files" list
      const pct = Math.round(res.coverage * 100);
      setConvertMsg(`✓ Converted — ${res.matched}/${res.total} clock CpGs (${pct}% coverage). Saved as methylation_${res.label}.csv. ${pct < 60 ? 'Low coverage: check the build/manifest match your WGBS.' : 'Ready — Compute epigenetic age below.'}`);
    } catch (e: any) {
      setError(e.message || 'Conversion failed');
      setConvertMsg('');
    } finally {
      setConverting(false);
    }
  };

  const useConverted = async (label: string) => {
    if (!label) return;
    setMethFile(null);
    if (methRef.current) methRef.current.value = '';
    setSample('');
    setDatasetLabel(label);
    setError('');
    try {
      setSamples(await datasetSamples(label));
      setConvertMsg(`✓ Using your converted file (methylation_${label}.csv). Compute below.`);
    } catch {
      setConvertMsg('');
      setError('That converted file is no longer on the server — convert it again.');
    }
  };

  const canAnalyze = !!(methFile || datasetLabel);

  const runAnalyze = async () => {
    if (!canAnalyze) return;
    setError('');
    setBusy('Computing epigenetic age…');
    setAnalysis(null);
    setConstruct(null);
    setRanked(null);
    setInterpretation(null);
    setCycles(1);
    setSafety(null);
    setTumor(null);
    try {
      const res = await analyze({
        methylation: methFile,
        dataset: datasetLabel || undefined,
        genotype: genoFile,
        sample: sample || undefined,
        chronologicalAge: age ? Number(age) : null,
        tissueKey: disease?.tissue_key,
        department: disease?.department,
        cycles: 1,
      });
      setAnalysis(res);
    } catch (e: any) {
      setError(e.message || 'Analyze failed');
    } finally {
      setBusy('');
    }
  };

  const ctype = disease?.construct_type;
  const isStructuredConstruct = ctype === 'gene_replacement' || ctype === 'epigenetic_silencing';
  const constructTitle =
    ctype === 'gene_replacement' ? 'Micro-dystrophin gene-replacement construct'
    : ctype === 'epigenetic_silencing' ? 'Anti-DUX4 silencing construct'
    : 'Persona Reversal OSK Tet-On construct';

  const runConstruct = async () => {
    setBusy(isStructuredConstruct ? `Assembling ${constructTitle.toLowerCase()}…` : 'Assembling OSK Tet-On construct…');
    try {
      setConstruct(
        await assembleConstruct({
          construct_type: disease?.construct_type,
          capsid: disease?.capsid || 'aav9',
          tissue_key: disease?.tissue_key,
          tissue_label: disease?.tissue,
          objectives: analysis?.objectives || [],
        }),
      );
    } finally {
      setBusy('');
    }
  };

  const runSafety = async () => {
    setSafetyBusy(true);
    setError('');
    try {
      setSafety(await safetyPrescreen({
        construct_type: disease?.construct_type || 'reprogramming',
        cycles,
        tissue_key: disease?.tissue_key,
        host: safetyHost,
        sensitivity: safetySens / 100,
      }));
    } catch (e: any) {
      setError(e.message || 'Safety pre-screen failed');
    } finally {
      setSafetyBusy(false);
    }
  };

  const runTumor = async () => {
    setTumorBusy(true);
    setError('');
    try {
      const rej = analysis?.rejuvenation;
      setTumor(await tumorSafety({
        dnam_age: ea?.dnam_age,
        age_acceleration: ea?.age_acceleration,
        coverage: ea?.coverage,
        youth_setpoint: rej?.youth_setpoint,
        efficiency: rej?.efficiency,
        tissue_key: disease?.tissue_key,
        cycles,
      }));
    } catch (e: any) {
      setError(e.message || 'Tumorigenicity safety failed');
    } finally {
      setTumorBusy(false);
    }
  };

  const runDesign = async () => {
    setError('');
    setRanked(null);
    setLog([]);
    setBusy('Generating candidate molecules…');
    try {
      const jobId = await startDesign({
        modality: 'smiles',
        n: 100,
        ...designProps(optimizeFor, customLogp),
        objectives: analysis?.objectives || [],
      });
      const final = await streamJob(jobId, (ev) => {
        if (ev.message) setLog((l) => [...l, ev.message]);
      });
      if (final.status === 'error') setError(final.error || 'Generation failed');
      else setRanked(final.result);
    } catch (e: any) {
      setError(e.message || 'Design failed');
    } finally {
      setBusy('');
    }
  };

  const runBatch = async () => {
    if (!disease) return;
    setBatchBusy(true);
    setBatch(null);
    setBatchLog('starting…');
    setError('');
    try {
      const { job_id } = await startBatch(disease.key, 400);
      const final = await streamJob(job_id, (ev) => ev.message && setBatchLog(ev.message));
      if (final.status === 'error') setError(final.error || 'Batch failed');
      else setBatch(final.result);
    } catch (e: any) {
      setError(e.message || 'Batch failed');
    } finally {
      setBatchBusy(false);
    }
  };

  const extras = () => ({
    safety, tumor, cycles, rejView,
    sample: sample || datasetLabel || undefined,
    chronoAge: age ? Number(age) : null,
  });

  const runInterpret = async () => {
    setBusy('Writing plain-language summary…');
    try {
      const p = buildPayload(analysis, construct, ranked, undefined, disease, extras());
      setInterpretation((await interpret(p)) || '(interpretation unavailable offline)');
    } finally {
      setBusy('');
    }
  };

  const payload = () => buildPayload(analysis, construct, ranked, interpretation, disease, extras());

  const ea = analysis?.epigenetic_age;
  const showA = approach !== 'molecules';
  const showB = approach !== 'er100';

  // Which lab scene the header band shows — the furthest step reached.
  const activeStep = useMemo(() => {
    if (safety) return 5;
    if (ranked) return 4;
    if (construct) return 3;
    if (analysis) return 2;
    if (datasetLabel || methFile || samples.length) return 1;
    return 0;
  }, [safety, ranked, construct, analysis, datasetLabel, methFile, samples]);

  // Multi-cycle projection — recomputed client-side from the returned efficiency
  // and floor. Each cycle reverses `eff` of the gap that REMAINS above the floor,
  // so it compounds with diminishing returns toward the floor (never below it).
  const rejView = useMemo(() => {
    const rej = analysis?.rejuvenation;
    const base = analysis?.epigenetic_age?.dnam_age;
    if (!rej || base == null) return null;
    const eff = rej.efficiency ?? 0.35;
    const floor = rej.youth_setpoint ?? 20;
    let ageNow = base;
    const per: { cycle: number; reversed: number; projected: number }[] = [];
    for (let i = 1; i <= cycles; i++) {
      ageNow -= eff * Math.max(0, ageNow - floor);
      per.push({ cycle: i, reversed: +(base - ageNow).toFixed(1), projected: +ageNow.toFixed(1) });
    }
    return {
      years_reversed: +(base - ageNow).toFixed(1),
      projected_age: +ageNow.toFixed(1),
      per, floor, eff,
    };
  }, [analysis, cycles]);

  if (mode === 'chat') return <SimulatorChat onExit={() => setMode('advanced')} />;

  return (
    <div className="container-x py-10">
      {/* Connected banner */}
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />
        <p className="text-sm font-semibold text-green-800">
          Local research pipeline connected — your data stays on this machine.
        </p>
      </div>

      <div className="mb-5"><SimHeaderBand step={activeStep} /></div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="icon-tile h-12 w-12"><Icon name="dna" className="h-6 w-6" /></span>
          <div>
            <h1 className="font-display text-3xl font-extrabold text-ink-900">Protocol Simulator — live</h1>
            <p className="text-ink-700/70">Pick a disease → dataset → real epigenetic age → Persona Reversal construct &amp; De Novo LLM molecules.</p>
          </div>
        </div>
        <button onClick={() => setMode('chat')} className="btn-ghost shrink-0 px-3 py-1.5 text-xs">← Chat view</button>
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

      {/* 0 · Disease + therapy approach ------------------------------------ */}
      <section className="mt-6 card p-6">
        <h2 className="font-display text-lg font-bold text-ink-900">1 · Choose a disease to develop for</h2>
        <div className="mt-4 grid gap-5 md:grid-cols-[1.2fr_1fr]">
          <div>
            <label className="block text-sm font-semibold text-ink-800">Disease / therapy</label>
            <select value={diseaseKey} onChange={(e) => pickDisease(e.target.value)} className="input mt-1">
              <option value="">Select a disease…</option>
              {catalog?.departments.map((dept) => (
                <optgroup key={dept} label={dept}>
                  {catalog.diseases.filter((d) => d.department === dept).map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.disease}{d.dataset_ready ? '  ● dataset ready' : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            {disease && (
              <div className="mt-4">
                <label className="block text-sm font-semibold text-ink-800">Therapy approach</label>
                <div className="mt-2 inline-flex rounded-xl border border-cream-300 bg-cream-100 p-1 text-sm">
                  {([['both', 'Both'], ['er100', 'Persona Reversal reprogramming'], ['molecules', 'Novel molecules']] as [Approach, string][]).map(([val, lbl]) => (
                    <button
                      key={val}
                      onClick={() => setApproach(val)}
                      className={`rounded-lg px-3 py-1.5 font-semibold transition ${approach === val ? 'bg-white text-clay-700 shadow-sm' : 'text-ink-700/70'}`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {disease && (
            <div className="rounded-2xl bg-cream-100 p-4 text-sm">
              <p className="font-semibold text-ink-900">{disease.disease}</p>
              <p className="text-ink-700/60">{disease.department} · {disease.category} · {disease.status === 'research' ? 'Under research' : 'Established'}</p>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <dt className="text-ink-700/50">Persona Reversal tissue</dt><dd className="font-semibold text-ink-900">{disease.tissue}</dd>
                <dt className="text-ink-700/50">AAV capsid</dt><dd className="font-semibold text-ink-900">{disease.capsid.toUpperCase()}</dd>
                <dt className="text-ink-700/50">Delivery</dt><dd className="font-semibold text-ink-900">{disease.construct_route}</dd>
              </dl>
              {disease.dataset && !disease.dataset.proxy ? (
                <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800">
                  Curated dataset: <b>{disease.dataset.accession}</b> · {disease.dataset.platform} · {disease.dataset.tissue}
                  {disease.dataset.has_age ? ' · has ages' : ' · no ages'} · {disease.dataset.condition}
                </p>
              ) : (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  No disease-specific cohort yet — a <b>generic blood-methylation baseline</b> ({disease.dataset?.accession}) is
                  available to run the pipeline, or upload your own {disease.disease} methylation file.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 2 · Data (curated download OR upload) ----------------------------- */}
      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="card p-6">
          <h2 className="font-display text-lg font-bold text-ink-900">2 · Your data</h2>

          {/* Curated one-click download */}
          {disease?.dataset && (
            <div className="mt-4 rounded-xl border border-cream-300 p-4">
              <p className="text-sm font-semibold text-ink-800">{disease.dataset.proxy ? 'Baseline dataset' : 'Curated dataset'} — {disease.dataset.accession}</p>
              <p className="mt-0.5 text-xs text-ink-700/60">{disease.dataset.note || 'Downloads to your data folder, then slices a few samples.'}</p>
              <button
                onClick={runDownload}
                disabled={downloading || !!busy}
                className="btn-primary mt-3 w-full py-2.5 text-sm disabled:opacity-50"
              >
                {downloading ? 'Downloading & preparing…' : datasetLabel ? 'Re-download dataset' : 'Download & prepare dataset'}
              </button>
              {downloading && (
                <div className="mt-3 flex items-center gap-2 text-xs text-ink-700/70">
                  <span className="cell-loader"><span className="m" /><span className="n" /><span className="bud" /></span>
                  {dlLog[dlLog.length - 1] || 'starting…'}
                </div>
              )}
              {datasetLabel && !downloading && (
                <p className="mt-2 text-xs font-semibold text-green-700">✓ Ready — {samples.length} samples prepared.</p>
              )}
              <p className="mt-2 text-center text-[11px] uppercase tracking-wide text-ink-700/40">or upload your own</p>
            </div>
          )}

          <label className="mt-4 block text-sm font-semibold text-ink-800">Methylation file — .csv (beta values) or .cov (sequencing)</label>
          <input ref={methRef} type="file" accept=".csv,.txt,.tsv,.cov,.bedgraph,.bed,.gz" className="mt-1 w-full text-sm"
                 onChange={(e) => pickMeth(e.target.files?.[0] ?? null)} />
          <p className="mt-1 text-[11px] text-ink-700/50">.csv = CpG-id beta values (used directly). .cov / bedGraph = bisulfite-sequencing output → auto-routed to “Convert → beta” below.</p>
          {converted.length > 0 && (
            <div className="mt-2 rounded-xl border border-cream-300 bg-cream-50 p-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-700/50">
                Your converted files — click to use
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {converted.map((c) => (
                  <button
                    key={c.label}
                    onClick={() => useConverted(c.label)}
                    title={`methylation_${c.label}.csv`}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      datasetLabel === c.label
                        ? 'border-clay-500 bg-clay-500 text-white'
                        : 'border-cream-300 bg-white text-ink-800 hover:border-clay-400'
                    }`}
                  >
                    {datasetLabel === c.label ? '✓ ' : '↻ '}{c.label}
                  </button>
                ))}
              </div>
              {converted.some((c) => c.label === datasetLabel) && (
                <p className="mt-1.5 text-[11px] text-green-700">
                  Active: methylation_{datasetLabel}.csv — Compute below.
                </p>
              )}
            </div>
          )}

          {samples.length > 0 && (
            <>
              <label className="mt-3 block text-sm font-semibold text-ink-800">Sample</label>
              <select value={sample} onChange={(e) => setSample(e.target.value)} className="input mt-1">
                <option value="">First sample</option>
                {samples.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </>
          )}
          {/* Sequencing (WGBS/RRBS) → beta conversion (optional; array data skips this) */}
          <details className="mt-3 rounded-xl border border-cream-300 p-3" open={!!wgbsFile}>
            <summary className="cursor-pointer text-sm font-semibold text-ink-800">
              Have sequencing output (.cov / WGBS / RRBS) instead of an array? Convert it →
            </summary>
            <p className="mt-2 text-xs text-ink-700/60">
              Bisulfite sequencing reports methylation by genomic position, not <code>cg</code> id.
              This maps it onto the clock’s CpGs. (An EPIC/450K array file needs no conversion — upload it above.)
            </p>
            <label className="mt-2 block text-xs font-semibold text-ink-800">Patient name / label</label>
            <input type="text" value={wgbsName} onChange={(e) => setWgbsName(e.target.value)}
                   placeholder="e.g. ramesh — saved as methylation_ramesh.csv"
                   className="input mt-1 w-full py-1 text-xs" />
            <label className="mt-2 block text-xs font-semibold text-ink-800">Sequencing file (.cov / bedGraph / tsv, .gz ok)</label>
            <input type="file" accept=".cov,.bedgraph,.bed,.txt,.tsv,.csv,.gz" className="mt-1 w-full text-xs"
                   onChange={(e) => setWgbsFile(e.target.files?.[0] ?? null)} />
            <div className="mt-2 flex items-center gap-2">
              <label className="text-xs font-semibold text-ink-800">Genome build</label>
              <select value={wgbsBuild} onChange={(e) => setWgbsBuild(e.target.value)} className="input w-28 py-1 text-xs">
                <option value="hg38">hg38</option>
                <option value="hg19">hg19</option>
                <option value="hg18">hg18</option>
              </select>
            </div>
            {wgbsBuild !== 'hg18' && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] text-ink-700/50">Coordinates for {wgbsBuild} are built in — no manifest needed. (Optional: use your own manifest →)</summary>
                <input type="file" accept=".csv,.tsv,.txt,.gz" className="mt-1 w-full text-xs"
                       onChange={(e) => setManifestFile(e.target.files?.[0] ?? null)} />
                <p className="mt-1 text-[11px] text-ink-700/50">Overrides the built-in {wgbsBuild} coordinates with an Illumina EPIC/450K manifest (must match your alignment build).</p>
              </details>
            )}
            <button onClick={runConvert} disabled={!wgbsFile || converting}
                    className="btn-outline mt-2 w-full py-2 text-xs disabled:opacity-50">
              {converting ? 'Converting…' : 'Convert → beta'}
            </button>
            {convertMsg && <p className="mt-2 text-xs text-green-700">{convertMsg}</p>}
          </details>

          <label className="mt-3 block text-sm font-semibold text-ink-800">Genotype (optional)</label>
          <input type="file" accept=".txt,.csv,.vcf,.gz" className="mt-1 w-full text-sm"
                 onChange={(e) => setGenoFile(e.target.files?.[0] ?? null)} />
          <label className="mt-3 block text-sm font-semibold text-ink-800">Chronological age (optional)</label>
          <input value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" placeholder="e.g. 39" className="input mt-1" />
          <button onClick={runAnalyze} disabled={!canAnalyze || !!busy}
                  className="btn-primary mt-5 w-full py-3 disabled:opacity-50">
            {busy === 'Computing epigenetic age…' ? 'Computing…' : 'Compute epigenetic age'}
          </button>
        </div>

        {/* Epigenetic age result */}
        <div className="card p-6">
          <h2 className="font-display text-lg font-bold text-ink-900">3 · Epigenetic age</h2>
          {!ea ? (
            <p className="mt-4 text-ink-700/60">Pick a dataset (or upload) and compute to see the real Horvath-clock result.</p>
          ) : (
            <div className="mt-4">
              <div className="flex flex-wrap gap-6">
                <Stat label="Biological (DNAm) age" value={`${ea.dnam_age} yr`} big />
                {ea.chronological_age != null && <Stat label="Chronological" value={`${ea.chronological_age} yr`} />}
                {ea.age_acceleration != null && (
                  <Stat label="Age acceleration"
                        value={`${ea.age_acceleration > 0 ? '+' : ''}${ea.age_acceleration} yr`}
                        tone={ea.age_acceleration > 0 ? 'bad' : 'good'} />
                )}
                <Stat label="CpG coverage" value={`${Math.round(ea.coverage * 100)}%`} />
                {analysis.rejuvenation && rejView && (
                  <>
                    <Stat label={`Age reversal (projected)${cycles > 1 ? ` · ${cycles} cycles` : ''}`} value={`−${rejView.years_reversed} yr`} tone="good" />
                    <Stat label="Tissue rejuvenation (projected)" value={`${analysis.rejuvenation.tissue_rejuvenation_index}%`} tone="good" />
                  </>
                )}
              </div>

              {/* Reprogramming cycles — compounding projection with diminishing returns */}
              {analysis.rejuvenation && rejView && (
                <div className="mt-3 rounded-xl border border-cream-300 bg-cream-50 p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold text-ink-800">Reprogramming cycles</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setCycles((c) => Math.max(1, c - 1))} disabled={cycles <= 1}
                              className="h-7 w-7 rounded-full border border-cream-300 bg-white text-ink-800 disabled:opacity-40">−</button>
                      <span className="w-6 text-center text-sm font-bold text-ink-900">{cycles}</span>
                      <button onClick={() => setCycles((c) => Math.min(10, c + 1))} disabled={cycles >= 10}
                              className="h-7 w-7 rounded-full border border-cream-300 bg-white text-ink-800 disabled:opacity-40">+</button>
                    </div>
                    <span className="text-xs text-ink-700/60">
                      {ea.dnam_age} → <b className="text-ink-900">{rejView.projected_age} yr</b> after {cycles} cycle{cycles > 1 ? 's' : ''} (−{rejView.years_reversed} yr)
                    </span>
                  </div>
                  {cycles > 1 && (
                    <p className="mt-2 break-words text-[11px] text-ink-700/60">
                      Per cycle: {rejView.per.map((p) => `${p.projected}`).join(' → ')} yr.
                      Reversal <b>compounds with diminishing returns</b> toward the ~{rejView.floor}-yr young-adult floor —
                      it never goes below it, so cycles are <b>not</b> additive (2 cycles ≠ 2×).
                    </p>
                  )}
                </div>
              )}

              <p className="mt-2 text-xs text-ink-700/50">Clock: {ea.clock} · {ea.n_used}/{ea.n_total} CpGs.</p>
              {analysis.rejuvenation && rejView && (
                <p className="mt-1 text-xs text-ink-700/50">
                  Projected DNAm age after {cycles} reprogramming cycle{cycles > 1 ? 's' : ''}: <b>{rejView.projected_age} yr</b>. {analysis.rejuvenation.basis}
                </p>
              )}

              {/* Targets */}
              {analysis.targets?.length > 0 && (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[460px] text-left text-sm">
                    <thead className="text-ink-700/60">
                      <tr><th className="py-1 pr-3">CpG</th><th className="pr-3">Gene</th><th className="pr-3">Action</th><th>Contribution</th></tr>
                    </thead>
                    <tbody>
                      {analysis.targets.slice(0, 8).map((t: any) => (
                        <tr key={t.cpg} className="border-t border-cream-200">
                          <td className="py-1.5 pr-3 font-mono text-xs">{t.cpg}</td>
                          <td className="pr-3 font-semibold text-ink-900">{t.gene || '—'}</td>
                          <td className="pr-3"><span className="chip bg-clay-50 text-clay-700">{t.direction}</span></td>
                          <td className="font-mono text-xs">{t.contribution}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Genome personalization (when a genotype was uploaded) */}
      {analysis?.genotype?.personalization && (
        <section className="mt-6 card p-6">
          <h2 className="font-display text-lg font-bold text-ink-900">Genome personalization <span className="text-xs font-normal text-ink-700/50">· {analysis.genotype.source} · {analysis.genotype.n_variants.toLocaleString()} variants</span></h2>
          <p className="text-sm text-ink-700/60">{analysis.genotype.personalization.summary}</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-ink-700/60"><tr><th className="py-1 pr-3">Gene</th><th className="pr-3">Variant</th><th className="pr-3">You</th><th className="pr-3">Meaning</th><th>Relevant</th></tr></thead>
              <tbody>
                {analysis.genotype.personalization.findings
                  .filter((f: any) => f.risk_level !== 'typical' || f.relevant)
                  .slice(0, 12)
                  .map((f: any) => (
                    <tr key={f.rsid} className="border-t border-cream-200 align-top">
                      <td className="py-1.5 pr-3 font-semibold text-ink-900">{f.gene}</td>
                      <td className="pr-3 font-mono text-xs">{f.rsid}</td>
                      <td className="pr-3 font-mono text-xs">{f.genotype}</td>
                      <td className="pr-3 text-xs">
                        <span className={`chip mr-1 ${f.risk_level === 'higher' ? 'bg-red-50 text-red-700' : f.risk_level === 'protective' ? 'bg-green-50 text-green-700' : 'bg-cream-100 text-ink-700'}`}>{f.risk_level}</span>
                        {f.interpretation}
                      </td>
                      <td>{f.relevant ? <span className="chip bg-clay-50 text-clay-700">★ {disease?.department}</span> : '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs italic text-ink-700/50">{analysis.genotype.personalization.disclaimer}</p>
        </section>
      )}

      {/* Batch case-vs-control compare (curated dataset) */}
      {disease?.dataset_ready && datasetLabel && (
        <section className="mt-6 card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-ink-900">Batch — case vs control <span className="text-xs font-normal text-ink-700/50">· all samples</span></h2>
              <p className="text-sm text-ink-700/60">Scores every sample in {disease.dataset?.accession} with the clock, groups by condition, and tests whether cases are epigenetically older.</p>
            </div>
            <button onClick={runBatch} disabled={batchBusy} className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50">
              {batchBusy ? 'Running…' : 'Run compare'}
            </button>
          </div>

          {batchBusy && (
            <div className="mt-3 flex items-center gap-2 text-sm text-ink-700/70">
              <span className="cell-loader"><span className="m" /><span className="n" /><span className="bud" /></span>
              {batchLog}
            </div>
          )}

          {batch && (
            <div className="mt-4">
              <div className="flex flex-wrap items-end gap-6">
                {batch.groups.map((g: any) => (
                  <div key={g.label}>
                    <p className="text-xs uppercase tracking-wide text-ink-700/50">{g.label} (n={g.n})</p>
                    <p className="font-display text-2xl font-extrabold text-ink-900">{g.mean_dnam_age} yr <span className="text-sm font-normal text-ink-700/50">± {g.sd}</span></p>
                  </div>
                ))}
                {batch.gap_dnam_age != null && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-ink-700/50">Case − control gap</p>
                    <p className={`font-display text-2xl font-extrabold ${batch.gap_dnam_age > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {batch.gap_dnam_age > 0 ? '+' : ''}{batch.gap_dnam_age} yr
                    </p>
                  </div>
                )}
                {batch.welch?.p_value != null && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-ink-700/50">Welch p</p>
                    <p className={`font-display text-2xl font-extrabold ${batch.welch.p_value < 0.05 ? 'text-green-600' : 'text-ink-900'}`}>
                      {batch.welch.p_value < 0.001 ? batch.welch.p_value.toExponential(1) : batch.welch.p_value}
                    </p>
                  </div>
                )}
              </div>
              {batch.gap_dnam_age != null && batch.welch?.p_value != null && (
                <p className="mt-2 text-sm text-ink-800">
                  Cases are epigenetically <b>{Math.abs(batch.gap_dnam_age)} yr {batch.gap_dnam_age > 0 ? 'older' : 'younger'}</b> than controls on average
                  {batch.welch.p_value < 0.05 ? ' — statistically significant' : ' — not significant at p<0.05'} (n={batch.n_scored}).
                </p>
              )}
              {batch.groups.length < 2 && (
                <p className="mt-2 text-sm text-amber-700">Only one group found ({batch.groups[0]?.label}) — this cohort has no case/control split, so there's nothing to compare (still shows the mean).</p>
              )}
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-clay-700">Per-sample ({batch.n_scored})</summary>
                <div className="mt-2 max-h-56 overflow-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-ink-700/60"><tr><th className="pr-3">Sample</th><th className="pr-3">Group</th><th className="pr-3">DNAm age</th><th className="pr-3">Chrono</th><th>Cov</th></tr></thead>
                    <tbody>
                      {batch.samples.map((s: any) => (
                        <tr key={s.sample} className="border-t border-cream-200">
                          <td className="pr-3 font-mono">{s.sample}</td>
                          <td className="pr-3"><span className={`chip ${s.group === 'case' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{s.group}</span></td>
                          <td className="pr-3 font-semibold">{s.dnam_age}</td>
                          <td className="pr-3">{s.chronological_age ?? '—'}</td>
                          <td>{Math.round(s.coverage * 100)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
              <p className="mt-2 text-xs italic text-ink-700/50">{batch.note}</p>
            </div>
          )}
        </section>
      )}

      {/* 4 + 5: Track A construct & Track B molecules */}
      {analysis && (
        <section className={`mt-6 grid gap-6 ${showA && showB ? 'lg:grid-cols-2' : ''}`}>
          {/* Track A */}
          {showA && (
          <div className="card p-6">
            <h2 className="font-display text-lg font-bold text-ink-900">
              4 · {constructTitle}
              <span className="text-xs font-normal text-ink-700/50"> · Track A</span>
            </h2>
            {disease && (
              <p className="mt-1 text-xs text-ink-700/60">Presets for <b>{disease.disease}</b>: {disease.tissue} · capsid {disease.capsid.toUpperCase()}.</p>
            )}
            {ctype === 'gene_replacement' && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Muscular dystrophy is a <b>genetic</b> disease — this delivers a working gene, it does not reprogram the epigenome.
                The right modality is <b>mutation-dependent</b> and needs the patient's dystrophin genotype.
              </p>
            )}
            {ctype === 'epigenetic_silencing' && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                FSHD is <b>epigenetic</b>: D4Z4 hypomethylation de-represses the toxic <b>DUX4</b> gene. This construct switches
                DUX4 back <b>off</b> (RNAi) — the mechanism-correct fix, distinct from gene replacement or generic reprogramming.
              </p>
            )}
            {!construct ? (
              <button onClick={runConstruct} disabled={!!busy} className="btn-outline mt-4 px-5 py-2.5 disabled:opacity-50">Assemble construct</button>
            ) : (construct.construct_type !== 'reprogramming' && construct.payload) ? (
              <div className="mt-3 text-sm">
                <p><b>Modality:</b> {construct.modality} · <b>Strategy:</b> {construct.strategy}</p>
                <p className="mt-1"><b>Capsid:</b> {construct.capsid_desc}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-cream-100 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-700/50">Payload</p>
                    <p className="font-semibold text-ink-900">{construct.payload.name} · {construct.payload.length_bp} bp</p>
                    <p className="mt-1 text-xs text-ink-700/70">{construct.payload.role}</p>
                  </div>
                  <div className="rounded-xl bg-cream-100 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-700/50">Driver</p>
                    <p className="font-semibold text-ink-900">{construct.driver.name} · {construct.driver.length_bp} bp</p>
                    <p className="mt-1 text-xs text-ink-700/70">{construct.driver.role}</p>
                  </div>
                </div>
                {construct.vectors.map((v: any) => (
                  <div key={v.name} className="mt-2 rounded-xl bg-cream-100 p-3">
                    <p className="font-semibold text-ink-900">{v.name} — {v.length_bp} bp {v.fits_aav ? '✓ fits AAV' : '✗ over limit'}</p>
                    <p className="mt-1 break-words text-xs text-ink-700/70">{v.features.map((f: any) => `${f.name}(${f.length})`).join(' → ')}</p>
                  </div>
                ))}
                <p className="mt-2 text-xs italic text-ink-700/60">{construct.mechanism}</p>
                {construct.alternatives?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-700/50">Alternative modalities (mutation-dependent)</p>
                    <ul className="mt-1 space-y-1">
                      {construct.alternatives.map((a: any) => (
                        <li key={a.name} className="text-xs text-ink-700/70"><b>{a.name}</b> — {a.note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3 text-sm">
                <p><b>Strategy:</b> {construct.strategy} · <b>Capsid:</b> {construct.capsid_desc}</p>
                {construct.vectors.map((v: any) => (
                  <div key={v.name} className="mt-2 rounded-xl bg-cream-100 p-3">
                    <p className="font-semibold text-ink-900">{v.name} — {v.length_bp} bp {v.fits_aav ? '✓ fits AAV' : '✗ over limit'}</p>
                    <p className="mt-1 break-words text-xs text-ink-700/70">{v.features.map((f: any) => `${f.name}(${f.length})`).join(' → ')}</p>
                  </div>
                ))}
                <p className="mt-2 text-xs italic text-ink-700/50">{construct.dox_protocol.logic}</p>
              </div>
            )}
          </div>
          )}

          {/* Track B */}
          {showB && (
          <div className="card p-6">
            <h2 className="font-display text-lg font-bold text-ink-900">{showA ? '5' : '4'} · De Novo molecules <span className="text-xs font-normal text-ink-700/50">· Track B</span></h2>
            {engineReady && !engineReady.available && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">De-Novo-LLM not detected: {engineReady.reason}</p>
            )}
            {!ranked ? (
              <>
                <label className="mt-4 block text-sm font-semibold text-ink-800">Optimize for</label>
                <select value={optimizeFor} onChange={(e) => setOptimizeFor(e.target.value)} className="input mt-1">
                  <option value="qed">Drug-likeness (QED)</option>
                  <option value="cns">CNS-penetrant (logP ≈ 2.5, crosses BBB)</option>
                  <option value="soluble">More soluble (low logP)</option>
                  <option value="lipophilic">More lipophilic (high logP)</option>
                  <option value="custom">Custom logP target…</option>
                </select>
                {disease && (
                  <p className="mt-1 text-xs text-clay-700">
                    Auto-selected <b>{optLabel(optimizeFor)}</b> for {disease.tissue} — change it if you like.
                  </p>
                )}
                {optimizeFor === 'custom' && (
                  <input value={customLogp} onChange={(e) => setCustomLogp(e.target.value)} inputMode="decimal"
                         placeholder="target logP, e.g. 2.5" className="input mt-2" />
                )}
                <p className="mt-1 text-xs text-ink-700/50">
                  QED and low/high-logP are optimised by the model directly; a logP <i>target</i>
                  (CNS-penetrant / custom) is met by generating a larger pool and ranking on logP.
                  Either way this tunes drug-likeness/deliverability — not binding to a specific target.
                </p>
                <button onClick={runDesign} disabled={!!busy} className="btn-primary mt-3 px-5 py-2.5 disabled:opacity-50">
                  {busy === 'Generating candidate molecules…' ? 'Generating…' : 'Generate candidates'}
                </button>
                {busy === 'Generating candidate molecules…' && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-ink-700/70">
                    <span className="cell-loader"><span className="m" /><span className="n" /><span className="bud" /></span>
                    {log[log.length - 1] || 'working…'}
                  </div>
                )}
              </>
            ) : (
              <div className="mt-3 text-sm">
                <p className="text-ink-700/70">
                  {ranked.n_valid}/{ranked.n_generated} valid · {ranked.n_unique} unique
                  {ranked.rdkit ? '' : ' · (install RDKit for validity/QED)'}
                </p>
                <div className="mt-2 max-h-64 overflow-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-ink-700/60"><tr><th className="pr-2">#</th><th className="pr-2">SMILES</th><th className="pr-2">rank</th><th className="pr-2">QED</th><th>logP</th></tr></thead>
                    <tbody>
                      {ranked.candidates.slice(0, 25).map((c: any, i: number) => (
                        <tr key={i} className="border-t border-cream-200">
                          <td className="pr-2">{i + 1}</td>
                          <td className="pr-2 font-mono">{c.seq}</td>
                          <td className="pr-2">{c.scores?.rank_score ?? '—'}</td>
                          <td className="pr-2">{c.scores?.qed ?? '—'}</td>
                          <td>{c.scores?.logp ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs italic text-ink-700/50">Research hypotheses — not validated or synthesizable therapeutics.</p>
              </div>
            )}
          </div>
          )}
        </section>
      )}

      {/* 6 · Safety Implant Blob — autologous xenograft "avatar" pre-screen */}
      {analysis && (
        <section className="mt-6">
          <div className="card p-6">
            <h2 className="font-display text-lg font-bold text-ink-900">6 · Safety Implant Blob <span className="text-xs font-normal text-ink-700/50">· patient-avatar pre-screen</span></h2>
            <p className="mt-1 text-sm text-ink-700/70">
              Before treating the patient, engraft their own tissue biopsy into a transgenic host (a
              patient-derived xenograft “avatar”), run the same therapy up to 2 cycles, read out safety
              + local efficacy, and adjust — so failures are caught on the avatar, not the patient.
            </p>

            <div className="mt-3 flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-800">Host</label>
                <select value={safetyHost} onChange={(e) => setSafetyHost(e.target.value)} className="input mt-1 w-44 py-1.5 text-sm">
                  <option value="mouse">Transgenic mouse (NSG)</option>
                  <option value="guinea_pig">Transgenic guinea pig</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-800">Avatar screen sensitivity: {safetySens}%</label>
                <input type="range" min={50} max={95} step={5} value={safetySens}
                       onChange={(e) => setSafetySens(Number(e.target.value))} className="mt-2 w-56" />
                <p className="text-[11px] text-ink-700/50">Fraction of detectable failures the avatar catches (capped &lt;100% — see below).</p>
              </div>
              <button onClick={runSafety} disabled={safetyBusy} className="btn-outline px-5 py-2.5 disabled:opacity-50">
                {safetyBusy ? 'Modelling…' : 'Run pre-screen'}
              </button>
            </div>

            {safety && (
              <div className="mt-4 text-sm">
                <div className="flex flex-wrap gap-6">
                  <Stat label="Projected success — no pre-screen" value={`${safety.projected_success_without}%`} tone="bad" />
                  <Stat label={`Projected success — with avatar (${safety.avatar_cycles}-cycle)`} value={`${safety.projected_success_with}%`} tone="good" big />
                  <Stat label="Risk caught by avatar" value={`−${Math.round(safety.risk_reduction * 100)}%`} tone="good" />
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-cream-100 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-green-700/70">The avatar CAN see</p>
                    <ul className="mt-1 space-y-1 text-xs text-ink-700/70">
                      {safety.detects.map((d: string) => <li key={d}>✓ {d}</li>)}
                    </ul>
                  </div>
                  <div className="rounded-xl bg-cream-100 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700/80">The avatar CANNOT see</p>
                    <ul className="mt-1 space-y-1 text-xs text-ink-700/70">
                      {safety.misses.map((d: string) => <li key={d}>✗ {d}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-cream-300 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-700/50">Workflow</p>
                  <ol className="mt-1 list-decimal space-y-1 pl-5 text-xs text-ink-700/70">
                    {safety.workflow.map((w: string) => <li key={w}>{w}</li>)}
                  </ol>
                </div>
                <p className="mt-2 text-[11px] italic text-ink-700/50">{safety.disclaimer}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 7 · Personalized Tumorigenicity Safety envelope */}
      {analysis && (
        <section className="mt-6">
          <div className="card p-6">
            <h2 className="font-display text-lg font-bold text-ink-900">7 · Tumorigenicity Safety <span className="text-xs font-normal text-ink-700/50">· personalized OSK dosing envelope</span></h2>
            <p className="mt-1 text-sm text-ink-700/70">
              Over-induction is the key danger of OSK reprogramming — pushed too hard, cells lose
              identity and can turn tumorigenic. This estimates a <b>safe dosing envelope for this
              patient</b> from their epigenetic-age acceleration, the reprogramming gap and the target
              tissue's proliferation class. It estimates and mitigates risk — it does not eliminate it.
            </p>

            <button onClick={runTumor} disabled={tumorBusy} className="btn-outline mt-4 px-5 py-2.5 disabled:opacity-50">
              {tumorBusy ? 'Modelling…' : `Compute safety envelope (${cycles} cycle${cycles > 1 ? 's' : ''})`}
            </button>

            {tumor && (
              <div className="mt-4 text-sm">
                <div className="flex flex-wrap gap-6">
                  <Stat label="Risk tier" value={tumor.risk_tier}
                        tone={tumor.risk_tier === 'Low' ? 'good' : tumor.risk_tier === 'High' ? 'bad' : undefined} big />
                  <Stat label={`Est. over-induction risk (${tumor.requested_cycles} cyc)`} value={`${Math.round(tumor.estimated_risk * 100)}%`}
                        tone={tumor.estimated_risk < 0.1 ? 'good' : tumor.estimated_risk >= 0.2 ? 'bad' : undefined} />
                  <Stat label="Max safe cycles" value={`${tumor.max_safe_cycles}`} tone="good" />
                  <Stat label="Tissue proliferation" value={`${tumor.tissue_proliferation_factor}× (${tumor.tissue_key})`} />
                </div>

                {/* Risk-by-cycle mini bar chart */}
                <div className="mt-4 rounded-xl border border-cream-300 bg-cream-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-700/50">Estimated risk by cycle count (15% planning threshold)</p>
                  <div className="mt-2 flex items-end gap-2" style={{ height: 90 }}>
                    {tumor.risk_curve.map((p: any) => {
                      const over = p.risk > tumor.risk_threshold;
                      return (
                        <div key={p.cycles} className="flex flex-1 flex-col items-center justify-end">
                          <div className="w-full rounded-t"
                               style={{ height: `${Math.max(4, p.risk * 100)}%`, background: over ? '#dc2626' : '#059669' }}
                               title={`${p.cycles} cycle(s): ${Math.round(p.risk * 100)}%`} />
                          <span className="mt-1 text-[10px] text-ink-700/60">{p.cycles}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-[10px] text-ink-700/50">Green ≤ 15% · red &gt; 15%. Cycle count on the x-axis.</p>
                </div>

                {tumor.flags.length > 0 && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700/80">Personalized flags</p>
                    <ul className="mt-1 space-y-1 text-xs text-amber-900/90">
                      {tumor.flags.map((f: string) => <li key={f}>• {f}</li>)}
                    </ul>
                  </div>
                )}

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-cream-100 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-green-700/70">Safety-by-design</p>
                    <ul className="mt-1 space-y-1 text-xs text-ink-700/70">
                      {tumor.safety_by_design.map((d: string) => <li key={d}>✓ {d}</li>)}
                    </ul>
                  </div>
                  <div className="rounded-xl bg-cream-100 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-700/50">Monitoring &amp; stop criteria</p>
                    <ul className="mt-1 space-y-1 text-xs text-ink-700/70">
                      {tumor.monitoring.map((d: string) => <li key={d}>• {d}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-cream-300 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-700/50">Dosing recommendation</p>
                  <p className="mt-1 text-xs text-ink-700/80">{tumor.pulse_recommendation}</p>
                  <p className="mt-2 text-sm font-semibold text-ink-900">{tumor.summary}</p>
                </div>
                <p className="mt-2 text-[11px] italic text-ink-700/50">{tumor.disclaimer}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Export + interpret */}
      {analysis && (
        <section className="mt-6 flex flex-wrap items-center gap-3">
          <button onClick={() => reportPdf(payload())} className="btn-outline px-5 py-2.5 text-sm">Export PDF</button>
          <button onClick={() => reportCsv(payload())} disabled={!ranked} className="btn-outline px-5 py-2.5 text-sm disabled:opacity-40">Export CSV</button>
          <button onClick={runInterpret} disabled={!!busy} className="btn-ghost px-4 py-2 text-sm">Plain-language summary</button>
        </section>
      )}
      {interpretation && (
        <div className="card mt-4 whitespace-pre-wrap p-6 text-sm text-ink-800">{interpretation}</div>
      )}

      <p className="mt-8 text-center text-xs text-ink-700/50">
        Local research tool. Epigenetic age is real (Horvath 2013). The construct and molecules are illustrative research
        outputs — not medical advice, not validated therapeutics.
      </p>
    </div>
  );
}

function Stat({ label, value, big, tone }: { label: string; value: string; big?: boolean; tone?: 'good' | 'bad' }) {
  const color = tone === 'bad' ? 'text-red-600' : tone === 'good' ? 'text-green-600' : 'text-ink-900';
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-ink-700/50">{label}</p>
      <p className={`font-display font-extrabold ${big ? 'text-3xl' : 'text-xl'} ${color}`}>{value}</p>
    </div>
  );
}

function optLabel(v: string): string {
  return ({ qed: 'drug-likeness (QED)', cns: 'CNS-penetrant', soluble: 'higher solubility',
    lipophilic: 'higher lipophilicity', custom: 'a custom logP' } as Record<string, string>)[v] || v;
}

// Auto-pick the molecule optimisation target from the disease's tissue.
function defaultOptimizeFor(tissueKey?: string): string {
  switch (tissueKey) {
    case 'cns':
    case 'retina':
      return 'cns';        // must cross the blood–brain / blood–retina barrier
    case 'kidney':
      return 'soluble';    // renally-cleared drugs favour solubility (low logP)
    default:
      return 'qed';        // general drug-likeness
  }
}

// Map the "Optimize for" choice to De-Novo-LLM property-conditioning params.
function designProps(optimizeFor: string, customLogp: string) {
  switch (optimizeFor) {
    case 'cns':
      return { property: 'logp', mode: 'target', target_value: 2.5 };
    case 'soluble':
      return { property: 'logp', mode: 'min' };
    case 'lipophilic':
      return { property: 'logp', mode: 'max' };
    case 'custom':
      return { property: 'logp', mode: 'target', target_value: Number(customLogp) || 2.5 };
    case 'qed':
    default:
      return { property: 'qed', mode: 'max' };
  }
}

function buildPayload(
  analysis: any,
  construct: any,
  ranked: any,
  interpretation?: string | null,
  disease?: DiseaseEntry | null,
  extras?: { safety?: any; tumor?: any; cycles?: number; rejView?: any; sample?: string; chronoAge?: number | null },
) {
  const { safety, tumor, cycles, rejView, sample, chronoAge } = extras || {};
  const rej = analysis?.rejuvenation;
  return {
    disease: disease ? { name: disease.disease, department: disease.department, tissue: disease.tissue, capsid: disease.capsid } : undefined,
    sample: sample || undefined,
    chronological_age: chronoAge ?? undefined,
    epigenetic_age: analysis?.epigenetic_age,
    rejuvenation: rej ? {
      cycles: cycles ?? 1,
      projected_age: rejView?.projected_age,
      years_reversed: rejView?.years_reversed,
      tissue_rejuvenation_index: rej.tissue_rejuvenation_index,
      basis: rej.basis,
    } : undefined,
    targets: analysis?.targets,
    construct,
    candidates: ranked?.candidates,
    safety: safety || undefined,     // Step 6 — avatar pre-screen
    tumor: tumor || undefined,       // Step 7 — tumorigenicity safety envelope
    interpretation: interpretation || undefined,
  };
}
