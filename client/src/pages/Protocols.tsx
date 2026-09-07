import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon, { type IconName } from '../components/Icon';
import { CATEGORIES, PROTOCOLS, type Category, type Protocol } from '../protocols/registry';
import { STANDARDS, DISCLAIMER } from '../protocols/standards';
import { FACILITY_SUMMARY } from '../protocols/facility';

// All-blue medallion gradients (light → deep) for the neumorphic facility tray.
const MED_BLUE = [
  'linear-gradient(145deg,#83a9f8,#2f6fe0)',
  'linear-gradient(145deg,#5b90f6,#1f59c2)',
  'linear-gradient(145deg,#2f6fe0,#153a7c)',
];

/**
 * StemCells Protocol — Standard (v0.1): a coded, safety-first protocol registry
 * so cell, stem-cell, regenerative and gene therapies can be administered to one
 * repeatable, documented worldwide standard. Static + on-device; no backend.
 */

// Delivery routes used across the registry (mirrors registry ROUTE_STEPS).
type Scope = 'Systemic' | 'Local' | 'Surface' | 'Targeted';
const SCOPE_STYLE: Record<Scope, string> = {
  Systemic: 'bg-blue-50 text-blue-700',
  Local: 'bg-green-50 text-green-700',
  Surface: 'bg-amber-50 text-amber-700',
  Targeted: 'bg-purple-50 text-purple-700',
};
const ROUTES: { icon: IconName; name: string; scope: Scope; blurb: string }[] = [
  { icon: 'syringe', name: 'IV infusion', scope: 'Systemic', blurb: 'Into a vein, travelling the bloodstream — used for systemic/immune conditions. Large cells are trapped in the lungs and cleared within 1–2 days, so the effect is a paracrine “hit-and-run”; carries the embolic / IBMIR clotting risk the Simulator screens for.' },
  { icon: 'flask', name: 'Intra-articular', scope: 'Local', blurb: 'Directly into a joint space (e.g. knee osteoarthritis) — delivers a high local cell dose and avoids the lung trap.' },
  { icon: 'syringe', name: 'Local injection', scope: 'Local', blurb: 'Into the target tissue itself — perianal fistula, intervertebral disc, tendon, skin or dental sites.' },
  { icon: 'brain', name: 'Intrathecal', scope: 'Local', blurb: 'Into the cerebrospinal fluid via lumbar puncture, to reach neurological targets (ALS, spinal-cord injury).' },
  { icon: 'heart', name: 'Intracoronary / Intramyocardial', scope: 'Local', blurb: 'Via catheter into the coronary arteries or the heart muscle, for cardiac repair after infarction or in heart failure.' },
  { icon: 'stethoscope', name: 'Intramuscular', scope: 'Local', blurb: 'Depot injections spread across a muscle group — e.g. to drive angiogenesis in critical limb ischaemia.' },
  { icon: 'clinician', name: 'Surgical implant', scope: 'Local', blurb: 'Cells (often on a scaffold) seated into a prepared defect in theatre — bone, cartilage, cornea or retina.' },
  { icon: 'dish', name: 'Topical / surface', scope: 'Surface', blurb: 'Applied to skin or a wound surface, often through micro-channels or as a growth-factor-rich membrane graft.' },
  { icon: 'microscope', name: 'Portal / Subretinal', scope: 'Targeted', blurb: 'Organ-specific access — portal vein for liver or islet cells, subretinal delivery beneath the retina for eye therapies.' },
];

