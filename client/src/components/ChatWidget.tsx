import { useEffect, useRef, useState } from 'react';
import {
  streamChat,
  fileToBase64,
  isChatConfigured,
  type ChatMessage,
  type ContentBlock,
} from '../api/chat';

interface Attachment {
  file: File;
  kind: 'image' | 'document';
  previewUrl?: string;
}

interface UIMsg {
  role: 'user' | 'assistant';
  text: string;
  attachments?: { name: string; kind: 'image' | 'document' }[];
}

const MAX_IMAGE_MB = 5;
const MAX_PDF_MB = 10;
const GREETING =
  "Hi — I'm the StemCells Protocol assistant. Ask about our therapies, recovery and post-operative care, or medications. You can also 📎 attach an ECG, X-ray/MRI, prescription or lab report and I'll explain it in simple words. This is educational support, not a diagnosis — AI can misread scans, so always confirm with your doctor.";

const SUGGESTIONS = [
  'Upload an ECG — explain it simply',
  'What does my prescription treat?',
  'What is ER-100 age reversal?',
];

// Language code (for speech) → English name (for the reply instruction).
const LANG_NAME: Record<string, string> = {
  'en-IN': 'English',
  'ta-IN': 'Tamil',
  'hi-IN': 'Hindi',
  'ml-IN': 'Malayalam',
  'te-IN': 'Telugu',
  'kn-IN': 'Kannada',
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UIMsg[]>([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [voiceLang, setVoiceLang] = useState('');
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
      if (!isImage && !isPdf) {
        setError('Only images and PDF files are supported.');
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
      next.push({
        file,
        kind: isImage ? 'image' : 'document',
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

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if ((!text && attachments.length === 0) || busy) return;
    setError('');

    if (!configured) {
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

    // Build the content blocks for the API from text + attachments.
    const blocks: ContentBlock[] = [];
    for (const a of attachments) {
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
          onClick={() => setOpen(true)}
          className="group mb-5 flex w-full max-w-2xl items-center gap-3 rounded-2xl bg-white/10 p-3 text-left ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15 sm:p-4"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-clay-500 text-white shadow-sm">
            <SparkIcon />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-white">Ask our AI care assistant</span>
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
                <p className="flex items-center gap-1.5 text-xs text-white/60">
                  <span className="h-2 w-2 rounded-full bg-green-400" /> Online · general info only
                </p>
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
                    </div>
                  )}
                </div>
              )}
              <button
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
                <Bubble
                  key={i}
                  role={m.role}
                  text={m.text}
                  attachments={m.attachments}
                  typing={busy && i === messages.length - 1 && m.role === 'assistant' && !m.text}
                />
              ))}
            </div>

            {/* Composer */}
            <div className="border-t border-cream-300 bg-white p-3">
              {error && <p className="mb-2 text-xs font-semibold text-red-600">{error}</p>}
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
              <div className="mb-2 flex items-center gap-1.5 text-xs text-ink-700/60">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
                </svg>
                <span>Language</span>
                <select
                  value={voiceLang}
                  onChange={(e) => setVoiceLang(e.target.value)}
                  className="rounded-md border border-cream-300 bg-white px-1.5 py-0.5 font-semibold text-ink-800 focus:border-clay-400 focus:outline-none"
                  aria-label="Chat language (typing, voice and replies)"
                >
                  <option value="">Auto-detect</option>
                  <option value="en-IN">English</option>
                  <option value="ta-IN">தமிழ் (Tamil)</option>
                  <option value="hi-IN">हिन्दी (Hindi)</option>
                  <option value="ml-IN">മലയാളം (Malayalam)</option>
                  <option value="te-IN">తెలుగు (Telugu)</option>
                  <option value="kn-IN">ಕನ್ನಡ (Kannada)</option>
                </select>
                <span className="hidden text-ink-700/45 sm:inline">· replies &amp; voice</span>
              </div>
              <div className="flex items-end gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => pickFiles(e.target.files)}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  aria-label="Attach a file"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-cream-300 text-ink-700/70 transition hover:border-clay-400 hover:text-clay-600"
                >
                  <ClipIcon />
                </button>
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
              <p className="mt-2 text-center text-[11px] leading-tight text-ink-700/50">
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
  typing,
}: {
  role: 'user' | 'assistant';
  text: string;
  attachments?: { name: string; kind: 'image' | 'document' }[];
  typing?: boolean;
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
        {typing ? (
          <TypingDots />
        ) : isUser ? (
          text
        ) : (
          <div className="chat-md" dangerouslySetInnerHTML={{ __html: mdToHtml(text) }} />
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

function TypingDots() {
  return (
    <span className="flex gap-1 py-1">
      <span className="h-2 w-2 animate-bounce rounded-full bg-ink-700/40 [animation-delay:-0.3s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-ink-700/40 [animation-delay:-0.15s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-ink-700/40" />
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
