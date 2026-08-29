import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon';
import {
  analyze,
  assembleConstruct,
  datasetSamples,
  deliverExosome,
  engines,
  getCatalog,
  listSamples,
  reportPdf,
  startDatasetDownload,
  startDesign,
  streamJob,
  type Catalog,
  type DiseaseEntry,
} from '../api/simulator';

/**
 * Conversational, chat-driven Simulator (the "De Novo assistant, live").
 *
 * The real pipeline runs on the local backend; this wraps it in one guided
 * conversation: pick a disease → dataset → real epigenetic age → the single
 * branching question (ER-100 reprogramming vs novel molecule) → carrier
 * (AAV vs IV exosome) → therapy. Deterministic + on-device; no data leaves.
 */
type Role = 'assistant' | 'user';
interface Msg { id: number; role: Role; node: React.ReactNode; }
type Stage = 'disease' | 'data' | 'approach' | 'carrierA' | 'optimize' | 'carrierB' | 'done';
type Carrier = 'aav' | 'exosome' | 'plain';

let _id = 0;
const nid = () => ++_id;

export default function SimulatorChat({ onExit }: { onExit?: () => void }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [engineReady, setEngineReady] = useState<{ available: boolean; reason: string } | null>(null);

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [stage, setStage] = useState<Stage>('disease');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const [diseaseKey, setDiseaseKey] = useState('');
  const [query, setQuery] = useState('');
  const [datasetLabel, setDatasetLabel] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [dlMsg, setDlMsg] = useState('');
  const [methFile, setMethFile] = useState<File | null>(null);
  const [samples, setSamples] = useState<string[]>([]);
  const [sample, setSample] = useState('');
  const [age, setAge] = useState('');
  const [optimizeFor, setOptimizeFor] = useState('qed');

  const [analysis, setAnalysis] = useState<any>(null);
  const [construct, setConstruct] = useState<any>(null);
  const [ranked, setRanked] = useState<any>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const disease: DiseaseEntry | null = useMemo(
    () => catalog?.diseases.find((d) => d.key === diseaseKey) ?? null,
    [catalog, diseaseKey],
  );

  useEffect(() => {
    getCatalog().then(setCatalog).catch(() => setError('Backend not reachable.'));
    engines().then((e) => setEngineReady(e['denovo-llm'])).catch(() => {});
    say('assistant', <p>Hi — I’m the <b>De Novo assistant</b>. Tell me which disease you’d like to develop a therapy for, or pick one below. Your genomic data stays on this machine.</p>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, busy]);

  const say = (role: Role, node: React.ReactNode) => setMsgs((m) => [...m, { id: nid(), role, node }]);

  // --- disease selection --------------------------------------------------
  const matchDisease = (text: string): DiseaseEntry | null => {
    if (!catalog) return null;
    const q = text.toLowerCase().trim();
    if (!q) return null;
    return (
      catalog.diseases.find((d) => d.disease.toLowerCase() === q) ||
      catalog.diseases.find((d) => d.disease.toLowerCase().includes(q)) ||
      catalog.diseases.find((d) => q.split(/\s+/).some((w) => w.length > 3 && d.disease.toLowerCase().includes(w))) ||
      null
    );
  };

  const chooseDisease = (d: DiseaseEntry, userText?: string) => {
    say('user', <span>{userText || d.disease}</span>);
    setDiseaseKey(d.key);
    setDatasetLabel('');
    setMethFile(null);
    setSamples([]);
    setSample('');
    setAnalysis(null);
    setConstruct(null);
    setRanked(null);
    setError('');
    setOptimizeFor(chatDefaultOptimizeFor(d.tissue_key));
    if (d.dataset?.downloaded) {
      setDatasetLabel(d.dataset.label);
      datasetSamples(d.dataset.label).then(setSamples).catch(() => {});
    }
    say('assistant', (
      <div>
        <p><b>{d.disease}</b> — {d.department}. For an ER-100 reprogramming construct I’d target <b>{d.tissue}</b> (capsid {d.capsid.toUpperCase()}).</p>
        {d.dataset
          ? <p className="mt-1">A curated methylation dataset is available (<b>{d.dataset.accession}</b>, {d.dataset.tissue}). Download it, or upload your own file.</p>
          : <p className="mt-1">No curated dataset for this one yet — upload the patient’s methylation file below.</p>}
      </div>
    ));
    setStage('data');
  };

  const submitQuery = () => {
    const d = matchDisease(query);
    if (d) { chooseDisease(d, query); setQuery(''); }
    else { say('user', <span>{query}</span>); say('assistant', <p>I couldn’t match that to a listed therapy — pick the closest one from the menu.</p>); setQuery(''); }
  };

  // --- data ---------------------------------------------------------------
  const runDownload = async () => {
    if (!disease?.dataset) return;
    setError(''); setDownloading(true); setDlMsg('starting…'); setMethFile(null); setSamples([]); setSample('');
    try {
      const { job_id, label } = await startDatasetDownload(disease.key, 8);
      const final = await streamJob(job_id, (ev) => ev.message && setDlMsg(ev.message));
      if (final.status === 'error') setError(final.error || 'Download failed');
      else {
        setDatasetLabel(label);
        setSamples(final.result?.samples || []);
        say('assistant', <p>✓ Dataset ready — {(final.result?.samples || []).length} samples prepared. Pick a sample (optional) and compute the epigenetic age.</p>);
      }
    } catch (e: any) { setError(e.message || 'Download failed'); }
    finally { setDownloading(false); }
  };

  const pickMeth = async (f: File | null) => {
    setMethFile(f); setDatasetLabel(''); setSamples([]); setSample('');
    if (f) { try { setSamples(await listSamples(f)); } catch { /* single sample */ } }
  };

  const runAnalyze = async () => {
    if (!(methFile || datasetLabel)) return;
    setError(''); setBusy('Computing epigenetic age…');
    say('user', <span>Compute epigenetic age{sample ? ` for ${sample}` : ''}.</span>);
    try {
      const res = await analyze({
        methylation: methFile, dataset: datasetLabel || undefined,
        sample: sample || undefined, chronologicalAge: age ? Number(age) : null,
        tissueKey: disease?.tissue_key,
      });
      setAnalysis(res);
      const ea = res.epigenetic_age;
      say('assistant', (
        <div>
          <p>Biological age (Horvath clock): <b className="text-clay-700">{ea.dnam_age} yr</b>
            {ea.age_acceleration != null && <> · acceleration <b>{ea.age_acceleration > 0 ? '+' : ''}{ea.age_acceleration} yr</b></>}
            {' '}· coverage {Math.round(ea.coverage * 100)}% ({ea.n_used}/{ea.n_total} CpGs).</p>
          {res.rejuvenation && (
            <p className="mt-1 text-ink-700/70">
              Reprogramming projection: <b className="text-clay-700">−{res.rejuvenation.years_reversed} yr</b> reversed →
              projected DNAm age <b>{res.rejuvenation.projected_age} yr</b> · tissue rejuvenation {res.rejuvenation.tissue_rejuvenation_index}%
              <span className="text-ink-700/50"> (projected, not measured)</span>.
            </p>
          )}
          {res.targets?.length > 0 && (
            <p className="mt-1 text-ink-700/70">Top drivers: {res.targets.slice(0, 4).map((t: any) => `${t.gene || t.cpg} (${t.direction})`).join(', ')}.</p>
          )}
          <p className="mt-2">How would you like to build the therapy?</p>
        </div>
      ));
      setStage('approach');
    } catch (e: any) { setError(e.message || 'Analyze failed'); }
    finally { setBusy(''); }
  };

  // --- approach fork ------------------------------------------------------
  const chooseApproach = (a: 'er100' | 'molecule') => {
    if (a === 'er100') {
      say('user', <span>ER-100 epigenetic reprogramming (OSK).</span>);
      say('assistant', <p>Good — controlled OCT4·SOX2·KLF4 reprogramming. Which carrier should deliver it?</p>);
      setStage('carrierA');
    } else {
      say('user', <span>Design a novel molecule.</span>);
      say('assistant', <p>I’ll drive De-Novo-LLM to generate candidate molecules. What should I optimise them for?</p>);
      setStage('optimize');
    }
  };

  // --- Track A carrier ----------------------------------------------------
  const runConstruct = async (carrier: Carrier) => {
    setError(''); setBusy('Assembling…');
    say('user', <span>{carrier === 'exosome' ? 'IV exosome carrier.' : 'AAV carrier.'}</span>);
    try {
      const res = await assembleConstruct({
        carrier, capsid: disease?.capsid || 'aav9',
        tissue_key: disease?.tissue_key, tissue_label: disease?.tissue,
        objectives: analysis?.objectives || [],
      });
      setConstruct(res);
      say('assistant', carrier === 'exosome' ? exosomeBubble(res.exosome) : aavBubble(res));
      say('assistant', <p className="mt-1">That’s a complete ER-100-style protocol for <b>{disease?.disease}</b>. Export it, or start another therapy.</p>);
      setStage('done');
    } catch (e: any) { setError(e.message || 'Assembly failed'); }
    finally { setBusy(''); }
  };

  // --- Track B generate + carrier ----------------------------------------
  const runDesign = async () => {
    setError(''); setBusy('Generating candidate molecules…');
    say('user', <span>Optimise for {optLabel(optimizeFor)}.</span>);
    try {
      const jobId = await startDesign({ modality: 'smiles', n: 100, ...designProps(optimizeFor), objectives: analysis?.objectives || [] });
      const final = await streamJob(jobId, (ev) => ev.message && setBusy(`De Novo LLM · ${ev.message}`));
      if (final.status === 'error') { setError(final.error || 'Generation failed'); return; }
      setRanked(final.result);
      const r = final.result;
      say('assistant', (
        <div>
          <p>{r.n_valid}/{r.n_generated} valid · {r.n_unique} unique candidates. Top hits:</p>
          <div className="mt-1 space-y-0.5 font-mono text-xs text-ink-800">
            {r.candidates.slice(0, 4).map((c: any, i: number) => (
              <div key={i} className="truncate">{i + 1}. {c.seq} {c.scores?.qed != null && <span className="text-ink-700/50">· QED {c.scores.qed}</span>}</div>
            ))}
          </div>
          <p className="mt-2">How should we deliver the lead molecule?</p>
        </div>
      ));
      setStage('carrierB');
    } catch (e: any) { setError(e.message || 'Design failed'); }
    finally { setBusy(''); }
  };

  const chooseCarrierB = async (carrier: Carrier) => {
    say('user', <span>{carrier === 'exosome' ? 'IV exosome carrier.' : 'Plain IV (free molecule).'}</span>);
    if (carrier === 'exosome') {
      setBusy('Designing exosome carrier…');
      try {
        const spec = await deliverExosome({
          tissue_key: disease?.tissue_key, tissue_label: disease?.tissue,
          smiles: ranked?.candidates?.[0]?.seq,
        });
        say('assistant', exosomeBubble(spec));
      } catch (e: any) { setError(e.message || 'Carrier design failed'); }
      finally { setBusy(''); }
    } else {
      say('assistant', <p>Noted — lead molecule delivered as a standard IV small-molecule formulation (normal pharmacokinetics).</p>);
    }
    say('assistant', <p className="mt-1">That’s a candidate molecular therapy for <b>{disease?.disease}</b>. Export it, or start another.</p>);
    setStage('done');
  };

  const restart = () => {
    setMsgs([]); setStage('disease'); setDiseaseKey(''); setQuery(''); setDatasetLabel('');
    setMethFile(null); setSamples([]); setSample(''); setAge(''); setAnalysis(null);
    setConstruct(null); setRanked(null); setError(''); setOptimizeFor('qed');
    say('assistant', <p>Fresh start — which disease next?</p>);
  };

  const exportReport = () => reportPdf({
    disease: disease ? { name: disease.disease, department: disease.department, tissue: disease.tissue, capsid: disease.capsid } : undefined,
    epigenetic_age: analysis?.epigenetic_age, targets: analysis?.targets,
    construct, candidates: ranked?.candidates,
  });

  return (
    <div className="container-x py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="icon-tile h-11 w-11"><Icon name="ai" className="h-6 w-6" /></span>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-ink-900">De Novo Assistant — live</h1>
            <p className="text-xs text-ink-700/60">Methylation → epigenetic age → ER-100 construct or novel molecule → IV carrier. On-device.</p>
          </div>
        </div>
        {onExit && <button onClick={onExit} className="btn-ghost px-3 py-1.5 text-xs">Advanced view →</button>}
      </div>

      <div className="card flex h-[70vh] flex-col overflow-hidden">
        {/* Transcript */}
        <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
          {msgs.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-clay-500 text-white' : 'bg-cream-100 text-ink-800'}`}>
                {m.node}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="flex max-w-[85%] items-center gap-2 rounded-2xl bg-cream-100 px-4 py-2.5 text-sm text-ink-700/70">
                <span className="cell-loader"><span className="m" /><span className="n" /><span className="bud" /></span>
                {busy}
              </div>
            </div>
          )}
          {error && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</p>}
        </div>

        {/* Control dock — changes with the conversation stage */}
        <div className="border-t border-cream-200 bg-white p-3 sm:p-4">
          {stage === 'disease' && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={query} onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitQuery()}
                placeholder="e.g. Parkinson's, ankylosing spondylitis, reverse ageing…"
                className="input flex-1"
              />
              <select value="" onChange={(e) => { const d = catalog?.diseases.find((x) => x.key === e.target.value); if (d) chooseDisease(d); }} className="input sm:w-56">
                <option value="">Or pick a disease…</option>
                {catalog?.departments.map((dept) => (
                  <optgroup key={dept} label={dept}>
                    {catalog.diseases.filter((d) => d.department === dept).map((d) => (
                      <option key={d.key} value={d.key}>{d.disease}{d.dataset_ready ? ' ●' : ''}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}

          {stage === 'data' && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-end gap-2">
                {disease?.dataset && (
                  <button onClick={runDownload} disabled={downloading || !!busy} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
                    {downloading ? 'Downloading…' : datasetLabel ? 'Re-download' : `Download ${disease.dataset.accession}`}
                  </button>
                )}
                <label className="btn-outline cursor-pointer px-4 py-2 text-sm">
                  Upload methylation
                  <input type="file" accept=".csv,.txt,.tsv,.gz" className="hidden" onChange={(e) => pickMeth(e.target.files?.[0] ?? null)} />
                </label>
                {samples.length > 0 && (
                  <select value={sample} onChange={(e) => setSample(e.target.value)} className="input w-40">
                    <option value="">First sample</option>
                    {samples.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
                <input value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" placeholder="age (opt)" className="input w-24" />
                <button onClick={runAnalyze} disabled={!(methFile || datasetLabel) || !!busy} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
                  Compute age →
                </button>
              </div>
              {downloading && <p className="text-xs text-ink-700/60">{dlMsg}</p>}
              {(methFile || datasetLabel) && !downloading && <p className="text-xs text-green-700">✓ Data ready{samples.length ? ` · ${samples.length} samples` : ''}</p>}
            </div>
          )}

          {stage === 'approach' && (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => chooseApproach('er100')} className="btn-primary px-4 py-2.5 text-sm">🧬 ER-100 reprogramming (OSK)</button>
              <button onClick={() => chooseApproach('molecule')} className="btn-outline px-4 py-2.5 text-sm">⚗️ Design a novel molecule</button>
            </div>
          )}

          {stage === 'carrierA' && (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => runConstruct('aav')} disabled={!!busy} className="btn-outline px-4 py-2.5 text-sm disabled:opacity-50">AAV vector ({disease?.capsid.toUpperCase()})</button>
              <button onClick={() => runConstruct('exosome')} disabled={!!busy} className="btn-primary px-4 py-2.5 text-sm disabled:opacity-50">IV exosome (OSK mRNA)</button>
            </div>
          )}

          {stage === 'optimize' && (
            <div className="flex flex-wrap items-center gap-2">
              {engineReady && !engineReady.available && <span className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">De-Novo-LLM not detected: {engineReady.reason}</span>}
              <select value={optimizeFor} onChange={(e) => setOptimizeFor(e.target.value)} className="input w-56">
                <option value="qed">Drug-likeness (QED)</option>
                <option value="cns">CNS-penetrant (logP ≈ 2.5)</option>
                <option value="soluble">More soluble (low logP)</option>
                <option value="lipophilic">More lipophilic (high logP)</option>
              </select>
              <button onClick={runDesign} disabled={!!busy} className="btn-primary px-4 py-2.5 text-sm disabled:opacity-50">Generate candidates →</button>
            </div>
          )}

          {stage === 'carrierB' && (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => chooseCarrierB('exosome')} disabled={!!busy} className="btn-primary px-4 py-2.5 text-sm disabled:opacity-50">IV exosome carrier</button>
              <button onClick={() => chooseCarrierB('plain')} disabled={!!busy} className="btn-outline px-4 py-2.5 text-sm disabled:opacity-50">Plain IV (free molecule)</button>
            </div>
          )}

          {stage === 'done' && (
            <div className="flex flex-wrap gap-2">
              <button onClick={exportReport} className="btn-primary px-4 py-2.5 text-sm">Export PDF report</button>
              <button onClick={restart} className="btn-outline px-4 py-2.5 text-sm">Start another therapy</button>
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-ink-700/50">
        Local research tool. Epigenetic age is real (Horvath 2013); the construct, molecules and carrier are illustrative
        research designs — not validated therapeutics, not medical advice.
      </p>
    </div>
  );
}

// --- bubble renderers -----------------------------------------------------
function aavBubble(res: any) {
  return (
    <div>
      <p><b>AAV construct</b> — {res.strategy} · capsid {res.capsid_desc}</p>
      {res.vectors.map((v: any) => (
        <p key={v.name} className="mt-1 text-xs text-ink-700/70"><b>{v.name}</b> — {v.length_bp} bp {v.fits_aav ? '✓ fits AAV' : '✗ over limit'}</p>
      ))}
      <p className="mt-1 text-xs italic text-ink-700/50">{res.dox_protocol?.logic}</p>
    </div>
  );
}

function exosomeBubble(ex: any) {
  if (!ex) return <p>Exosome spec unavailable.</p>;
  return (
    <div>
      <p><b>IV exosome delivery</b> — {ex.payload} · {ex.route}</p>
      <p className="mt-1 text-xs text-ink-700/70">{ex.cargo}</p>
      <p className="mt-1 text-xs text-ink-700/70"><b>Targeting:</b> {ex.targeting.ligand} <span className="text-ink-700/50">— {ex.targeting.note}</span></p>
      <ul className="mt-1 list-disc pl-4 text-xs text-ink-700/70">
        {ex.advantages.slice(0, 3).map((a: string, i: number) => <li key={i}>{a}</li>)}
      </ul>
    </div>
  );
}

// --- helpers --------------------------------------------------------------
function optLabel(v: string) {
  return { qed: 'drug-likeness', cns: 'CNS penetration', soluble: 'solubility', lipophilic: 'lipophilicity' }[v] || v;
}
function chatDefaultOptimizeFor(tissueKey?: string): string {
  switch (tissueKey) {
    case 'cns':
    case 'retina':
      return 'cns';
    case 'kidney':
      return 'soluble';
    default:
      return 'qed';
  }
}
function designProps(optimizeFor: string) {
  switch (optimizeFor) {
    case 'cns': return { property: 'logp', mode: 'target', target_value: 2.5 };
    case 'soluble': return { property: 'logp', mode: 'min' };
    case 'lipophilic': return { property: 'logp', mode: 'max' };
    default: return { property: 'qed', mode: 'max' };
  }
}