// StemCells Protocol facility levels — the capital-staircase from an outpatient
// clinic to a full cell & gene-therapy centre, and the catalogue each unlocks.
type Level = {
  n: string; accent: string; name: string; cost: string; costNote: string;
  cumulative: string; adds: string; unlocks: { label: string; flag?: boolean }[]; unlockNote?: string;
};
const LEVELS: Level[] = [
  {
    n: '1', accent: '#4285F4', name: 'Outpatient administration clinic', cost: '$50–150k', costNote: 'one-time · live now',
    cumulative: '≈ 40 of 64 therapies',
    adds: 'The minimum kit — cold chain, aseptic prep, IV & injection administration, monitoring and emergency readiness (product supplied by a GMP manufacturer).',
    unlocks: [
      { label: 'All MSC IV infusions (age-rejuvenation, autoimmune, organ)' },
      { label: 'IV & topical exosome therapies' },
      { label: 'Intra-articular & local injections' },
      { label: 'PRP' },
    ],
    unlockNote: 'Covers every Phase-1 revenue therapy from day one.',
  },
  {
    n: '2', accent: '#22c55e', name: 'Interventional & day-procedure centre', cost: '+$0.2–0.8M', costNote: 'added · cath lab optional',
    cumulative: '≈ 54 of 64 therapies',
    adds: 'A minor-OR / day-surgery suite, image guidance (C-arm + ultrasound), point-of-care processing (SVF / BMAC), short-stay beds and harvest suites; optional cath lab.',
    unlocks: [
      { label: 'Post-MI repair' }, { label: 'Heart failure' }, { label: 'Cardiosphere' },
      { label: 'Critical limb ischaemia' }, { label: 'Alveolar bone' }, { label: 'Non-union fracture' },
    ],
    unlockNote: 'Plus it graduates Level 1’s dental, disc, fat-grafting + SVF, ALS-intrathecal and inpatient (GvHD / ARDS / AKI) therapies to native.',
  },
  {
    n: '3', accent: '#a855f7', name: 'Advanced cell & gene-therapy centre', cost: '$5–50M', costNote: 'owned · or via CDMO',
    cumulative: '64 of 64 — the full catalogue',
    adds: 'Full GMP manufacturing, apheresis, a cryo cell-bank, QC lab, and transplant & gene-therapy programmes — or reached capital-light via a CDMO + partner hospital (the seed’s route to first-in-human).',
    unlocks: [
      { label: 'Persona Reversal — age reversal', flag: true }, { label: 'Persona Reversal — renal', flag: true },
      { label: 'CCR5 transplants & gene-edits' }, { label: 'MS aHSCT' }, { label: 'Systemic sclerosis HSCT' },
      { label: 'NK-cell & thymic' }, { label: 'Type 1 diabetes islets' }, { label: 'Spinal-cord iPSC' },
      { label: 'FSHD' }, { label: 'Parkinson’s iPSC' }, { label: 'Whole-tooth' }, { label: 'Airway epithelium' },
    ],
    unlockNote: 'The flagship Persona Reversal reprogramming platform lives here — the tier the seed round funds.',
  },
];

