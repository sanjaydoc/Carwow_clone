// Client for the LOCAL Simulator backend (runs on the user's laptop only).
//
// On the public site there is no backend, so `checkBackend()` fails and the
// Simulator falls back to the existing illustrative demo — production is
// unaffected. When the backend is served (http://localhost:8000) the same-origin
// calls below light up the real pipeline.

function base(): string {
  const override = (typeof window !== 'undefined' && (window as any).SIM_API) || '';
  return (override || '').replace(/\/$/, ''); // '' = same origin
}

const api = (path: string) => `${base()}${path}`;

export async function checkBackend(timeoutMs = 1500): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(api('/api/health'), { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return false;
    const j = await res.json();
    return !!j.ok;
  } catch {
    return false;
  }
}

export async function health(): Promise<any> {
  return (await fetch(api('/api/health'))).json();
}

// --- Disease catalogue + curated datasets (disease-driven flow) -------------
export interface DiseaseEntry {
  key: string;
  department: string;
  disease: string;
  category: string;
  route: string;
  status: string;
  default_approach: string;
  tissue_key: string;
  tissue: string;
  capsid: string;
  construct_route: string;
  dataset_ready: boolean;
  dataset: null | {
    accession: string;
    platform: string;
    tissue: string;
    condition: string;
    has_age: boolean;
    n: number;
    note: string;
    label: string;
    downloaded: boolean;
    proxy?: boolean;
  };
}

export interface Catalog {
  departments: string[];
  diseases: DiseaseEntry[];
  capsids: Record<string, string>;
}

export async function getCatalog(): Promise<Catalog> {
  const res = await fetch(api('/api/catalog'));
  if (!res.ok) throw new Error('catalog failed');
  return res.json();
}

/** Kick off a curated dataset download+prep; returns the job id + label. */
export async function startDatasetDownload(diseaseKey: string, samples = 8): Promise<{ job_id: string; label: string; accession: string }> {
  const res = await fetch(api('/api/dataset/download'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ disease: diseaseKey, samples }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || 'Download failed');
  return res.json();
}

/** Kick off a case-vs-control batch compare across all samples of a disease's dataset. */
export async function startBatch(diseaseKey: string, cap = 400): Promise<{ job_id: string; accession: string }> {
  const res = await fetch(api('/api/batch'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ disease: diseaseKey, cap }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || 'Batch failed');
  return res.json();
}

/** Convert a WGBS/RRBS sequencing file to a clock-ready dataset (server-side). */
export async function convertWgbs(opts: {
  wgbs: File;
  manifest?: File | null;
  build: string;
  label?: string;
}): Promise<{ label: string; matched: number; total: number; coverage: number; samples: string[]; note: string }> {
  const fd = new FormData();
  fd.append('wgbs', opts.wgbs);
  if (opts.manifest) fd.append('manifest', opts.manifest);
  fd.append('build', opts.build);
  fd.append('label', opts.label || 'wgbs');
  const res = await fetch(api('/api/convert/wgbs'), { method: 'POST', body: fd });
  if (!res.ok) throw new Error((await res.json()).detail || 'Convert failed');
  return res.json();
}

export interface ConvertedFile { label: string; file: string; samples: string[]; modified: number; }

/** List the user's own converted/uploaded methylation files on the backend (reload-safe). */
export async function listConverted(): Promise<ConvertedFile[]> {
  try {
    const res = await fetch(api('/api/converted/list'));
    if (!res.ok) return [];
    return (await res.json()).converted || [];
  } catch {
    return [];
  }
}

export async function datasetSamples(label: string): Promise<string[]> {
  const res = await fetch(api(`/api/dataset/samples?label=${encodeURIComponent(label)}`));
  if (!res.ok) return [];
  return (await res.json()).samples || [];
}

export async function listSamples(methylation: File): Promise<string[]> {
  const fd = new FormData();
  fd.append('methylation', methylation);
  const res = await fetch(api('/api/samples'), { method: 'POST', body: fd });
  return (await res.json()).samples || [];
}

export async function analyze(opts: {
  methylation?: File | null;
  dataset?: string | null;
  genotype?: File | null;
  sample?: string;
  chronologicalAge?: number | null;
  tissueKey?: string | null;
  department?: string | null;
  topTargets?: number;
}): Promise<any> {
  const fd = new FormData();
  if (opts.methylation) fd.append('methylation', opts.methylation);
  if (opts.dataset) fd.append('dataset', opts.dataset);
  if (opts.genotype) fd.append('genotype', opts.genotype);
  if (opts.sample) fd.append('sample', opts.sample);
  if (opts.chronologicalAge != null) fd.append('chronological_age', String(opts.chronologicalAge));
  if (opts.tissueKey) fd.append('tissue_key', opts.tissueKey);
  if (opts.department) fd.append('department', opts.department);
  fd.append('top_targets', String(opts.topTargets ?? 20));
  const res = await fetch(api('/api/analyze'), { method: 'POST', body: fd });
  if (!res.ok) throw new Error((await res.json()).detail || 'Analyze failed');
  return res.json();
}

export async function assembleConstruct(spec: any = {}): Promise<any> {
  const res = await fetch(api('/api/construct'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(spec),
  });
  return res.json();
}

/** Design an IV exosome carrier for a novel small molecule (Track B). */
export async function deliverExosome(spec: any = {}): Promise<any> {
  const res = await fetch(api('/api/deliver/exosome'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(spec),
  });
  return res.json();
}

export async function engines(): Promise<any> {
  return (await fetch(api('/api/engines'))).json();
}

export async function startDesign(spec: any): Promise<string> {
  const res = await fetch(api('/api/design'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(spec),
  });
  return (await res.json()).job_id;
}

/** Stream a design job's progress; resolves with the final job snapshot. */
export function streamJob(jobId: string, onEvent: (e: any) => void): Promise<any> {
  return new Promise((resolve, reject) => {
    const es = new EventSource(api(`/api/jobs/${jobId}/stream`));
    let last: any = null;
    es.onmessage = (m) => {
      try {
        const data = JSON.parse(m.data);
        last = data;
        onEvent(data);
        if (data.status === 'done' || data.status === 'error') {
          es.close();
          resolve(data);
        }
      } catch {
        /* ignore keepalives */
      }
    };
    es.onerror = () => {
      es.close();
      if (last) resolve(last);
      else reject(new Error('stream error'));
    };
  });
}

async function download(path: string, payload: any, filename: string) {
  const res = await fetch(api(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const reportPdf = (payload: any) => download('/api/report/pdf', payload, 'simulator-report.pdf');
export const reportCsv = (payload: any) => download('/api/report/csv', payload, 'candidates.csv');

export async function interpret(payload: any): Promise<string | null> {
  const res = await fetch(api('/api/interpret'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return (await res.json()).interpretation;
}
