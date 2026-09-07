import { useEffect, useMemo, useRef, useState } from 'react';
import type { FullRun } from '../sim/full';
import { summarizeRun } from '../sim/full';
import { exportSimPdf } from '../sim/pdf';
import { projectRejuvenation, projectRegeneration, tumorSafety } from '../sim/pipeline';
import { immuneSafety } from '../sim/immune';
import { modalityOf } from '../sim/catalog';

/* Animated simulator run rendered inside the chat / on the page.
   White neumorphic theme. The step list adapts to the therapy MODALITY:
   - reprogramming (Age-Rejuvenation): age reversal + OSK construct + tumorigenicity
   - cell therapy (everything else):   regeneration projection + IV exosome (no tumorigenicity) */

// ── white-neumorphic palette ──────────────────────────────────────────────
const C = {
  ink: '#14213d', sub: '#5a6b8a', faint: '#8798b8', line: '#e6ecf6', track: '#eaf0fa',
  blue: '#2f6fe0', blueBright: '#4285f4', teal: '#0d8478', cyan: '#0891b2',
  green: '#16a34a', red: '#dc2626', amber: '#d97706', purple: '#7c3aed',
};

type Kind = 'sample' | 'ingest' | 'age' | 'reversal' | 'regeneration' | 'construct' | 'exosome' | 'avatar' | 'tumor' | 'immune';
const DEF: Record<Kind, { tag: string; title: string }> = {
  sample: { tag: 'SAMPLE', title: 'Sample & therapy' },
  ingest: { tag: 'SEQUENCE', title: 'Data ingest' },
  age: { tag: 'ANALYSE', title: 'Epigenetic age' },
  reversal: { tag: 'REVERSE', title: 'Reprogramming projection' },
  regeneration: { tag: 'REGEN', title: 'Regeneration projection' },
  construct: { tag: 'VECTOR', title: 'OSK construct' },
  exosome: { tag: 'CARRIER', title: 'IV exosome carrier' },
  avatar: { tag: 'AVATAR', title: 'Safety pre-screen' },
  tumor: { tag: 'SAFETY', title: 'Tumorigenicity envelope' },
  immune: { tag: 'IMMUNE', title: 'Immune & adverse-event safety' },
};
function stepsFor(isReprog: boolean): Kind[] {
  return isReprog
    ? ['sample', 'ingest', 'age', 'reversal', 'construct', 'avatar', 'tumor', 'immune']
    : ['sample', 'ingest', 'age', 'regeneration', 'exosome', 'avatar', 'immune'];
}

const SCAN_MS = 780;
const prefersReduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// Immune symptom LIKELIHOOD (not severity) — top tier is a calm blue, never red.
const IMM_TIER_COLOR = (t: string) => (t === 'Uncommon' ? C.green : t === 'Common' ? C.blueBright : C.amber);

function useCountUp(target: number, active: boolean, ms = 800, decimals = 0) {
  const [v, setV] = useState(active ? target : 0);
  useEffect(() => {
    if (!active) return;
    if (prefersReduced) { setV(target); return; }
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms); const e = 1 - Math.pow(1 - p, 3);
      setV(target * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, ms]);
  return decimals ? v.toFixed(decimals) : Math.round(v).toString();
}