export default function Protocols() {
  const [cat, setCat] = useState<Category | 'ALL'>('ALL');
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return PROTOCOLS.filter((p) =>
      (cat === 'ALL' || p.category === cat) &&
      (!query || p.code.toLowerCase().includes(query) || p.name.toLowerCase().includes(query) ||
        p.indication.toLowerCase().includes(query) || (p.aka || '').toLowerCase().includes(query) ||
        (p.regions || '').toLowerCase().includes(query)));
  }, [cat, q]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of PROTOCOLS) m[p.category] = (m[p.category] || 0) + 1;
    return m;
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink-900">
        <div className="absolute -right-24 top-0 h-96 w-96 rounded-full bg-clay-500/20 blur-3xl" />
        <div className="container-x relative grid gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_368px] lg:items-center">
          <div>
            <span className="chip bg-white/10 text-white"><Icon name="clipboard" className="h-3.5 w-3.5" /> Standard v0.1 · draft</span>
            <h1 className="mt-4 font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-white sm:text-6xl">
              The Protocol <span className="text-clay-500">Standard</span>
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-white/70">
              One repeatable, safety-first, documented standard so clinics, hospitals and institutions worldwide can deliver
              cell, stem-cell, regenerative and gene therapies with the <b className="text-white">same results</b> — every therapy
              coded, every step, dose, interval and consumable documented, every risk pre-screened.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <span key={c.key} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white">
                  <span style={{ color: c.accent }}><Icon name={c.icon as IconName} className="h-4 w-4" /></span>
                  {c.key} · {c.name} <span className="text-white/50">({counts[c.key] || 0})</span>
                </span>
              ))}
            </div>
          </div>

          {/* Facility-level launchers — neumorphic blue control panel */}
          <div className="neu-tray p-5">
            <p className="mb-4 px-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-700/50">Build your facility</p>
            <div className="flex flex-col gap-4">
              {FACILITY_SUMMARY.map((lv, i) => (
                <Link
                  key={lv.n}
                  to={`/protocols/facility/${lv.n}`}
                  className="neu-btn group flex items-center gap-4 p-3.5"
                >
                  <span
                    className="neu-med grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-base font-bold text-white"
                    style={{ background: MED_BLUE[i] }}
                  >
                    {lv.n}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[10px] font-semibold tracking-wide text-clay-600">
                      LEVEL {lv.n} · {lv.cost}
                    </span>
                    <span className="mt-0.5 block font-display text-sm font-semibold leading-snug text-ink-900">{lv.name}</span>
                    <span className="mt-0.5 block text-[11px] text-ink-700/55">{lv.cumulative}</span>
                  </span>
                  <span className="neu-arw grid h-8 w-8 shrink-0 place-items-center rounded-full text-clay-600 transition group-hover:text-clay-700">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6">
                      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Safety & standards backbone */}
      <section className="container-x py-10">
        <h2 className="font-display text-2xl font-extrabold text-ink-900">Safety &amp; quality backbone</h2>
        <p className="mt-1 max-w-3xl text-ink-700/70">
          Every coded protocol inherits this cross-cutting layer, grounded in the established frameworks that govern cell &amp; gene therapy.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STANDARDS.map((g) => (
            <div key={g.key} className="card p-5">
              <div className="flex items-center gap-2">
                <span className="icon-tile h-9 w-9"><Icon name={g.icon as IconName} className="h-5 w-5" /></span>
                <h3 className="font-display text-base font-bold text-ink-900">{g.title}</h3>
              </div>
              <ul className="mt-3 space-y-2">
                {g.items.map((it) => (
                  <li key={it.label} className="text-sm">
                    <span className="font-semibold text-clay-700">{it.label}</span>
                    <span className="text-ink-700/70"> — {it.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Delivery routes explainer */}
      <section className="container-x border-t border-cream-300 py-10">
        <h2 className="font-display text-2xl font-extrabold text-ink-900">How therapies are delivered</h2>
        <p className="mt-1 max-w-3xl text-ink-700/70">
          The delivery route decides how a therapy reaches its target — and, with living cells, it drives both the
          mechanism and the risk profile. Every coded protocol states its route; here is what each one means.
        </p>

        {/* cells vs cell-free (answers "where do IV exosomes fit?") */}
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-cream-300 bg-cream-50 p-5">
            <div className="flex items-center gap-2">
              <span className="icon-tile h-9 w-9"><Icon name="dna" className="h-5 w-5" /></span>
              <h3 className="font-display text-base font-bold text-ink-900">MSC therapy — delivering living cells</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-700/80">
              MSCs (mesenchymal stromal cells) are living cells, so delivery is about getting them where they act.
              <b> Systemic (IV)</b> sends them through the bloodstream — most are trapped in the lung capillaries within
              minutes and cleared in 1–2 days, so the benefit is a paracrine <i>“hit-and-run”</i> anti-inflammatory /
              immunomodulatory effect, not permanent engraftment. Because the cells are large, IV also carries the
              embolic / clotting (IBMIR) risk our Simulator screens for. <b>Local delivery</b> (into a joint, the CSF,
              or the target tissue) instead places a high cell dose exactly where it is needed and avoids the lung trap.
            </p>
          </div>
          <div className="rounded-2xl p-5" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.25)' }}>
            <div className="flex items-center gap-2">
              <span className="icon-tile h-9 w-9"><Icon name="heart" className="h-5 w-5" /></span>
              <h3 className="font-display text-base font-bold text-ink-900">Where IV exosomes fit — the cell-free signal</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-700/80">
              Exosomes are <b>not a delivery route for MSCs</b> — they are a different product: the cell-free
              “message in a bottle” that MSCs secrete (nano-vesicles carrying the same paracrine cargo). IV exosomes
              infuse that signal directly, without the living cell — so they are ~1,000× smaller, <b>skip the lung trap
              and the clot / tumour risk</b>, and can biodistribute more freely (even toward the CNS). The trade-offs:
              <b> no consensus dose</b> (particle-count based) and they remain <b>investigational / not approved</b> for
              most uses. This is why the modality-aware Simulator swaps in an <b>IV exosome carrier</b> for MSC-class therapies.
            </p>
          </div>
        </div>

        {/* route reference grid */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ROUTES.map((r) => (
            <div key={r.name} className="card p-4">
              <div className="flex items-center gap-2">
                <span className="icon-tile h-8 w-8"><Icon name={r.icon} className="h-4 w-4" /></span>
                <h4 className="font-display text-sm font-bold text-ink-900">{r.name}</h4>
                <span className={`chip ml-auto ${SCOPE_STYLE[r.scope]}`}>{r.scope}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-700/70">{r.blurb}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs italic text-ink-700/55">
          Scope: <b>Systemic</b> = whole-body via the circulation · <b>Local</b> = placed at the target · <b>Surface</b> =
          skin / wound · <b>Targeted</b> = organ-specific access. Route detail and risks are listed on each protocol page.
        </p>
      </section>

      {/* Facility levels */}
      <section className="border-t border-cream-300 bg-cream-50/50">
        <div className="container-x py-10">
          <h2 className="font-display text-2xl font-extrabold text-ink-900">StemCells Protocol facility levels</h2>
          <p className="mt-1 max-w-3xl text-ink-700/70">
            A phased build — a clinic that earns from day one funds the climb to a full cell &amp; gene-therapy
            centre. Each level adds capability and unlocks more of the catalogue.
          </p>
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {LEVELS.map((lv) => (
              <Link key={lv.n} to={`/protocols/facility/${lv.n}`} className="card group flex flex-col overflow-hidden p-0 transition hover:-translate-y-0.5 hover:shadow-lg" style={{ borderTop: `3px solid ${lv.accent}` }}>
                <div className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-lg px-2.5 py-1 font-mono text-xs font-bold text-white" style={{ background: lv.accent }}>
                      LEVEL {lv.n}
                    </span>
                    <div className="text-right">
                      <p className="font-display text-lg font-extrabold leading-none" style={{ color: lv.accent }}>{lv.cost}</p>
                      <p className="mt-1 text-[11px] text-ink-700/55">{lv.costNote}</p>
                    </div>
                  </div>
                  <h3 className="mt-3 font-display text-base font-bold text-ink-900">{lv.name}</h3>
                  <p className="mt-1 text-xs font-semibold" style={{ color: lv.accent }}>{lv.cumulative}</p>
                  <p className="mt-2 text-sm text-ink-700/70">{lv.adds}</p>
                </div>
                <div className="mt-auto border-t border-cream-300 bg-white/60 p-5">
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-700/50">Therapies unlocked</p>
                  <div className="flex flex-wrap gap-1.5">
                    {lv.unlocks.map((u) => (
                      <span
                        key={u.label}
                        className="rounded-md px-2 py-1 text-xs font-medium"
                        style={u.flag
                          ? { background: lv.accent, color: '#fff' }
                          : { background: `${lv.accent}18`, color: lv.accent }}
                      >
                        {u.flag && '★ '}{u.label}
                      </span>
                    ))}
                  </div>
                  {lv.unlockNote && <p className="mt-3 text-xs italic text-ink-700/60">{lv.unlockNote}</p>}
                  <p className="mt-3 text-xs font-semibold" style={{ color: lv.accent }}>View equipment &amp; costs →</p>
                </div>
              </Link>
            ))}
          </div>
          <p className="mt-4 text-xs italic text-ink-700/55">
            Costs are representative new-equipment ballparks and therapy mappings are guidance — validation-required,
            not a compliance or investment guarantee. Level 3 is reachable capital-light via a CDMO + partner hospital.
          </p>
        </div>
      </section>

      {/* Registry */}
      <section className="container-x pb-14">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-extrabold text-ink-900">Coded protocol registry</h2>
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search code, therapy, condition…"
            className="input w-full max-w-xs"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(['ALL', ...CATEGORIES.map((c) => c.key)] as (Category | 'ALL')[]).map((k) => (
            <button
              key={k} type="button" onClick={() => setCat(k)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${cat === k ? 'border-clay-500 bg-clay-500 text-white' : 'border-cream-300 bg-white text-ink-800 hover:border-clay-400'}`}
            >
              {k === 'ALL' ? `All (${PROTOCOLS.length})` : `${k} · ${counts[k] || 0}`}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => <ProtocolCard key={p.code} p={p} />)}
        </div>
        {list.length === 0 && <p className="mt-6 text-ink-700/60">No protocols match that search.</p>}

        <p className="mt-8 rounded-2xl border border-cream-300 bg-cream-50 p-4 text-xs italic text-ink-700/60">{DISCLAIMER}</p>
      </section>
    </div>
  );
}

function ProtocolCard({ p }: { p: Protocol }) {
  const c = CATEGORIES.find((x) => x.key === p.category)!;
  return (
    <Link to={`/protocols/${p.code}`} className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center justify-between">
        <span className="rounded-lg px-2 py-0.5 font-mono text-sm font-bold text-white" style={{ background: c.accent }}>{p.code}</span>
        <span className={`chip ${p.status === 'established' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
          {p.status === 'established' ? 'Established' : 'Investigational'}
        </span>
      </div>
      <h3 className="mt-2 font-display text-base font-bold text-ink-900 group-hover:text-clay-700">{p.name}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-ink-700/70">{p.indication}</p>
      {p.regions && <p className="mt-2 text-[11px] font-semibold text-ink-700/45">📍 {p.regions}</p>}
      <div className="mt-3 flex items-center gap-2 text-xs text-ink-700/55">
        <span style={{ color: c.accent }}><Icon name={c.icon as IconName} className="h-4 w-4" /></span>
        {c.name}
        {p.detailed && <span className="ml-auto rounded-full bg-clay-50 px-2 py-0.5 font-semibold text-clay-700">Full protocol ✓</span>}
      </div>
    </Link>
  );
}
