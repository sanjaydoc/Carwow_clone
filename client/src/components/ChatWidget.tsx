import { useEffect, useRef, useState } from 'react';
import {
  streamChat,
  fileToBase64,
  isChatConfigured,
  type ChatMessage,
  type ContentBlock,
} from '../api/chat';
import { saveRow } from '../api/supabase';
import { runPipeline, type PipelineResult } from '../sim/pipeline';
import { buildRun, type FullRun } from '../sim/full';
import { CATALOG, DEFAULT_DISEASE } from '../sim/catalog';
import { impliedCondition } from '../sim/immune';
import ConditionPicker from './ConditionPicker';
import SimRun from './SimRun';

interface Attachment {
  file: File;
  kind: 'image' | 'document' | 'methylation';
  previewUrl?: string;
}

interface UIMsg {
  role: 'user' | 'assistant';
  text: string;
  attachments?: { name: string; kind: 'image' | 'document' | 'methylation' }[];
  sim?: FullRun;      // an animated simulator run rendered in place of text
  simSeen?: boolean;  // true once its animation has played — restore it instantly
}

const MAX_IMAGE_MB = 5;
const MAX_PDF_MB = 10;
const MAX_METH_MB = 40;
// Methylation inputs the browser pipeline can read (array beta CSV or bisulfite .cov/bedGraph).
const METH_EXT = /\.(csv|cov|tsv|txt|bedgraph|bed)$/i;
const GREETING =
  "Hi — I'm the StemCells Protocol assistant. Ask about our therapies, or 📎 attach an ECG, X-ray, MRI, CT, prescription or lab report and I'll explain it in simple words. You can also 🧬 attach your DNA-methylation file (.csv / .cov) and I'll compute your biological age and a personalized reprogramming + safety envelope — on your device, your genome never leaves it. Educational / research support, not a diagnosis or medical advice.";

const SUGGESTIONS = [
  'Explain my prescription, X-ray, MRI or CT',
  'Upload my DNA-methylation file (.csv/.cov)',
  'What is Persona Reversal?',
];

// Compact, deterministic summary of a pipeline run — this (never the raw file)
// is what we hand the model to explain in plain language.
function summarizePipeline(name: string, r: PipelineResult): string {
  const ea = r.epigenetic_age; const rej = r.rejuvenation; const t = r.tumor;
  const accel = ea.ageAcceleration != null ? `${ea.ageAcceleration >= 0 ? '+' : ''}${ea.ageAcceleration.toFixed(1)} yr` : 'not provided (no chronological age given)';
  const top = r.targets.slice(0, 6).map((x) => `${x.cpg} (${x.gene || '-'}, ${x.direction})`).join(', ');
  return [
    `StemCells Protocol simulator — on-device run of "${name}" (raw genome NOT uploaded).`,
    `Clock: ${ea.clock} · CpG coverage ${ea.nUsed}/${ea.nTotal} (${Math.round(ea.coverage * 100)}%).`,
    `Biological (DNAm) age: ${ea.dnamAge.toFixed(1)} yr. Chronological age: ${ea.chronologicalAge ?? 'not provided'}. Age acceleration: ${accel}.`,
    `Reprogramming projection (${rej.tissue_key} tissue, ${rej.cycles} cycle): ${ea.dnamAge.toFixed(1)} → ${rej.projected_age} yr (−${rej.years_reversed} yr), tissue rejuvenation index ${rej.tissue_rejuvenation_index}%.`,
    `Tumorigenicity safety envelope: ${t.risk_tier} tier, ~${Math.round(t.estimated_risk * 100)}% over-induction risk at ${t.requested_cycles} cycle(s); max safe cycles ${t.max_safe_cycles}; tissue proliferation ${t.tissue_proliferation_factor}× (${t.tissue_key}).`,
    t.flags.length ? `Flags: ${t.flags.join(' ')}` : '',
    `Top target CpGs: ${top}.`,
    `Framing: research/illustrative — the age-reversal figure is a model projection, not a measured outcome; the safety envelope estimates and mitigates tumorigenicity risk, it does not eliminate it. Not medical advice.`,
  ].filter(Boolean).join('\n');
}

