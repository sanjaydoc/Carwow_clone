// Chat client — talks to the secure proxy (e.g. a Cloudflare Worker), NEVER
// to Anthropic directly. The API key lives only on the proxy, so nothing
// secret is ever shipped in this static bundle.
//
// Configure the proxy URL at build time with VITE_CHAT_ENDPOINT, or at runtime
// by setting window.STEMCELLS_CHAT_ENDPOINT before the app loads (lets you point
// the deployed site at a Worker without rebuilding).

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } };

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

export function chatEndpoint(): string {
  const runtime = (typeof window !== 'undefined' && (window as any).STEMCELLS_CHAT_ENDPOINT) || '';
  const build = (import.meta.env.VITE_CHAT_ENDPOINT as string | undefined) || '';
  return (runtime || build || '').trim();
}

export function isChatConfigured(): boolean {
  return chatEndpoint().length > 0;
}

/**
 * Stream a chat completion from the proxy. The proxy responds with a plain-text
 * stream of the assistant's reply; `onText` is called with each chunk.
 * Returns the full concatenated reply.
 */
export async function streamChat(opts: {
  messages: ChatMessage[];
  onText: (chunk: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  const endpoint = chatEndpoint();
  if (!endpoint) {
    throw new Error('NOT_CONFIGURED');
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: opts.messages }),
    signal: opts.signal,
  });

  if (!res.ok || !res.body) {
    let detail = '';
    try {
      detail = (await res.json())?.error || '';
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) {
      full += chunk;
      opts.onText(chunk);
    }
  }
  return full;
}

/** Read a File into a base64 string (no data: prefix). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