function Bar({ pct, color, height = 8 }: { pct: number; color: string; height?: number }) {
  return (
    <div style={{ height, background: C.track, borderRadius: 99, overflow: 'hidden', boxShadow: 'inset 1px 1px 3px rgba(21,58,124,.10)' }}>
      <div style={{ width: `${Math.max(2, Math.min(100, pct))}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .9s cubic-bezier(.2,.8,.2,1)' }} />
    </div>
  );
}

const stepBtn = { width: 26, height: 26, borderRadius: 99, border: 0, background: '#fff', color: C.blue, fontSize: 16, fontWeight: 700, cursor: 'pointer', lineHeight: '22px', boxShadow: '2px 2px 5px rgba(21,58,124,.16), -2px -2px 5px #ffffff' } as const;

function Stepper({ label, cycles, onStep, hint }: { label: string; cycles: number; onStep: (d: number) => void; hint?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f3f7fd', border: '1px solid ' + C.line, borderRadius: 12, padding: '7px 10px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: C.ink }}>{label}</span>
      <button aria-label="fewer" onClick={() => onStep(-1)} disabled={cycles <= 1} style={{ ...stepBtn, opacity: cycles <= 1 ? 0.4 : 1 }}>−</button>
      <span style={{ minWidth: 18, textAlign: 'center', fontSize: 15, fontWeight: 800, color: C.ink }}>{cycles}</span>
      <button aria-label="more" onClick={() => onStep(1)} disabled={cycles >= 10} style={{ ...stepBtn, opacity: cycles >= 10 ? 0.4 : 1 }}>+</button>
      {hint && <span style={{ fontSize: 10.5, color: C.sub, marginLeft: 4 }}>{hint}</span>}
    </div>
  );
}

function GeneMap({ vector }: { vector: any }) {
  const color = (nm: string) => {
    const s = nm.toLowerCase();
    if (s.includes('itr')) return '#94a3b8';
    if (/promoter|tre|efs|ef1|cmv/.test(s)) return C.blueBright;
    if (/oct4|sox2|klf4|rtta|cds|pou5f1/.test(s)) return '#22c55e';
    if (/p2a|t2a|peptide/.test(s)) return '#f59e0b';
    if (s.includes('polya')) return '#a78bfa';
    if (/kozak|start/.test(s)) return '#2dd4bf';
    if (s.includes('wpre')) return '#60a5fa';
    return '#64748b';
  };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.sub, marginBottom: 3 }}>
        <span style={{ fontWeight: 700, color: C.ink }}>{vector.name} · {vector.length_bp} bp</span>
        <span style={{ color: vector.fits_aav ? C.green : C.red, fontWeight: 700 }}>{vector.fits_aav ? '✓ fits AAV' : '✗ over limit'}</span>
      </div>
      <div style={{ display: 'flex', height: 16, borderRadius: 6, overflow: 'hidden', boxShadow: '2px 2px 6px rgba(21,58,124,.14)' }}>
        {vector.features.map((f: any, i: number) => (
          <div key={i} title={f.name} style={{ flex: Math.max(1, f.length), background: color(f.name), borderRight: '1px solid #ffffff' }} />
        ))}
      </div>
    </div>
  );
}

function ExosomeCard({ exo }: { exo: any }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        {/* vesicle motif */}
        <svg width="34" height="34" viewBox="0 0 34 34" style={{ flexShrink: 0, filter: 'drop-shadow(2px 2px 4px rgba(21,58,124,.2))' }}>
          <circle cx="17" cy="17" r="12" fill="none" stroke={C.blueBright} strokeWidth="2" />
          <circle cx="17" cy="17" r="12" fill="rgba(66,133,244,.10)" />
          {[0, 60, 120, 180, 240, 300].map((a) => {
            const r = (a * Math.PI) / 180; return <circle key={a} cx={17 + 12 * Math.cos(r)} cy={17 + 12 * Math.sin(r)} r="2" fill={C.cyan} />;
          })}
          <circle cx="14" cy="15" r="2" fill="#22c55e" /><circle cx="20" cy="19" r="2" fill="#a78bfa" /><circle cx="18" cy="13" r="1.6" fill="#f59e0b" />
        </svg>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>{exo.strategy}</div>
          <div style={{ fontSize: 10.5, color: C.sub }}>{exo.vesicle_size_nm} nm · {exo.route}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {[
          ['Cargo', exo.cargo],
          ['Targeting', `${exo.targeting.tissue} — ${exo.targeting.ligand}`],
          ['Source', exo.source_cell],
        ].map(([k, v]) => (
          <div key={k as string} style={{ display: 'flex', gap: 8, fontSize: 11.5 }}>
            <span style={{ minWidth: 64, color: C.sub, fontWeight: 700 }}>{k}</span>
            <span style={{ color: C.ink }}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {exo.advantages.slice(0, 4).map((a: string) => (
          <span key={a} style={{ background: 'rgba(22,163,74,.10)', color: '#15803d', border: '1px solid rgba(22,163,74,.28)', borderRadius: 99, padding: '2px 8px', fontSize: 10 }}>✓ {a.split(' — ')[0]}</span>
        ))}
      </div>
    </div>
  );
}

function StepCard({ kind, num, run, rej, regen, t, im, cycles, cycleLabel, onStep, active, revealed }: {
  kind: Kind; num: number; run: FullRun; rej: any; regen: any; t: any; im: any; cycles: number; cycleLabel: string; onStep: (d: number) => void; active: boolean; revealed: boolean;
}) {
  const s = DEF[kind];
  const ea = run.epigenetic_age;
  const dnam = useCountUp(ea.dnam_age, active && kind === 'age', 900, 1);
  const cov = useCountUp(run.coverage_pct, active && kind === 'ingest', 700);
  const state = revealed ? 'revealed' : active ? 'scanning' : 'pending';
  const tierColor = t.risk_tier === 'Low' ? C.green : t.risk_tier === 'High' ? C.red : C.amber;
  const risk = Math.round(t.estimated_risk * 100);
  const isReprog = run.modality === 'reprogramming';

  return (
    <div style={{
      opacity: state === 'pending' ? 0.4 : 1,
      transform: state === 'revealed' ? 'none' : 'translateY(6px)',
      transition: 'opacity .5s, transform .5s',
      borderLeft: `2px solid ${active ? C.cyan : revealed ? 'rgba(66,133,244,.45)' : C.line}`,
      padding: '10px 0 14px 14px', position: 'relative',
    }}>
      <div style={{ position: 'absolute', left: -7, top: 10, width: 12, height: 12, borderRadius: 99,
        background: revealed ? C.blueBright : active ? C.cyan : '#cdd8ea',
        boxShadow: active ? `0 0 10px ${C.cyan}` : revealed ? '1px 1px 3px rgba(21,58,124,.25)' : 'none', transition: 'all .3s' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: revealed ? 8 : 0 }}>
        <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: 10, letterSpacing: '.18em', color: active ? C.cyan : C.faint }}>{String(num).padStart(2, '0')} · {s.tag}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{s.title}</span>
        {active && !revealed && <span className="scp-scan" style={{ marginLeft: 'auto', fontSize: 10, color: C.cyan, fontFamily: 'ui-monospace,monospace' }}>scanning…</span>}
      </div>

      {revealed && (
        <div style={{ fontSize: 12.5, color: C.ink }}>
          {kind === 'sample' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[run.disease.name, run.disease.tissue, isReprog ? `capsid ${run.disease.capsid.toUpperCase()}` : 'IV exosome', run.disease.route].map((x) => (
                <span key={x} style={{ background: 'rgba(66,133,244,.10)', color: C.blue, border: '1px solid rgba(66,133,244,.22)', borderRadius: 99, padding: '3px 10px', fontSize: 11.5, fontWeight: 600 }}>{x}</span>
              ))}
              <span style={{ background: isReprog ? 'rgba(124,58,237,.10)' : 'rgba(22,163,74,.10)', color: isReprog ? C.purple : '#15803d', border: `1px solid ${isReprog ? 'rgba(124,58,237,.28)' : 'rgba(22,163,74,.28)'}`, borderRadius: 99, padding: '3px 10px', fontSize: 11.5, fontWeight: 700 }}>
                {isReprog ? 'Reprogramming (OSK)' : 'Cell / regenerative therapy'}
              </span>
            </div>
          )}
          {kind === 'ingest' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: C.sub }}>Clock CpGs mapped ({ea.clock})</span>
                <span style={{ fontWeight: 700, color: C.blue }}>{ea.n_used}/{ea.n_total} · {cov}%</span>
              </div>
              <Bar pct={run.coverage_pct} color={`linear-gradient(90deg,${C.blueBright},${C.teal})`} />
            </div>
          )}
          {kind === 'age' && (
            <div>
              <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div><div style={{ fontSize: 30, fontWeight: 800, color: C.ink, lineHeight: 1 }}>{dnam}<span style={{ fontSize: 13, color: C.sub }}> yr</span></div><div style={{ fontSize: 10.5, color: C.sub, marginTop: 3 }}>BIOLOGICAL (DNAm) AGE</div></div>
                {ea.age_acceleration != null && <div><div style={{ fontSize: 22, fontWeight: 800, color: ea.age_acceleration >= 0 ? C.red : C.green, lineHeight: 1 }}>{ea.age_acceleration >= 0 ? '+' : ''}{ea.age_acceleration}</div><div style={{ fontSize: 10.5, color: C.sub, marginTop: 3 }}>ACCELERATION (yr)</div></div>}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: C.sub }}>Top drivers: {run.targets.slice(0, 5).map((x: any) => x.gene || x.cpg).join(' · ')}</div>
              <div style={{ marginTop: 10 }}>
                <Stepper label={cycleLabel} cycles={cycles} onStep={onStep}
                  hint={isReprog
                    ? `${ea.dnam_age} → ${rej.projected_age} yr after ${cycles} (−${rej.years_reversed} yr)`
                    : `tissue-repair ${regen.regeneration_index}% after ${cycles} dose${cycles > 1 ? 's' : ''}`} />
              </div>
            </div>
          )}
          {kind === 'reversal' && (
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div><div style={{ fontSize: 24, fontWeight: 800, color: C.green, lineHeight: 1 }}>−{rej.years_reversed} yr</div><div style={{ fontSize: 10.5, color: C.sub, marginTop: 3 }}>AGE REVERSAL ({rej.cycles} cycle{rej.cycles > 1 ? 's' : ''})</div></div>
              <div><div style={{ fontSize: 24, fontWeight: 800, color: C.teal, lineHeight: 1 }}>{rej.tissue_rejuvenation_index}%</div><div style={{ fontSize: 10.5, color: C.sub, marginTop: 3 }}>TISSUE REJUVENATION</div></div>
              <div style={{ fontSize: 12, color: C.sub }}>{ea.dnam_age} → <b style={{ color: C.ink }}>{rej.projected_age} yr</b></div>
            </div>
          )}
          {kind === 'regeneration' && (
            <div>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 8 }}>
                <div><div style={{ fontSize: 28, fontWeight: 800, color: C.green, lineHeight: 1 }}>{regen.regeneration_index}%</div><div style={{ fontSize: 10.5, color: C.sub, marginTop: 3 }}>TISSUE-REPAIR INDEX ({regen.doses} dose{regen.doses > 1 ? 's' : ''})</div></div>
                <div style={{ fontSize: 12, color: C.sub }}>target: <b style={{ color: C.ink }}>{run.disease.tissue}</b></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 54, borderBottom: '1px solid ' + C.line, paddingBottom: 2, marginBottom: 8 }}>
                {regen.per_dose.map((d: any) => (
                  <div key={d.dose} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                    <span style={{ fontSize: 9, color: C.sub }}>{d.repaired}%</span>
                    <div style={{ width: '70%', height: `${Math.max(4, d.repaired)}%`, background: d.dose === cycles ? C.green : 'rgba(22,163,74,.4)', borderRadius: '3px 3px 0 0', transition: 'height .8s' }} />
                    <span style={{ fontSize: 9, color: C.faint, marginTop: 2 }}>{d.dose}</span>
                  </div>
                ))}
              </div>
              <Stepper label={cycleLabel} cycles={cycles} onStep={onStep} hint="repair compounds with diminishing returns" />
            </div>
          )}
          {kind === 'construct' && run.construct && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, color: C.sub }}>{run.construct.strategy} · {run.construct.capsid_desc}</div>
              {run.construct.vectors.map((v: any, k: number) => <GeneMap key={k} vector={v} />)}
            </div>
          )}
          {kind === 'exosome' && run.exosome && <ExosomeCard exo={run.exosome} />}
          {kind === 'avatar' && (
            <div>
              {[['Without avatar', run.safety.projected_success_without, C.faint], ['With avatar pre-screen', run.safety.projected_success_with, C.green]].map(([lab, pct, col]) => (
                <div key={lab as string} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}><span style={{ color: C.sub }}>{lab}</span><span style={{ fontWeight: 700, color: col as string }}>{pct}%</span></div>
                  <Bar pct={pct as number} color={col as string} height={9} />
                </div>
              ))}
            </div>
          )}
          {kind === 'tumor' && (
            <div>
              <div style={{ marginBottom: 10 }}>
                <Stepper label={cycleLabel} cycles={cycles} onStep={onStep} hint="step up to watch over-induction risk climb" />
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 8 }}>
                <div><div style={{ fontSize: 22, fontWeight: 800, color: tierColor, lineHeight: 1 }}>{t.risk_tier}</div><div style={{ fontSize: 10, color: C.sub }}>RISK TIER</div></div>
                <div><div style={{ fontSize: 22, fontWeight: 800, color: tierColor, lineHeight: 1 }}>{risk}%</div><div style={{ fontSize: 10, color: C.sub }}>@ {t.requested_cycles} CYCLE</div></div>
                <div><div style={{ fontSize: 22, fontWeight: 800, color: C.blue, lineHeight: 1 }}>{t.max_safe_cycles}</div><div style={{ fontSize: 10, color: C.sub }}>MAX SAFE</div></div>
                <div><div style={{ fontSize: 22, fontWeight: 800, color: C.blue, lineHeight: 1 }}>{t.tissue_proliferation_factor}×</div><div style={{ fontSize: 10, color: C.sub }}>{String(t.tissue_key).toUpperCase()}</div></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60, borderBottom: '1px solid ' + C.line, paddingBottom: 2 }}>
                {t.risk_curve.map((c: any) => {
                  const over = c.risk > (t.risk_threshold || 0.15);
                  return (
                    <div key={c.cycles} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                      <span style={{ fontSize: 9, color: C.sub }}>{Math.round(c.risk * 100)}%</span>
                      <div style={{ width: '70%', height: `${Math.min(100, c.risk * 100 / 0.6 * 100)}%`, background: c.cycles === t.requested_cycles ? tierColor : over ? 'rgba(220,38,38,.45)' : 'rgba(66,133,244,.4)', borderRadius: '3px 3px 0 0', transition: 'height .8s' }} />
                      <span style={{ fontSize: 9, color: C.faint, marginTop: 2 }}>{c.cycles}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 10, color: C.faint, marginTop: 4 }}>Green ≤ {Math.round((t.risk_threshold || 0.15) * 100)}% · red &gt; threshold · cycles →</div>
            </div>
          )}
          {kind === 'immune' && im && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: IMM_TIER_COLOR(im.overall_tier), lineHeight: 1 }}>{im.overall_tier}</div>
                  <div style={{ fontSize: 10, color: C.sub }}>SYMPTOM OUTLOOK · usually mild</div>
                </div>
                {im.comorbidities?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginLeft: 4 }}>
                    {im.comorbidities.map((c: string) => (
                      <span key={c} style={{ background: 'rgba(217,119,6,.12)', color: '#b45309', border: '1px solid rgba(217,119,6,.3)', borderRadius: 99, padding: '2px 8px', fontSize: 10.5, fontWeight: 600 }}>{c}</span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {im.classes.map((c: any) => (
                  <div key={c.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                      <span style={{ color: C.ink, fontWeight: 600 }}>{c.label}</span>
                      <span style={{ fontWeight: 700, color: IMM_TIER_COLOR(c.tier) }}>{c.tier}</span>
                    </div>
                    <Bar pct={Math.round(c.index * 100)} color={IMM_TIER_COLOR(c.tier)} height={7} />
                    <div style={{ fontSize: 10, color: C.sub, marginTop: 3 }}>{c.symptoms.slice(0, 4).join(' · ')}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                <div style={{ background: 'rgba(220,38,38,.05)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 10, padding: '7px 9px' }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.08em', color: '#b91c1c', marginBottom: 3 }}>WHAT THIS CAN'T SEE</div>
                  {im.cant_see.slice(0, 3).map((x: string) => <div key={x} style={{ fontSize: 10, color: C.ink, marginBottom: 2 }}>✗ {x}</div>)}
                </div>
                <div style={{ background: 'rgba(66,133,244,.06)', border: '1px solid rgba(66,133,244,.25)', borderRadius: 10, padding: '7px 9px' }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.08em', color: C.blue, marginBottom: 3 }}>ASK YOUR CLINICIAN FOR</div>
                  {im.tests_to_ask.slice(0, 3).map((x: string) => <div key={x} style={{ fontSize: 10, color: C.ink, marginBottom: 2 }}>• {x}</div>)}
                </div>
              </div>
              {im.modifiable?.length > 0 && <div style={{ marginTop: 8, fontSize: 10.5, color: '#15803d' }}>↺ {im.modifiable[0]}</div>}
              <div style={{ fontSize: 9.5, color: C.faint, marginTop: 8, fontStyle: 'italic' }}>Relative, probabilistic — not a yes/no verdict. Informs the conversation with your clinician.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SimRun({ run, onExplain, instant, onDone }: { run: FullRun; onExplain?: (summary: string) => void; instant?: boolean; onDone?: () => void }) {
  const modality = run.modality || modalityOf(run.disease?.department || '');
  const isReprog = modality === 'reprogramming';
  const steps = useMemo(() => stepsFor(isReprog), [isReprog]);
  const cycleLabel = isReprog ? 'Reprogramming cycles' : 'Stem-cell therapy cycles';

  const skip = prefersReduced || !!instant;
  const [revealed, setRevealed] = useState(skip ? steps.length : 0);
  const [active, setActive] = useState(skip ? -1 : 0);
  const [done, setDone] = useState(skip);
  const timers = useRef<number[]>([]);

  const ea = run.epigenetic_age;
  const tk = run.tissue_key || run.rejuvenation?.tissue_key || run.tumor?.tissue_key || 'systemic';
  const [cycles, setCycles] = useState<number>(run.rejuvenation?.cycles || run.regeneration?.doses || 1);
  const rej = useMemo(() => projectRejuvenation(ea.dnam_age, ea.coverage, tk, cycles), [cycles, ea.dnam_age, ea.coverage, tk]);
  const regen = useMemo(() => projectRegeneration(tk, ea.coverage, cycles), [cycles, ea.coverage, tk]);
  const tumor = useMemo(() => tumorSafety({
    dnamAge: ea.dnam_age, ageAcceleration: ea.age_acceleration, coverage: ea.coverage,
    youthSetpoint: rej.youth_setpoint, efficiency: rej.efficiency, tissueKey: tk, cycles,
  }), [cycles, rej, ea, tk]);
  const immune = useMemo(() => immuneSafety({
    tissueKey: tk, department: run.disease?.department, ageAcceleration: ea.age_acceleration,
    coverage: ea.coverage, cycles, comorbidities: run.comorbidities || [],
  }), [cycles, ea, tk, run.disease, run.comorbidities]);
  const stepCycles = (d: number) => setCycles((c) => Math.max(1, Math.min(10, c + d)));

  useEffect(() => {
    if (skip) { onDone?.(); return; }
    let i = 0;
    const step = () => {
      if (i >= steps.length) { setActive(-1); setDone(true); onDone?.(); return; }
      setActive(i);
      timers.current.push(window.setTimeout(() => {
        setRevealed(i + 1); i += 1;
        timers.current.push(window.setTimeout(step, 420));
      }, SCAN_MS));
    };
    step();
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, []);

  const pdf = () => {
    exportSimPdf({
      disease: run.disease, modality, sample: run.sample, chronological_age: run.chronological_age,
      epigenetic_age: run.epigenetic_age, targets: run.targets, rejuvenation: rej, regeneration: regen,
      construct: run.construct, exosome: run.exosome, safety: run.safety,
      tumor: isReprog ? tumor : undefined, immune,
    }, `StemCells-Simulator-${run.sample}.pdf`);
  };

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e9eef7', borderRadius: 16, padding: 14, color: C.ink,
      boxShadow: '8px 10px 26px rgba(21,58,124,.12), -8px -8px 22px #ffffff', fontFamily: 'inherit',
    }}>
      <style>{`
        @keyframes scpScan{0%,100%{opacity:.4}50%{opacity:1}}
        .scp-scan{animation:scpScan 1s ease-in-out infinite}
        @keyframes scpPulse{0%,100%{box-shadow:0 0 0 0 rgba(66,133,244,.35)}50%{box-shadow:0 0 0 6px rgba(66,133,244,0)}}
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: 99, background: done ? C.green : C.blueBright, animation: done ? 'none' : 'scpPulse 1.4s infinite' }} />
        <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: 11, letterSpacing: '.16em', color: C.sub }}>
          {done ? 'RUN COMPLETE' : 'PROTOCOL SIMULATOR · RUNNING'}
        </span>
        <span style={{ marginLeft: 'auto', fontFamily: 'ui-monospace,monospace', fontSize: 11, color: C.blue }}>{Math.min(revealed, steps.length)}/{steps.length}</span>
      </div>

      <div>
        {steps.map((kind, i) => (
          <StepCard key={kind} kind={kind} num={i + 1} run={run} rej={rej} regen={regen} t={tumor} im={immune}
            cycles={cycles} cycleLabel={cycleLabel} onStep={stepCycles} active={active === i} revealed={i < revealed} />
        ))}
      </div>

      {done && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid #e9eef7' }}>
          <button onClick={pdf} style={{ background: `linear-gradient(90deg,${C.blueBright},${C.teal})`, color: '#fff', fontWeight: 700, border: 0, borderRadius: 10, padding: '8px 14px', fontSize: 12.5, cursor: 'pointer', boxShadow: '3px 4px 10px rgba(21,58,124,.22)' }}>⬇ Export PDF</button>
          {onExplain && <button onClick={() => onExplain(summarizeRun({ ...run, rejuvenation: rej, regeneration: regen, tumor, immune }))} style={{ background: '#fff', color: C.blue, border: 0, borderRadius: 10, padding: '8px 14px', fontSize: 12.5, cursor: 'pointer', boxShadow: '3px 3px 8px rgba(21,58,124,.12), -3px -3px 8px #ffffff' }}>💬 Explain in plain language</button>}
        </div>
      )}
      <div style={{ fontSize: 10, color: C.faint, marginTop: 10 }}>Research / illustrative — computed on your device. Not medical advice.</div>
    </div>
  );
}
