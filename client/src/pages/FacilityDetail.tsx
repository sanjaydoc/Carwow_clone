import { Link, useParams } from 'react-router-dom';
import Icon from '../components/Icon';
import { FACILITY, FACILITY_ORDER, type FacGroup, type FacItem } from '../protocols/facility';

const hex = (h: string, a: number) => {
  const n = parseInt(h.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

export default function FacilityDetail() {
  const { level = '' } = useParams();
  const f = FACILITY[level];
  if (!f) {
    return (
      <div className="container-x py-16 text-center">
        <p className="text-ink-700/70">No facility level “{level}”.</p>
        <Link to="/protocols" className="btn-primary mt-4 inline-block px-5 py-2.5">← Back to the Protocol Standard</Link>
      </div>
    );
  }
  const idx = FACILITY_ORDER.indexOf(f.n);
  const prev = FACILITY_ORDER[idx - 1];
  const next = FACILITY_ORDER[idx + 1];

  return (
    <div>
      {/* Header */}
      <section className="relative overflow-hidden bg-ink-900">
        <div className="absolute -right-24 top-0 h-96 w-96 rounded-full blur-3xl" style={{ background: hex(f.accent, 0.22) }} />
        <div className="container-x relative py-10">
          <Link to="/protocols" className="text-sm text-white/60 hover:text-white">← Protocol Standard</Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-lg px-3 py-1 font-mono text-sm font-bold text-white" style={{ background: f.accent }}>FACILITY LEVEL {f.n}</span>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#fff' }}>{f.cumulative}</span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-white sm:text-4xl">{f.name}</h1>
          <p className="mt-3 max-w-2xl text-white/70">{f.tagline}</p>
          <div className="mt-4 inline-flex items-baseline gap-2 rounded-xl bg-white/10 px-4 py-2.5">
            <span className="font-display text-2xl font-extrabold" style={{ color: '#fff' }}>{f.cost}</span>
            <span className="text-sm text-white/55">{f.costNote}</span>
          </div>
        </div>
      </section>

      <section className="container-x py-8">
        {/* Level switcher */}
        <div className="mb-6 flex flex-wrap gap-2">
          {FACILITY_ORDER.map((k) => {
            const lv = FACILITY[k];
            const active = k === f.n;
            return (
              <Link key={k} to={`/protocols/facility/${k}`}
                className="rounded-full border px-3.5 py-1.5 text-sm font-semibold transition"
                style={active
                  ? { background: lv.accent, borderColor: lv.accent, color: '#fff' }
                  : { borderColor: 'var(--tw-cream-300, #d7def0)', color: '#1f2a44' }}
              >
                Level {k} · {lv.cost}
              </Link>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr]">
          {/* LEFT — budget + coverage */}
          <div className="space-y-6">
            <div className="card overflow-hidden p-0">
              <div className="flex items-center gap-2 border-b border-cream-300 p-5" style={{ background: hex(f.accent, 0.06) }}>
                <span className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{ background: f.accent }}><Icon name="banknote" className="h-4 w-4" /></span>
                <h2 className="font-display text-base font-bold text-ink-900">Estimated cost</h2>
              </div>
              <div className="p-5">
                <p className="font-display text-3xl font-extrabold" style={{ color: f.accent }}>{f.budgetHeadline}</p>
                <p className="mt-2 text-sm text-ink-700/70">{f.budgetLbl}</p>
                <div className="mt-4 divide-y divide-cream-200">
                  {f.budget.map((r) => (
                    <div key={r.label} className={`flex items-baseline justify-between gap-4 py-2.5 text-sm ${r.tone === 'muted' ? 'text-ink-700/50' : r.tone === 'rec' ? 'text-ink-700/70' : 'text-ink-800'}`}>
                      <span>{r.label}</span>
                      <span className="whitespace-nowrap font-mono font-semibold tabular-nums" style={r.tone === 'rec' ? { color: f.accent } : r.tone === 'muted' ? {} : { color: '#141c2e' }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {f.coverage.map((g) => <CoverageCard key={g.title} g={g} accent={f.accent} />)}
          </div>

          {/* RIGHT — equipment */}
          <div className="space-y-6">
            <h2 className="font-display text-xl font-extrabold text-ink-900">Equipment {f.n === '1' ? '' : 'added'} at this level</h2>
            {f.zones.map((z) => (
              <div key={z.title} className="card p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-base font-bold text-ink-900">{z.title}</h3>
                </div>
                <p className="mt-0.5 text-xs text-ink-700/55">{z.purpose}</p>
                <ul className="mt-3 divide-y divide-cream-200">
                  {z.items.map((it) => <ItemRow key={it.name} it={it} />)}
                </ul>
              </div>
            ))}

            {f.disposables && (
              <div className="card p-5">
                <h3 className="font-display text-base font-bold text-ink-900">Single-use disposables to stock</h3>
                <p className="mt-0.5 text-xs text-ink-700/55">Consumables you replenish, not equipment you buy once.</p>
                <div className="mt-3 space-y-3">
                  {f.disposables.map((d) => (
                    <div key={d.group}>
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-700/45">{d.group}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {d.items.map((x) => <span key={x} className="rounded-md border border-cream-300 bg-cream-50 px-2 py-1 text-xs text-ink-800">{x}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* notes */}
        <div className="mt-8 space-y-3">
          {f.notes.map((n) => (
            <p key={n} className="rounded-2xl border border-cream-300 bg-cream-50 p-4 text-xs italic text-ink-700/60">{n}</p>
          ))}
        </div>

        {/* prev / next */}
        <div className="mt-8 flex items-center justify-between gap-3">
          {prev ? (
            <Link to={`/protocols/facility/${prev}`} className="btn-outline px-4 py-2.5 text-sm">← Level {prev}</Link>
          ) : <span />}
          {next ? (
            <Link to={`/protocols/facility/${next}`} className="btn-primary px-4 py-2.5 text-sm">Level {next} →</Link>
          ) : (
            <Link to="/protocols" className="btn-outline px-4 py-2.5 text-sm">Back to registry</Link>
          )}
        </div>
      </section>
    </div>
  );
}

function CoverageCard({ g, accent }: { g: FacGroup; accent: string }) {
  const toneStyle = g.tone === 'now'
    ? { bg: 'bg-green-50', tx: 'text-green-700' }
    : g.tone === 'add'
      ? { bg: 'bg-amber-50', tx: 'text-amber-700' }
      : { bg: 'bg-cream-100', tx: 'text-ink-700/60' };
  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`chip ${toneStyle.bg} ${toneStyle.tx}`}>{g.title}</span>
        {g.caption && <span className="text-xs text-ink-700/55">{g.caption}</span>}
      </div>
      {g.therapies && (
        <div className="flex flex-wrap gap-1.5">
          {g.therapies.map((t) => (
            <span key={t.label} className="rounded-md px-2 py-1 text-xs font-medium"
              style={t.flag ? { background: accent, color: '#fff' } : g.tone === 'now' ? { background: 'rgba(34,197,94,0.12)', color: '#15803d' } : { background: 'rgba(217,119,6,0.12)', color: '#b45309' }}>
              {t.flag && '★ '}{t.label}{t.sub && <span className="opacity-70"> · {t.sub}</span>}
            </span>
          ))}
        </div>
      )}
      {g.rows && (
        <div className="space-y-2">
          {g.rows.map((r) => (
            <div key={r.lab} className="grid gap-1 sm:grid-cols-[190px_1fr] sm:gap-3">
              <p className="text-sm font-semibold text-ink-800">{r.lab} {r.count && <span className="font-mono text-xs text-ink-700/45">{r.count}</span>}</p>
              <p className="text-xs text-ink-700/60">{r.names}</p>
            </div>
          ))}
        </div>
      )}
      {g.note && <p className="mt-3 text-xs italic text-ink-700/60">{g.note}</p>}
    </div>
  );
}

function ItemRow({ it }: { it: FacItem }) {
  const boxed = !it.tone || it.tone === 'crit' || it.tone === 'rec';
  return (
    <li className={`flex items-start justify-between gap-4 py-2.5 ${it.tone === 'crit' ? '-mx-5 border-l-2 border-red-500 bg-red-50/40 px-5' : ''}`}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-900">
          {it.name}
          {it.tone === 'crit' && <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">safety-critical</span>}
          {it.tone === 'rec' && <span className="ml-2 rounded-full bg-cream-200 px-1.5 py-0.5 text-[10px] font-semibold text-ink-700/60">recommended</span>}
        </p>
        {it.spec && <p className="mt-0.5 text-xs text-ink-700/60">{it.spec}</p>}
      </div>
      <span className={`shrink-0 whitespace-nowrap rounded-md px-2 py-1 font-mono text-xs font-semibold tabular-nums ${boxed ? 'border border-cream-300 bg-cream-50 text-ink-800' : 'text-ink-700/45'}`}>
        {it.cost}
      </span>
    </li>
  );
}
