import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { SUPABASE_URL, SUPABASE_KEY } from '../api/supabase';

// ---------------------------------------------------------------------------
// Lightweight, self-hosted page analytics — records each page visit (path,
// friendly page label, country, and how long the visitor stayed) into the
// existing Supabase `page_views` table. No third-party tracker, no cookies:
// a per-tab session id groups a single visit, and the country comes from
// Cloudflare's edge (same-origin /cdn-cgi/trace) with a public IP-geo fallback.
// Reading the data is admin-only (Supabase RLS); the browser can only insert.
// ---------------------------------------------------------------------------

// Map a route path → a friendly page name shown in the admin dashboard.
function pageLabel(pathname: string): string {
  if (pathname === '/' || pathname === '') return 'Home';
  const p = pathname.replace(/\/+$/, '');
  if (p.startsWith('/therapies/')) return 'Therapy detail';
  const map: Record<string, string> = {
    '/therapies': 'Therapies',
    '/simulator': 'Simulator',
    '/research': 'Research',
    '/waiting-list': 'Waiting list',
    '/compare': 'Compare',
    '/investors': 'Investors',
    '/consultation': 'Consultation',
    '/browse': 'Browse',
    '/care': 'Care packages',
    '/about': 'About',
    '/specialists': 'Specialists',
    '/safety': 'Safety',
    '/saved': 'Saved',
    '/login': 'Log in',
    '/register': 'Register',
    '/admin': 'Admin',
  };
  return map[p] || p;
}

function getSessionId(): string {
  try {
    const k = 'sp_sid';
    const existing = sessionStorage.getItem(k);
    if (existing) return existing;
    const v: string =
      (crypto as any)?.randomUUID?.() ||
      Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(k, v);
    return v;
  } catch {
    return 'anon';
  }
}

// Resolve the visitor's 2-letter country code once per tab and cache it.
async function resolveCountry(): Promise<string> {
  try {
    const cached = sessionStorage.getItem('sp_country');
    if (cached) return cached;
  } catch { /* ignore */ }

  let country = '';
  // 1) Cloudflare edge (same-origin, private, fast) — works when the site is
  //    served through Cloudflare (our custom domain is).
  try {
    const res = await fetch('/cdn-cgi/trace', { cache: 'no-store' });
    if (res.ok) {
      const txt = await res.text();
      const m = txt.match(/^loc=([A-Z]{2})/m);
      if (m) country = m[1];
    }
  } catch { /* ignore */ }

  // 2) Public IP-geo fallback (e.g. local dev / non-Cloudflare hosting).
  if (!country) {
    try {
      const res = await fetch('https://ipapi.co/country/', { cache: 'no-store' });
      if (res.ok) {
        const code = (await res.text()).trim().toUpperCase();
        if (/^[A-Z]{2}$/.test(code)) country = code;
      }
    } catch { /* ignore */ }
  }

  try { if (country) sessionStorage.setItem('sp_country', country); } catch { /* ignore */ }
  return country;
}

interface Pending {
  path: string;
  page: string;
  enter: number;
  flushed: boolean;
}

export default function Analytics() {
  const { pathname } = useLocation();
  const sid = useRef<string>('');
  const country = useRef<string>('');
  const current = useRef<Pending | null>(null);

  // Insert a page-view row. `beacon` uses fetch keepalive so the write survives
  // the tab closing (the last page of a visit).
  const send = (row: Record<string, unknown>, beacon = false) => {
    const url = `${SUPABASE_URL}/rest/v1/page_views`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'return=minimal',
    };
    try {
      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(row),
        keepalive: beacon,
      }).catch(() => {});
    } catch { /* ignore */ }
  };

  const flush = (beacon = false) => {
    const c = current.current;
    if (!c || c.flushed) return;
    c.flushed = true;
    const duration = Math.max(0, Math.round((Date.now() - c.enter) / 1000));
    send(
      {
        session_id: sid.current,
        path: c.path,
        page: c.page,
        country: country.current || null,
        duration_sec: duration,
      },
      beacon,
    );
  };

  // One-time setup: session id, country, and unload handlers.
  useEffect(() => {
    sid.current = getSessionId();
    resolveCountry().then((c) => { country.current = c; });

    const onHide = () => flush(true);
    const onVis = () => { if (document.visibilityState === 'hidden') flush(true); };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On every route change: flush the previous page's duration, then start timing
  // the new one.
  useEffect(() => {
    flush(false);
    current.current = {
      path: pathname,
      page: pageLabel(pathname),
      enter: Date.now(),
      flushed: false,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
