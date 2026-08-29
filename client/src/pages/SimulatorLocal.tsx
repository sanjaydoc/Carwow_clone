import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon';
import {
  analyze,
  assembleConstruct,
  datasetSamples,
  engines,
  getCatalog,
  interpret,
  listSamples,
  reportCsv,
  reportPdf,
  startDatasetDownload,
  startDesign,
  streamJob,
  type Catalog,
  type DiseaseEntry,
} from '../api/simulator';

/**
 * Real-mode Simulator — talks to the local Python backend (localhost:8000).
 * Only rendered when the backend is reachable; otherwise the illustrative
 * Simulator is shown instead, so the public site is unaffected.
 *
 * Disease-driven flow: pick a disease (one of the therapies on the site) →
 * one-click download its curated methylation dataset (or upload your own) →
 * real epigenetic age → then ER-100 OSK construct and/or De-Novo-LLM molecules.
 */
type Approach = 'both' | 'er100' | 'molecules';

export default function SimulatorLocal() {
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
  const methRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    engines().then((e) => setEngineReady(e['denovo-llm'])).catch(() => {});
    getCatalog().then(setCatalog).catch(() => {});
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
    setError('');
    const d = catalog?.diseases.find((x) => x.key === key);
    if (d?.default_approach) setApproach(d.default_approach as Approach);
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

  const pickMeth = async (f: File | null) => {
    setMethFile(f);
    setDatasetLabel(''); // uploading overrides the curated dataset
    setSamples([]);
    setSample('');
    if (f) {
      try {
        setSamples(await listSamples(f));
      } catch {
        /* single-sample file — no columns to pick */
      }
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
    try {
      const res = await analyze({
        methylation: methFile,
        dataset: datasetLabel || undefined,
        genotype: genoFile,
        sample: sample || undefined,
        chronologicalAge: age ? Number(age) : null,
      });
      setAnalysis(res);
    } catch (e: any) {
      setError(e.message || 'Analyze failed');
    } finally {
      setBusy('');
    }
  };

  const runConstruct = async () => {
    setBusy('Assembling OSK Tet-On construct…');
    try {
      setConstruct(
        await assembleConstruct({
          capsid: disease?.capsid || 'aav9',
          objectives: analysis?.objectives || [],
        }),
      );
    } finally {
      setBusy('');
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

  const runInterpret = async () => {
    setBusy('Writing plain-language summary…');
    try {
      const payload = buildPayload(analysis, construct, ranked, undefined, disease);
      setInterpretation((await interpret(payload)) || '(interpretation unavailable offline)');
    } finally {
      setBusy('');
    }
  };

  const payload = () => buildPayload(analysis, construct, ranked, interpretation, disease);

  const ea = analysis?.epigenetic_age;
  const showA = approach !== 'molecules';
  const showB = approach !== 'er100';

  return (
    <div className="container-x py-10">
      {/* Connected banner */}
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />
        <p className="text-sm font-semibold text-green-800">
          Local research pipeline connected — your data stays on this machine.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="icon-tile h-12 w-12"><Icon name="dna" className="h-6 w-6" /></span>
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink-900">Protocol Simulator — live</h1>
          <p className="text-ink-700/70">Pick a disease → dataset → real epigenetic age → ER-100 construct &amp; De Novo LLM molecules.</p>
        </div>
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
                  {([['both', 'Both'], ['er100', 'ER-100 reprogramming'], ['molecules', 'Novel molecules']] as [Approach, string][]).map(([val, lbl]) => (
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
                <dt className="text-ink-700/50">ER-100 tissue</dt><dd className="font-semibold text-ink-900">{disease.tissue}</dd>
                <dt className="text-ink-700/50">AAV capsid</dt><dd className="font-semibold text-ink-900">{disease.capsid.toUpperCase()}</dd>
                <dt className="text-ink-700/50">Delivery</dt><dd className="font-semibold text-ink-900">{disease.construct_route}</dd>
              </dl>
              {disease.dataset ? (
                <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800">
                  Curated dataset: <b>{disease.dataset.accession}</b> · {disease.dataset.platform} · {disease.dataset.tissue}
                  {disease.dataset.has_age ? ' · has ages' : ' · no ages'} · {disease.dataset.condition}
                </p>
              ) : (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  No curated dataset wired yet — upload your own methylation file below.
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
              <p className="text-sm font-semibold text-ink-800">Curated dataset — {disease.dataset.accession}</p>
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

          <label className="mt-4 block text-sm font-semibold text-ink-800">Methylation file (beta values)</label>
          <input ref={methRef} type="file" accept=".csv,.txt,.tsv,.gz" className="mt-1 w-full text-sm"
                 onChange={(e) => pickMeth(e.target.files?.[0] ?? null)} />

          {samples.length > 0 && (
            <>
              <label className="mt-3 block text-sm font-semibold text-ink-800">Sample</label>
              <select value={sample} onChange={(e) => setSample(e.target.value)} className="input mt-1">
                <option value="">First sample</option>
                {samples.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </>
          )}
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
              </div>
              <p className="mt-2 text-xs text-ink-700/50">Clock: {ea.clock} · {ea.n_used}/{ea.n_total} CpGs.</p>

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

      {/* 4 + 5: Track A construct & Track B molecules */}
      {analysis && (
        <section className={`mt-6 grid gap-6 ${showA && showB ? 'lg:grid-cols-2' : ''}`}>
          {/* Track A */}
          {showA && (
          <div className="card p-6">
            <h2 className="font-display text-lg font-bold text-ink-900">4 · ER-100 OSK Tet-On construct <span className="text-xs font-normal text-ink-700/50">· Track A</span></h2>
            {disease && (
              <p className="mt-1 text-xs text-ink-700/60">Presets for <b>{disease.disease}</b>: {disease.tissue} · capsid {disease.capsid.toUpperCase()}.</p>
            )}
            {!construct ? (
              <button onClick={runConstruct} disabled={!!busy} className="btn-outline mt-4 px-5 py-2.5 disabled:opacity-50">Assemble construct</button>
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
                {optimizeFor === 'custom' && (
                  <input value={customLogp} onChange={(e) => setCustomLogp(e.target.value)} inputMode="decimal"
                         placeholder="target logP, e.g. 2.5" className="input mt-2" />
                )}
                <p className="mt-1 text-xs text-ink-700/50">
                  Biases generation toward this physicochemical property. Note: this tunes
                  drug-likeness/deliverability — not binding to a specific target.
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
                    <thead className="text-ink-700/60"><tr><th className="pr-2">#</th><th className="pr-2">SMILES</th><th className="pr-2">rank</th><th>QED</th></tr></thead>
                    <tbody>
                      {ranked.candidates.slice(0, 25).map((c: any, i: number) => (
                        <tr key={i} className="border-t border-cream-200">
                          <td className="pr-2">{i + 1}</td>
                          <td className="pr-2 font-mono">{c.seq}</td>
                          <td className="pr-2">{c.scores?.rank_score ?? '—'}</td>
                          <td>{c.scores?.qed ?? '—'}</td>
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

function buildPayload(analysis: any, construct: any, ranked: any, interpretation?: string | null, disease?: DiseaseEntry | null) {
  return {
    disease: disease ? { name: disease.disease, department: disease.department, tissue: disease.tissue, capsid: disease.capsid } : undefined,
    epigenetic_age: analysis?.epigenetic_age,
    targets: analysis?.targets,
    construct,
    candidates: ranked?.candidates,
    interpretation: interpretation || undefined,
  };
}
