import { useEffect, useState } from 'react';
import { supabase } from '../api/supabase';

type Row = Record<string, any>;

const TABLES = [
  { key: 'consultations', label: 'Consultations', cols: ['created_at', 'name', 'email', 'department', 'condition', 'notes'] },
  { key: 'signups', label: 'Sign-ups', cols: ['created_at', 'name', 'email'] },
  { key: 'chat_logs', label: 'Chat logs', cols: ['created_at', 'language', 'question', 'answer', 'had_attachment'] },
] as const;

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

  // Load counts for all tables + rows for the active tab.
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
      const { data, error } = await supabase
        .from(tab)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
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
  }, [session, tab]);

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

  // ---- Login screen ----
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
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 disabled:opacity-60">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    );
  }

  // ---- Dashboard ----
  const active = TABLES.find((t) => t.key === tab)!;
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

      {/* KPI cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {TABLES.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`card p-5 text-left transition ${tab === t.key ? 'ring-2 ring-clay-400' : 'hover:shadow-lg'}`}
          >
            <p className="text-sm text-ink-700/60">{t.label}</p>
            <p className="mt-1 font-display text-3xl font-extrabold text-ink-900">
              {counts[t.key] ?? '—'}
            </p>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="mt-6 card overflow-hidden">
        <div className="flex items-center justify-between border-b border-cream-300 px-5 py-3">
          <h2 className="font-display font-bold text-ink-900">{active.label}</h2>
          <span className="text-sm text-ink-700/60">
            {dataLoading ? 'Loading…' : `${rows.length} shown`}
          </span>
        </div>
        {dataError && (
          <p className="m-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{dataError}</p>
        )}
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
              {rows.map((r, i) => (
                <tr key={r.id || i} className="border-t border-cream-200 align-top">
                  {active.cols.map((c) => (
                    <td key={c} className="max-w-[280px] px-4 py-2.5">
                      <div className="line-clamp-4 whitespace-pre-wrap break-words">
                        {c === 'created_at' && r[c]
                          ? new Date(r[c]).toLocaleString()
                          : typeof r[c] === 'boolean'
                            ? r[c] ? 'Yes' : 'No'
                            : (r[c] ?? '—')}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
              {!dataLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={active.cols.length} className="px-4 py-10 text-center text-ink-700/50">
                    No records yet.
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
