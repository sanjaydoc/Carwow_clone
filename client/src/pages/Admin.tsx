import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../api/supabase';

type Row = Record<string, any>;

const TABLES = [
  { key: 'page_views', label: 'Page views', cols: ['created_at', 'page', 'path', 'country', 'duration_sec', 'session_id'] },
  { key: 'waitlist', label: 'Waiting list', cols: ['created_at', 'priority', 'name', 'email', 'disease', 'therapy', 'department', 'has_methylation', 'file_name', 'notes'] },
  { key: 'consultations', label: 'Consultations', cols: ['created_at', 'name', 'email', 'phone', 'department', 'condition', 'notes'] },
  { key: 'signups', label: 'Sign-ups', cols: ['created_at', 'name', 'email'] },
  { key: 'chat_logs', label: 'Chat logs', cols: ['created_at', 'language', 'question', 'answer', 'had_attachment'] },
] as const;

// Seconds → "1m 20s" / "45s".
function fmtDuration(s: any): string {
  const n = Number(s);
  if (!isFinite(n) || n <= 0) return '0s';
  const m = Math.floor(n / 60);
  const sec = n % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

const regionNames =
  typeof Intl !== 'undefined' && (Intl as any).DisplayNames
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null;

// 2-letter code → flag emoji + country name (e.g. "IN" → "🇮🇳 India").
function fmtCountry(code: any): string {
  const c = String(code || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return '—';
  const flag = String.fromCodePoint(...[...c].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
  let name = c;
  try { name = regionNames?.of(c) || c; } catch { /* ignore */ }
  return `${flag} ${name}`;
}

const RANGES = [
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
  { days: 0, label: 'All' },
];

export default function Admin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [tab, setTab] = useState<(typeof TABLES)[number]['key']>('consultations');
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const [rangeDays, setRangeDays] = useState(30);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  const logout = async () => {
    await supabase?.auth.signOut();
    setRows([]);
    setCounts({});
  };

  const loadData = async () => {
    if (!supabase || !session) return;
    setDataLoading(true);
    setDataError('');
    try {
      const nextCounts: Record<string, number> = {};
      for (const t of TABLES) {
        const { count } = await supabase.from(t.key).select('*', { count: 'exact', head: true });
        nextCounts[t.key] = count || 0;
      }
      setCounts(nextCounts);

      let q = supabase.from(tab).select('*');
      // Waiting list: priority patients (methylation test uploaded) first.
      if (tab === 'waitlist') q = q.order('priority', { ascending: false });
      q = q.order('created_at', { ascending: false }).limit(1000);
      if (rangeDays > 0) {
        q = q.gte('created_at', new Date(Date.now() - rangeDays * 86400000).toISOString());
      }
      const { data, error } = await q;
      if (error) throw error;
      setRows(data || []);
    } catch (e: any) {
      setDataError(e?.message || 'Could not load data.');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (session) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, tab, rangeDays]);

  const active = TABLES.find((t) => t.key === tab)!;

  // Client-side search over the loaded rows.
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      active.cols.some((c) => String(r[c] ?? '').toLowerCase().includes(term)),
    );
  }, [rows, query, active]);

  // Daily counts for the chart.
  const chart = useMemo(() => {
    const n = rangeDays > 0 ? rangeDays : 30;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const map: Record<string, number> = {};
    const days: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map[key] = 0;
      days.push(key);
    }
    filtered.forEach((r) => {
      const key = String(r.created_at || '').slice(0, 10);
      if (key in map) map[key]++;
    });
    const data = days.map((k) => ({ day: k, count: map[k] }));
    const max = Math.max(1, ...data.map((d) => d.count));
    return { data, max };
  }, [filtered, rangeDays]);

  // Page-view analytics: aggregates computed from the loaded rows.
  const analytics = useMemo(() => {
    if (tab !== 'page_views') return null;
    const sessions = new Set<string>();
    const byPage: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    let durSum = 0;
    let durN = 0;
    filtered.forEach((r) => {
      if (r.session_id) sessions.add(String(r.session_id));
      const pg = String(r.page || r.path || '—');
      byPage[pg] = (byPage[pg] || 0) + 1;
      const co = String(r.country || '').toUpperCase() || '—';
      byCountry[co] = (byCountry[co] || 0) + 1;
      const d = Number(r.duration_sec);
      if (isFinite(d) && d > 0) { durSum += d; durN++; }
    });
    const sortDesc = (o: Record<string, number>) =>
      Object.entries(o).sort((a, b) => b[1] - a[1]);
    return {
      totalViews: filtered.length,
      visitors: sessions.size,
      avgDuration: durN ? Math.round(durSum / durN) : 0,
      pages: sortDesc(byPage),
      countries: sortDesc(byCountry),
    };
  }, [tab, filtered]);

  const exportCsv = () => {
    const cols = active.cols;
    const esc = (v: any) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [cols.join(','), ...filtered.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!supabase) {
    return (
      <div className="container-x py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Admin unavailable</h1>
        <p className="mt-2 text-ink-700/70">Supabase is not configured.</p>
      </div>
    );
  }
  if (!authReady) {
    return <div className="container-x py-20 text-center text-ink-700/60">Loading…</div>;
  }

  if (!session) {
    return (
      <div className="container-x flex min-h-[70vh] items-center justify-center py-10">
        <form onSubmit={login} className="card w-full max-w-sm space-y-4 p-6 sm:p-8">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-ink-900">Admin sign in</h1>
            <p className="mt-1 text-sm text-ink-700/60">StemCells Protocol dashboard</p>
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" autoComplete="email" />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" autoComplete="current-password" />
          </div>
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 disabled:opacity-60">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="container-x py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">Admin dashboard</h1>
          <p className="text-sm text-ink-700/60">Signed in as {session.user?.email}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className="btn-outline px-4 py-2 text-sm">Refresh</button>
          <button onClick={logout} className="btn-ghost px-4 py-2 text-sm">Sign out</button>
        </div>
      </div>

      {/* KPI cards (all-time totals) */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {TABLES.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`card p-5 text-left transition ${tab === t.key ? 'ring-2 ring-clay-400' : 'hover:shadow-lg'}`}
          >
            <p className="text-sm text-ink-700/60">{t.label}</p>
            <p className="mt-1 font-display text-3xl font-extrabold text-ink-900">{counts[t.key] ?? '—'}</p>
            <p className="text-xs text-ink-700/50">all time</p>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex overflow-hidden rounded-xl border border-cream-300">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setRangeDays(r.days)}
              className={`px-3 py-2 text-sm font-semibold transition ${
                rangeDays === r.days ? 'bg-clay-500 text-white' : 'bg-white text-ink-700 hover:bg-cream-100'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${active.label.toLowerCase()}…`}
          className="input max-w-xs flex-1"
        />
        <button onClick={exportCsv} className="btn-outline px-4 py-2 text-sm">Export CSV</button>
      </div>

      {/* Chart */}
      <div className="mt-4 card p-5">
        <p className="text-sm font-semibold text-ink-900">
          {active.label} per day <span className="font-normal text-ink-700/50">· {rangeDays > 0 ? `last ${rangeDays} days` : 'last 30 days'}</span>
        </p>
        <div className="mt-3 overflow-x-auto">
          <svg viewBox={`0 0 ${Math.max(chart.data.length * 12, 120)} 120`} className="h-32 w-full min-w-[320px]" preserveAspectRatio="none">
            {chart.data.map((d, i) => {
              const h = (d.count / chart.max) * 100;
              return (
                <rect
                  key={d.day}
                  x={i * 12 + 2}
                  y={110 - h}
                  width={8}
                  height={Math.max(h, d.count > 0 ? 2 : 0)}
                  rx={2}
                  fill="#4285F4"
                >
                  <title>{`${d.day}: ${d.count}`}</title>
                </rect>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Page-view analytics breakdown */}
      {tab === 'page_views' && analytics && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="card p-5">
              <p className="text-sm text-ink-700/60">Page views</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{analytics.totalViews.toLocaleString()}</p>
              <p className="text-xs text-ink-700/50">{rangeDays > 0 ? `last ${rangeDays} days` : 'all time'}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-ink-700/60">Unique visitors</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{analytics.visitors.toLocaleString()}</p>
              <p className="text-xs text-ink-700/50">distinct sessions</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-ink-700/60">Avg. time on page</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{fmtDuration(analytics.avgDuration)}</p>
              <p className="text-xs text-ink-700/50">per view</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <p className="text-sm font-semibold text-ink-900">Most-viewed pages</p>
              <div className="mt-3 space-y-2">
                {analytics.pages.length === 0 && <p className="text-sm text-ink-700/50">No data yet.</p>}
                {analytics.pages.slice(0, 12).map(([name, n]) => {
                  const pct = analytics.totalViews ? Math.round((n / analytics.totalViews) * 100) : 0;
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-ink-900">{name}</span>
                        <span className="text-ink-700/60">{n.toLocaleString()} · {pct}%</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-cream-200">
                        <div className="h-full rounded-full bg-clay-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card p-5">
              <p className="text-sm font-semibold text-ink-900">Visitors by country</p>
              <div className="mt-3 space-y-2">
                {analytics.countries.length === 0 && <p className="text-sm text-ink-700/50">No data yet.</p>}
                {analytics.countries.slice(0, 12).map(([code, n]) => {
                  const pct = analytics.totalViews ? Math.round((n / analytics.totalViews) * 100) : 0;
                  return (
                    <div key={code}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-ink-900">{code === '—' ? 'Unknown' : fmtCountry(code)}</span>
                        <span className="text-ink-700/60">{n.toLocaleString()} · {pct}%</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-cream-200">
                        <div className="h-full rounded-full bg-ink-900/70" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Table */}
      <div className="mt-4 card overflow-hidden">
        <div className="flex items-center justify-between border-b border-cream-300 px-5 py-3">
          <h2 className="font-display font-bold text-ink-900">{active.label}</h2>
          <span className="text-sm text-ink-700/60">{dataLoading ? 'Loading…' : `${filtered.length} shown`}</span>
        </div>
        {dataError && <p className="m-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{dataError}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="bg-cream-100 text-ink-700/60">
                {active.cols.map((c) => (
                  <th key={c} className="px-4 py-2.5 font-semibold">{c.replace('_', ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-ink-900">
              {filtered.map((r, i) => (
                <tr key={r.id || i} className={`border-t border-cream-200 align-top ${tab === 'waitlist' && r.priority ? 'bg-clay-50' : ''}`}>
                  {active.cols.map((c) => (
                    <td key={c} className="max-w-[280px] px-4 py-2.5">
                      <div className="line-clamp-4 whitespace-pre-wrap break-words">
                        {c === 'created_at' && r[c]
                          ? new Date(r[c]).toLocaleString()
                          : c === 'duration_sec'
                            ? fmtDuration(r[c])
                            : c === 'country'
                              ? fmtCountry(r[c])
                              : typeof r[c] === 'boolean'
                                ? r[c] ? 'Yes' : 'No'
                                : (r[c] ?? '—')}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
              {!dataLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={active.cols.length} className="px-4 py-10 text-center text-ink-700/50">
                    No records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
