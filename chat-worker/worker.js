/**
 * StemCells Protocol — chat proxy (Cloudflare Worker)
 * ---------------------------------------------------
 * This is the ONLY place the Anthropic API key exists. The static site on
 * GitHub Pages posts the conversation here; this Worker adds the system prompt,
 * calls Anthropic server-side, and streams the reply back as plain text. The
 * key is stored as an encrypted secret (`wrangler secret put ANTHROPIC_API_KEY`)
 * and is never shipped to the browser.
 *
 * Bindings / vars (see wrangler.toml):
 *   ANTHROPIC_API_KEY  (secret, required)
 *   ALLOWED_ORIGINS    (var)  comma-separated list of allowed site origins
 *   MODEL              (var)  Anthropic model id (optional; has a default)
 *   RATE_LIMIT         (KV, optional)  simple per-IP throttling
 */

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
const MAX_TOKENS = 1024;
const MAX_MESSAGES = 24; // trim very long histories
const RATE_MAX = 20; // requests…
const RATE_WINDOW = 60; // …per this many seconds, per IP

const SYSTEM_PROMPT = `You are the StemCells Protocol AI assistant, embedded on the website of a stem-cell & regenerative-medicine hospital (departments include Age Rejuvenation, Diabetes, HIV, Autoimmune, Dental, Orthopedics, Cardiology, Gastroenterology, Neurology, Pulmonology and Cosmetic).

SCOPE — you may help with:
- StemCells Protocol: its therapies, departments, care packages, consultations and how the platform works.
- Regenerative medicine and stem-cell science (including partial epigenetic reprogramming / ER-100-style topics).
- General medicine and allopathy: primary care, common conditions, over-the-counter and prescription medications (what they are, how they generally work, common side effects, interactions), and emergency-care guidance.
- Post-operative and post-procedure surgical care, recovery and rehabilitation, wound care, and follow-up.

If a question is clearly unrelated to health, medicine or this hospital, politely decline and steer back.

HOW TO ANSWER:
- Be warm, clear and concise. Use short paragraphs or bullets. Plain language first, then detail.
- Give genuinely useful, educational medical information. Explain options and general principles.
- You are NOT the user's treating clinician. Do NOT provide a definitive diagnosis, and do NOT issue an individualized prescription or a specific personal dose to take. Instead, explain typical usage and dosing in general terms and tell the user to confirm the exact dose and suitability with their doctor or pharmacist, since it depends on their weight, kidney/liver function, other medicines, allergies and pregnancy status.
- EMERGENCIES: if the user describes chest pain, difficulty breathing, stroke signs (FAST), severe bleeding, anaphylaxis, suicidal thoughts, or another life-threatening situation, tell them to contact their local emergency number / go to the nearest emergency department immediately, before anything else.
- Encourage booking a consultation with StemCells Protocol for anything requiring assessment.
- If a user attaches a report or image, describe general observations and what the terms mean, but be explicit that you cannot replace a clinician's interpretation.
- Never invent StemCells Protocol prices, success rates, availability or clinician names — if unknown, suggest booking a consultation.
- Add a brief safety reminder only when it matters; do not repeat a long disclaimer every message.`;

function corsHeaders(origin, allowed) {
  const ok = allowed.length === 0 || allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin || '*' : allowed[0] || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(status, body, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

async function rateLimited(env, ip) {
  if (!env.RATE_LIMIT || !ip) return false;
  const key = `rl:${ip}`;
  const count = parseInt((await env.RATE_LIMIT.get(key)) || '0', 10);
  if (count >= RATE_MAX) return true;
  // Best-effort increment; expires after the window.
  await env.RATE_LIMIT.put(key, String(count + 1), { expirationTtl: RATE_WINDOW });
  return false;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const cors = corsHeaders(origin, allowed);

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return json(405, { error: 'Method not allowed' }, cors);

    if (allowed.length && origin && !allowed.includes(origin)) {
      return json(403, { error: 'Origin not allowed' }, cors);
    }
    if (!env.ANTHROPIC_API_KEY) {
      return json(500, { error: 'Server missing ANTHROPIC_API_KEY' }, cors);
    }

    const ip = request.headers.get('CF-Connecting-IP') || '';
    if (await rateLimited(env, ip)) {
      return json(429, { error: 'Too many messages — please wait a minute.' }, cors);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json(400, { error: 'Invalid JSON' }, cors);
    }

    const messages = Array.isArray(payload?.messages) ? payload.messages.slice(-MAX_MESSAGES) : [];
    if (!messages.length) return json(400, { error: 'No messages' }, cors);

    // Call Anthropic (streaming).
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: env.MODEL || DEFAULT_MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        stream: true,
        messages,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      let detail = 'Upstream error';
      try {
        detail = (await upstream.json())?.error?.message || detail;
      } catch {
        /* ignore */
      }
      return json(502, { error: detail }, cors);
    }

    // Parse Anthropic's SSE stream and re-emit just the text deltas as plain text.
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = '';

    const stream = new ReadableStream({
      async pull(controller) {
        const { value, done } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const evt = JSON.parse(data);
            if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
              controller.enqueue(encoder.encode(evt.delta.text));
            }
          } catch {
            /* ignore partial/keepalive lines */
          }
        }
      },
      cancel() {
        reader.cancel();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        ...cors,
      },
    });
  },
};