// Language code (for speech) → English name (for the reply instruction).
const LANG_NAME: Record<string, string> = {
  'en-IN': 'English',
  'ta-IN': 'Tamil',
  'hi-IN': 'Hindi',
  'ml-IN': 'Malayalam',
  'te-IN': 'Telugu',
  'kn-IN': 'Kannada',
  'bn-IN': 'Bengali',
  'mr-IN': 'Marathi',
  'ur-PK': 'Urdu',
  'ar-SA': 'Arabic',
  'fr-FR': 'French',
  'de-DE': 'German',
  'es-ES': 'Spanish',
  'it-IT': 'Italian',
  'pt-PT': 'Portuguese',
  'ru-RU': 'Russian',
  'nl-NL': 'Dutch',
  'zh-CN': 'Chinese',
  'ja-JP': 'Japanese',
  'ko-KR': 'Korean',
  'ms-MY': 'Malay',
};

// Persist the conversation so history + memory survive closing the widget,
// navigating away, or reloading the page.
const STORAGE_KEY = 'stemcells_chat_history_v1';
const LANG_KEY = 'stemcells_chat_lang_v1';
const DOCTOR_KEY = 'stemcells_chat_doctor_v1';

function loadMessages(): UIMsg[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    // Restored simulator runs render instantly (no replay).
    return parsed.map((m: any) => (m && m.sim ? { ...m, simSeen: true } : m));
  } catch {
    return [];
  }
}

const OPEN_KEY = 'scp_chat_open';

export default function ChatWidget() {
  // Persist the open state for the browser session so a remount (e.g. a mobile
  // browser reloading the page after the native file picker, or a parent
  // re-render) does not "kick the user out" of the chat mid-upload.
  const [open, setOpen] = useState<boolean>(() => {
    try { return sessionStorage.getItem(OPEN_KEY) === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { sessionStorage.setItem(OPEN_KEY, open ? '1' : '0'); } catch { /* ignore */ }
  }, [open]);
  const [messages, setMessages] = useState<UIMsg[]>(loadMessages);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [simDisease, setSimDisease] = useState(DEFAULT_DISEASE.key);
  const [simAge, setSimAge] = useState('');
  const [simComorbid, setSimComorbid] = useState<string[]>([]);
  const [voiceLang, setVoiceLang] = useState(() => {
    try {
      return localStorage.getItem(LANG_KEY) || '';
    } catch {
      return '';
    }
  });
  const [doctorMode, setDoctorMode] = useState(() => {
    try {
      return localStorage.getItem(DOCTOR_KEY) === '1';
    } catch {
      return false;
    }
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const configured = isChatConfigured();
  const speechSupported =
    typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // ---- Voice input (Web Speech API) ----
  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = voiceLang || navigator.language || 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let t = '';
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setInput(t);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  // ---- Export / save the conversation ----
  const transcriptRows = () =>
    messages
      .filter((m) => m.text && !m.text.startsWith('⚠️'))
      .map((m) => ({ who: m.role === 'user' ? 'You' : 'StemCells Protocol AI', text: m.text }));

  const downloadBlob = (content: BlobPart, mime: string, filename: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const transcriptHtml = () => {
    // Render the assistant's Markdown to clean HTML so exports show bold,
    // headings and bullets instead of raw ** and ## symbols.
    const rows = transcriptRows()
      .map(
        (r) =>
          `<div style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:13px;line-height:1.5"><b style="color:#2f6fe0">${r.who}:</b><div>${mdToHtml(
            r.text,
          )}</div></div>`,
      )
      .join('');
    const when = new Date().toLocaleString();
    return `<h2 style="font-family:Arial,sans-serif">StemCells Protocol — chat summary</h2><p style="color:#666;font-family:Arial,sans-serif;font-size:12px">${when}</p><hr>${rows}<hr><p style="color:#888;font-family:Arial,sans-serif;font-size:11px">Educational information only — not a diagnosis or prescription. Confirm with your doctor.</p>`;
  };

  // Strip Markdown for the plain-text export.
  const stripMd = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^\s*#{1,6}\s*/gm, '')
      .replace(/^\s*[-*]\s+/gm, '• ')
      .replace(/^\s*---\s*$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

  const exportText = () => {
    const txt = transcriptRows()
      .map((r) => `${r.who}:\n${stripMd(r.text)}\n`)
      .join('\n');
    downloadBlob(txt, 'text/plain;charset=utf-8', 'stemcells-chat.txt');
    setExportOpen(false);
  };

  const exportWord = () => {
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif">${transcriptHtml()}</body></html>`;
    downloadBlob(html, 'application/msword', 'stemcells-chat.doc');
    setExportOpen(false);
  };

  const exportPdf = () => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(
        `<html><head><meta charset="utf-8"><title>StemCells Protocol chat</title></head><body>${transcriptHtml()}</body></html>`,
      );
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => iframe.remove(), 1500);
      }, 300);
    }
    setExportOpen(false);
  };

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, busy]);

  // Persist the conversation (keep the last 60 turns to stay well under quota).
  useEffect(() => {
    try {
      if (messages.length === 0) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-60)));
    } catch {
      /* storage unavailable — ignore */
    }
  }, [messages]);

  // Remember the chosen language across visits.
  useEffect(() => {
    try {
      if (voiceLang) localStorage.setItem(LANG_KEY, voiceLang);
      else localStorage.removeItem(LANG_KEY);
    } catch {
      /* ignore */
    }
  }, [voiceLang]);

  // Remember the Doctor-mode preference across visits.
  useEffect(() => {
    try {
      if (doctorMode) localStorage.setItem(DOCTOR_KEY, '1');
      else localStorage.removeItem(DOCTOR_KEY);
    } catch {
      /* ignore */
    }
  }, [doctorMode]);

  // Clean up object URLs.
  useEffect(() => {
    return () => attachments.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickFiles = (files: FileList | null) => {
    if (!files) return;
    setError('');
    const next: Attachment[] = [];
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      const isMeth = !isImage && !isPdf && METH_EXT.test(file.name);
      if (!isImage && !isPdf && !isMeth) {
        setError('Supported: DNA-methylation files (.csv/.cov/.tsv/.txt/.bedgraph), images, or PDF.');
        continue;
      }
      const mb = file.size / (1024 * 1024);
      if (isImage && mb > MAX_IMAGE_MB) {
        setError(`Images must be under ${MAX_IMAGE_MB} MB.`);
        continue;
      }
      if (isPdf && mb > MAX_PDF_MB) {
        setError(`PDFs must be under ${MAX_PDF_MB} MB.`);
        continue;
      }
      if (isMeth && mb > MAX_METH_MB) {
        setError(`Methylation files must be under ${MAX_METH_MB} MB (array beta CSV or targeted .cov).`);
        continue;
      }
      next.push({
        file,
        kind: isImage ? 'image' : isMeth ? 'methylation' : 'document',
        previewUrl: isImage ? URL.createObjectURL(file) : undefined,
      });
    }
    setAttachments((prev) => [...prev, ...next].slice(0, 4));
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeAttachment = (i: number) => {
    setAttachments((prev) => {
      const a = prev[i];
      if (a?.previewUrl) URL.revokeObjectURL(a.previewUrl);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  // ---- animated on-device simulator run ----
  const runSimulation = async (att: Attachment) => {
    setError('');
    let txt = '';
    try { txt = await att.file.text(); } catch { setError('Could not read that methylation file.'); return; }
    const dz = CATALOG.find((d) => d.key === simDisease) || DEFAULT_DISEASE;
    const sample = att.file.name.replace(/\.[^.]+$/, '');
    const run = buildRun(txt, { disease: dz, sample, chronologicalAge: simAge ? Number(simAge) : null, cycles: 1, comorbidities: simComorbid });
    if (!run.ok) { setError(run.error || 'Could not run the simulation on that file.'); return; }
    setMessages((m) => [
      ...m,
      { role: 'user', text: `Run the simulator — ${dz.disease}${simAge ? `, age ${simAge}` : ''}`, attachments: [{ name: att.file.name, kind: 'methylation' }] },
      { role: 'assistant', text: '', sim: run },
    ]);
    setInput('');
    setAttachments([]);
  };

  // Hand the deterministic run summary to the model for a plain-language read-out.
  const explainRun = async (summary: string) => {
    if (!configured) {
      setMessages((m) => [...m, { role: 'assistant', text: 'Connect the assistant to get a plain-language explanation — the results above are computed on your device.' }]);
      return;
    }
    const history: ChatMessage[] = messages.map((m) => ({ role: m.role, content: m.sim ? '(simulation run shown above)' : m.text }));
    history.push({ role: 'user', content: summary + '\n\nExplain this simulator run to the patient in clear, plain language — biological vs chronological age, the reprogramming projection, then the tumorigenicity safety envelope (why the dose is capped). Keep the research/illustrative framing; not a diagnosis.' });
    setMessages((m) => [...m, { role: 'assistant', text: '' }]);
    setBusy(true);
    const ctrl = new AbortController(); abortRef.current = ctrl;
    let acc = '';
    try {
      await streamChat({ messages: history, signal: ctrl.signal, mode: doctorMode ? 'doctor' : 'concise',
        onText: (chunk) => { acc += chunk; setMessages((m) => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], text: acc }; return c; }); } });
      if (!acc.trim()) setMessages((m) => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], text: '⚠️ No reply — tap to retry.' }; return c; });
    } catch (e: any) {
      setMessages((m) => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], text: 'Could not reach the assistant just now.' }; return c; });
    } finally { setBusy(false); }
  };

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if ((!text && attachments.length === 0) || busy) return;
    setError('');

    // A methylation file → launch the animated simulator run (not a text dump).
    const methAtt = attachments.find((a) => a.kind === 'methylation');
    if (methAtt) { await runSimulation(methAtt); return; }

    if (!configured) {
      // The on-device pipeline still works without the chat backend — compute
      // and show the deterministic results locally.
      const meth = attachments.find((a) => a.kind === 'methylation');
      if (meth) {
        try {
          const txt = await meth.file.text();
          const r = runPipeline(txt, { tissueKey: 'systemic', cycles: 1 });
          setMessages((m) => [
            ...m,
            { role: 'user', text: text || '(methylation file)', attachments: [{ name: meth.file.name, kind: 'methylation' }] },
            { role: 'assistant', text: r.ok ? summarizePipeline(meth.file.name, r) : (r.error || 'Could not read that methylation file.') },
          ]);
          setInput('');
          setAttachments([]);
          return;
        } catch { /* fall through to the generic message */ }
      }
      setMessages((m) => [
        ...m,
        { role: 'user', text: text || '(attachment)' },
        {
          role: 'assistant',
          text: "The AI assistant isn't connected on this deployment yet. In the meantime, please use “Book a consultation” and our specialist team will get back to you.",
        },
      ]);
      setInput('');
      setAttachments([]);
      return;
    }

    // Build the content blocks for the API from text + attachments. Methylation
    // files are run through the on-device pipeline — the raw genome never leaves
    // the browser; only the computed summary is sent to the model to explain.
    const blocks: ContentBlock[] = [];
    for (const a of attachments) {
      if (a.kind === 'methylation') {
        try {
          const txt = await a.file.text();
          const r = runPipeline(txt, { tissueKey: 'systemic', cycles: 1 });
          if (!r.ok) { setError(r.error || 'Could not read that methylation file.'); return; }
          blocks.push({
            type: 'text',
            text: summarizePipeline(a.file.name, r) +
              '\n\nExplain these results to the patient in clear, plain language — biological vs chronological age, the reprogramming projection, then the tumorigenicity safety envelope (why the dose is capped). Keep the research/illustrative framing; do not present it as a diagnosis or treatment.',
          });
        } catch {
          setError('Could not read that methylation file.');
          return;
        }
        continue;
      }
      try {
        const data = await fileToBase64(a.file);
        if (a.kind === 'image') {
          blocks.push({ type: 'image', source: { type: 'base64', media_type: a.file.type, data } });
        } else {
          blocks.push({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data },
          });
        }
      } catch {
        setError('Could not read one of the attached files.');
        return;
      }
    }
    if (text) blocks.push({ type: 'text', text });
    // If the patient picked a language, instruct the assistant to reply in it
    // (works even when they type in English/transliteration). Not shown in the
    // chat bubble — only sent to the model.
    if (voiceLang && LANG_NAME[voiceLang]) {
      blocks.push({ type: 'text', text: `(Please reply in ${LANG_NAME[voiceLang]}.)` });
    }

    const uiAttach = attachments.map((a) => ({ name: a.file.name, kind: a.kind }));
    const history: ChatMessage[] = messages.map((m) => ({ role: m.role, content: m.text }));
    history.push({ role: 'user', content: blocks.length ? blocks : text });

    setMessages((m) => [
      ...m,
      { role: 'user', text: text || '(attachment)', attachments: uiAttach },
      { role: 'assistant', text: '' },
    ]);
    setInput('');
    setAttachments([]);
    setBusy(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    let acc = '';
    const runStream = async () => {
      acc = '';
      await streamChat({
        messages: history,
        signal: ctrl.signal,
        mode: doctorMode ? 'doctor' : 'concise',
        onText: (chunk) => {
          acc += chunk;
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = { ...copy[copy.length - 1], text: acc };
            return copy;
          });
        },
      });
    };

    try {
      await runStream();
      // Empty reply = a transient hiccup (brief model overload / dropped
      // stream). Retry once automatically before giving up.
      if (!acc.trim() && !ctrl.signal.aborted) {
        await runStream();
      }
      if (!acc.trim() && !ctrl.signal.aborted) {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            ...copy[copy.length - 1],
            text: '⚠️ No reply came back — please tap send to try again.',
          };
          return copy;
        });
      }
      // Log the exchange to the clinic database (insert-only, RLS-protected).
      if (acc.trim()) {
        saveRow('chat_logs', {
          language: voiceLang || 'auto',
          question: text || '(attachment only)',
          answer: acc,
          had_attachment: uiAttach.length > 0,
        });
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        const detail = (e?.message || 'Could not reach the assistant.').toString();
        setMessages((m) => {
          const copy = [...m];
          const last = copy[copy.length - 1];
          if (last && last.role === 'assistant' && !last.text) {
            copy[copy.length - 1] = { ...last, text: `⚠️ ${detail}` };
          }
          return copy;
        });
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setError('');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setExportOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Launcher — sits above the hero search card */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group mb-5 flex w-full max-w-2xl items-center gap-3 rounded-2xl bg-white/10 p-3 text-left ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15 sm:p-4"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-clay-500 text-white shadow-sm">
            <SparkIcon />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-white">Ask our De Novo AI assistant</span>
            <span className="block truncate text-sm text-white/60">
              Therapies, recovery &amp; post-op care, medications — attach a report too
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80 transition group-hover:bg-white/20">
            Chat
          </span>
        </button>
      )}

      {/* Chat panel — floating on desktop, bottom sheet on mobile */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-[60] sm:inset-x-auto sm:bottom-6 sm:right-6">
          <div className="mx-auto flex h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-ink-900/10 sm:h-[600px] sm:max-h-[80vh] sm:w-[400px] sm:rounded-3xl">
            {/* Header */}
            <div className="flex items-center gap-3 bg-ink-900 px-4 py-3.5 text-white">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-clay-500">
                <SparkIcon />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold leading-tight">StemCells Protocol AI</p>
                {busy ? (
                  <p className="flex items-center gap-2 text-xs text-white/70">
                    <CellLoader /> Generating…
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-xs text-white/60">
                    <span className="h-2 w-2 rounded-full bg-green-400" /> Online · general info only
                  </p>
                )}
              </div>
              {messages.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setExportOpen((v) => !v)}
                    aria-label="Save or export chat"
                    className="grid h-8 w-8 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 3v12m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" />
                    </svg>
                  </button>
                  {exportOpen && (
                    <div className="absolute right-0 top-10 z-10 w-40 overflow-hidden rounded-xl bg-white py-1 text-ink-900 shadow-xl ring-1 ring-ink-900/10">
                      <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-700/50">
                        Save chat as
                      </p>
                      <button onClick={exportPdf} className="block w-full px-3 py-2 text-left text-sm hover:bg-cream-100">
                        📄 PDF
                      </button>
                      <button onClick={exportWord} className="block w-full px-3 py-2 text-left text-sm hover:bg-cream-100">
                        📝 Word (.doc)
                      </button>
                      <button onClick={exportText} className="block w-full px-3 py-2 text-left text-sm hover:bg-cream-100">
                        📃 Text (.txt)
                      </button>
                      <div className="my-1 border-t border-cream-300" />
                      <button
                        onClick={clearChat}
                        className="block w-full px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        Clear chat
                      </button>
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Minimise chat"
                className="grid h-8 w-8 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-cream-100 p-4">
              <Bubble role="assistant" text={GREETING} />
              {messages.length === 0 && (
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-clay-200 bg-white px-3 py-1.5 text-xs font-semibold text-clay-700 transition hover:border-clay-400 hover:bg-clay-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((m, i) => (
                m.sim ? (
                  <div key={i} className="w-full">
                    <SimRun
                      run={m.sim}
                      onExplain={explainRun}
                      instant={!!m.simSeen}
                      onDone={() => setMessages((mm) => (mm[i] && mm[i].sim && !mm[i].simSeen ? mm.map((x, xi) => (xi === i ? { ...x, simSeen: true } : x)) : mm))}
                    />
                  </div>
                ) : (
                  <Bubble
                    key={i}
                    role={m.role}
                    text={m.text}
                    attachments={m.attachments}
                    loading={busy && i === messages.length - 1 && m.role === 'assistant'}
                  />
                )
              ))}
            </div>

            {/* Composer */}
            <div className="border-t border-cream-300 bg-white p-3">
              {error && <p className="mb-2 text-xs font-semibold text-red-600">{error}</p>}
              {attachments.some((a) => a.kind === 'methylation') && (
                <div className="mb-2 rounded-xl border border-clay-200 bg-clay-50 p-3">
                  <p className="mb-2 text-xs font-bold text-clay-700">🧬 Run the Protocol Simulator</p>
                  <label className="mb-1 block text-[11px] font-semibold text-ink-800">Disease / therapy to develop for</label>
                  <select
                    value={simDisease}
                    onChange={(e) => setSimDisease(e.target.value)}
                    className="mb-2 w-full rounded-lg border border-cream-300 bg-white px-2 py-1.5 text-sm font-semibold text-ink-900 focus:border-clay-400 focus:outline-none"
                  >
                    {CATALOG.map((d) => (
                      <option key={d.key} value={d.key}>{d.disease} · {d.department}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <input
                      value={simAge}
                      onChange={(e) => setSimAge(e.target.value.replace(/[^0-9]/g, ''))}
                      inputMode="numeric"
                      placeholder="Chronological age (optional)"
                      className="w-full rounded-lg border border-cream-300 bg-white px-2 py-1.5 text-sm text-ink-900 placeholder:text-ink-700/40 focus:border-clay-400 focus:outline-none"
                    />
                    <button
                      onClick={() => { const a = attachments.find((x) => x.kind === 'methylation'); if (a) runSimulation(a); }}
                      className="shrink-0 rounded-lg bg-clay-500 px-4 py-1.5 text-sm font-bold text-white transition hover:bg-clay-600"
                    >
                      Run ▶
                    </button>
                  </div>
                  <p className="mt-2 mb-1 text-[11px] font-semibold text-ink-800">Other conditions <span className="font-normal text-ink-700/50">(optional · add as many as apply)</span></p>
                  <ConditionPicker
                    compact
                    value={simComorbid}
                    onChange={setSimComorbid}
                    impliedKey={impliedCondition((CATALOG.find((d) => d.key === simDisease) || DEFAULT_DISEASE).department)}
                  />
                  <p className="mt-1.5 text-[10.5px] text-ink-700/55">8 auto steps · runs on your device · rest is automatic.</p>
                </div>
              )}
              {attachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {attachments.map((a, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1.5 rounded-lg bg-cream-200 py-1 pl-2 pr-1 text-xs font-semibold text-ink-800"
                    >
                      {a.kind === 'image' ? <ImageIcon /> : <FileIcon />}
                      <span className="max-w-[120px] truncate">{a.file.name}</span>
                      <button
                        onClick={() => removeAttachment(i)}
                        aria-label="Remove attachment"
                        className="grid h-4 w-4 place-items-center rounded text-ink-700/60 hover:text-ink-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="mb-2 flex flex-wrap items-center gap-x-1.5 gap-y-2 text-xs text-ink-700/60">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
                </svg>
                <span>Lang</span>
                <select
                  value={voiceLang}
                  onChange={(e) => setVoiceLang(e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-cream-300 bg-white px-1.5 py-0.5 font-semibold text-ink-800 focus:border-clay-400 focus:outline-none"
                  aria-label="Chat language (typing, voice and replies)"
                >
                  <option value="">Auto-detect</option>
                  <option value="en-IN">English</option>
                  <optgroup label="India">
                    <option value="ta-IN">தமிழ் (Tamil)</option>
                    <option value="hi-IN">हिन्दी (Hindi)</option>
                    <option value="ml-IN">മലയാളം (Malayalam)</option>
                    <option value="te-IN">తెలుగు (Telugu)</option>
                    <option value="kn-IN">ಕನ್ನಡ (Kannada)</option>
                    <option value="bn-IN">বাংলা (Bengali)</option>
                    <option value="mr-IN">मराठी (Marathi)</option>
                    <option value="ur-PK">اردو (Urdu)</option>
                  </optgroup>
                  <optgroup label="International">
                    <option value="ar-SA">العربية (Arabic)</option>
                    <option value="fr-FR">Français (French)</option>
                    <option value="de-DE">Deutsch (German)</option>
                    <option value="es-ES">Español (Spanish)</option>
                    <option value="it-IT">Italiano (Italian)</option>
                    <option value="pt-PT">Português (Portuguese)</option>
                    <option value="ru-RU">Русский (Russian)</option>
                    <option value="nl-NL">Nederlands (Dutch)</option>
                    <option value="zh-CN">中文 (Chinese)</option>
                    <option value="ja-JP">日本語 (Japanese)</option>
                    <option value="ko-KR">한국어 (Korean)</option>
                    <option value="ms-MY">Bahasa Melayu (Malay)</option>
                  </optgroup>
                </select>

                <button
                  type="button"
                  onClick={() => setDoctorMode((v) => !v)}
                  aria-pressed={doctorMode}
                  title="Doctor mode: full, detailed clinical answers. Off: short, patient-friendly answers."
                  className={`ml-auto flex items-center gap-1.5 rounded-full px-1.5 py-0.5 font-semibold transition ${
                    doctorMode ? 'text-clay-700' : 'text-ink-700/70 hover:text-ink-900'
                  }`}
                >
                  <span
                    className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${
                      doctorMode ? 'bg-clay-500' : 'bg-cream-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${
                        doctorMode ? 'left-3.5' : 'left-0.5'
                      }`}
                    />
                  </span>
                  Doctor mode
                </button>
              </div>
              <div className="flex items-end gap-2">
                {/* Native <label> trigger: tapping it opens the OS file picker
                    directly (no JS .click() on a display:none input, which some
                    mobile browsers drop). The input stays in the DOM. */}
                <label
                  aria-label="Attach a file"
                  title="Attach a DNA-methylation file (array beta .csv with cg IDs, or a .cov/bedGraph), or an ECG / scan / report (image, PDF)"
                  className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-cream-300 text-ink-700/70 transition hover:border-clay-400 hover:text-clay-600"
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,application/pdf,.csv,.cov,.tsv,.txt,.bedgraph,.bed"
                    multiple
                    className="sr-only"
                    onChange={(e) => pickFiles(e.target.files)}
                  />
                  <ClipIcon />
                </label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={1}
                  placeholder={listening ? 'Listening…' : 'Ask a question…'}
                  className="max-h-28 min-h-[44px] w-full resize-none rounded-xl border border-cream-300 px-3 py-2.5 text-ink-900 placeholder:text-ink-700/40 focus:border-clay-400 focus:outline-none focus:ring-2 focus:ring-clay-200"
                />
                {speechSupported && (
                  <button
                    type="button"
                    onClick={toggleVoice}
                    aria-label={listening ? 'Stop voice input' : 'Speak your question'}
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border transition ${
                      listening
                        ? 'animate-pulse border-clay-400 bg-clay-50 text-clay-600'
                        : 'border-cream-300 text-ink-700/70 hover:border-clay-400 hover:text-clay-600'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="3" width="6" height="11" rx="3" />
                      <path d="M5 11a7 7 0 0014 0M12 18v3" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
                {busy ? (
                  <button
                    type="button"
                    onClick={stop}
                    aria-label="Stop"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink-900 text-white"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => send()}
                    aria-label="Send"
                    disabled={!input.trim() && attachments.length === 0}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-clay-500 text-white transition hover:bg-clay-600 disabled:opacity-40"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="mt-2 text-center text-[11px] leading-tight text-ink-700/55">
                🧬 Methylation: an array beta <b>.csv</b> (cg IDs + values) or a bisulfite <b>.cov</b>/bedGraph — runs on your device.
              </p>
              <p className="mt-1 text-center text-[11px] leading-tight text-ink-700/50">
                AI can be inaccurate. Not a diagnosis or prescription. For emergencies call your local
                emergency number.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Bubble({
  role,
  text,
  attachments,
  loading,
}: {
  role: 'user' | 'assistant';
  text: string;
  attachments?: { name: string; kind: 'image' | 'document' | 'methylation' }[];
  loading?: boolean;
}) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'rounded-br-md bg-clay-500 text-white'
            : 'rounded-bl-md bg-white text-ink-900 ring-1 ring-cream-300'
        }`}
      >
        {attachments && attachments.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {attachments.map((a, i) => (
              <span
                key={i}
                className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                  isUser ? 'bg-white/20' : 'bg-cream-200 text-ink-800'
                }`}
              >
                {a.kind === 'image' ? <ImageIcon /> : <FileIcon />}
                <span className="max-w-[110px] truncate">{a.name}</span>
              </span>
            ))}
          </div>
        )}
        {isUser ? (
          text
        ) : (
          <>
            {text && <div className="chat-md" dangerouslySetInnerHTML={{ __html: mdToHtml(text) }} />}
            {loading && <CellLoader className={text ? 'mt-2 inline-block' : ''} />}
          </>
        )}
      </div>
    </div>
  );
}

// Minimal, safe Markdown → HTML for assistant replies. Escapes HTML first,
// then introduces only our own tags, so there is no XSS surface.
function mdToHtml(src: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (t: string) =>
    t
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
      )
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  const lines = escape(src).split('\n');
  let html = '';
  let list: 'ul' | 'ol' | null = null;
  const closeList = () => {
    if (list) {
      html += `</${list}>`;
      list = null;
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    let m: RegExpMatchArray | null;
    if (/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(line)) {
      closeList();
      html += '<hr>';
    } else if ((m = line.match(/^\s*#{1,6}\s+(.*)$/))) {
      closeList();
      html += `<h4>${inline(m[1])}</h4>`;
    } else if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      if (list !== 'ul') {
        closeList();
        html += '<ul>';
        list = 'ul';
      }
      html += `<li>${inline(m[1])}</li>`;
    } else if ((m = line.match(/^\s*\d+\.\s+(.*)$/))) {
      if (list !== 'ol') {
        closeList();
        html += '<ol>';
        list = 'ol';
      }
      html += `<li>${inline(m[1])}</li>`;
    } else if (line.trim() === '') {
      closeList();
    } else {
      closeList();
      html += `<p>${inline(line)}</p>`;
    }
  }
  closeList();
  return html;
}

// Dividing stem-cell loader — shown while the assistant is generating.
function CellLoader({ className = '' }: { className?: string }) {
  return (
    <span className={`cell-loader ${className}`} role="status" aria-label="Generating answer">
      <span className="m" />
      <span className="n" />
      <span className="bud" />
    </span>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M12 3l1.9 4.7L18.5 9.5l-4.6 1.8L12 16l-1.9-4.7L5.5 9.5l4.6-1.8L12 3z"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ClipIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M21 11.5l-8.5 8.5a5 5 0 01-7-7l8.5-8.5a3.3 3.3 0 014.7 4.7L10 17.4a1.7 1.7 0 01-2.4-2.4l7.8-7.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 16l-5-5-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" strokeLinejoin="round" />
      <path d="M14 3v5h5" strokeLinejoin="round" />
    </svg>
  );
}
