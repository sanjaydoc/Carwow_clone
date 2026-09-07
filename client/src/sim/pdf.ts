// Client-side PDF export mirroring the offline Simulator report (export.py):
// blue header, KPI tiles, age/reversal bars, colour-coded CpG table + construct
// map, safety bars and a tumorigenicity risk chart. Built with jsPDF.
import { jsPDF } from 'jspdf';

type RGB = [number, number, number];
const PRIMARY: RGB = [66, 133, 244];
const PRIMARY_DK: RGB = [26, 86, 219];
const INK: RGB = [15, 23, 42];
const SUB: RGB = [100, 116, 139];
const GREEN: RGB = [22, 163, 74];
const AMBER: RGB = [245, 158, 11];
const RED: RGB = [220, 38, 38];
const TEAL: RGB = [13, 148, 136];
const BORDER: RGB = [226, 232, 240];
const BGSOFT: RGB = [241, 245, 249];
const WHITE: RGB = [255, 255, 255];

function tint(c: RGB, f: number): RGB {
  return [Math.round(255 - (255 - c[0]) * f), Math.round(255 - (255 - c[1]) * f), Math.round(255 - (255 - c[2]) * f)];
}
function tierColor(t?: string): RGB {
  const s = (t || '').toLowerCase();
  // immune symptom-likelihood scale (not severity) — top tier is calm blue, not red
  if (s.startsWith('uncommon')) return GREEN;
  if (s.startsWith('possible')) return AMBER;
  if (s.startsWith('common')) return PRIMARY;
  // tumorigenicity / other severity tiers
  if (s.startsWith('low')) return GREEN;
  if (s.startsWith('mod')) return AMBER;
  if (s.startsWith('high')) return RED;
  return PRIMARY;
}

export function exportSimPdf(p: any, filename = 'StemCells-Simulator-Report.pdf') {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40; const CW = W - 2 * M;
  let y = 0;
  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const txt = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const stroke = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
  const need = (h: number) => { if (y + h > H - 34) { doc.addPage(); y = M; } };

  // ---- header band ----
  fill(PRIMARY_DK); doc.roundedRect(M, M, CW, 58, 8, 8, 'F');
  fill(PRIMARY); doc.roundedRect(M + CW * 0.34, M, CW * 0.66, 58, 8, 8, 'F');
  // DNA helix mark
  stroke(WHITE); doc.setLineWidth(1.4);
  const cx = M + 22, top = M + 10, bh = 38, n = 16;
  const a: [number, number][] = []; const b: [number, number][] = [];
  for (let i = 0; i < n; i++) { const t = i / (n - 1); const yy = top + t * bh; const dx = 7 * Math.sin(t * Math.PI * 2.4); a.push([cx - dx, yy]); b.push([cx + dx, yy]); }
  for (let i = 0; i < n - 1; i++) { doc.line(a[i][0], a[i][1], a[i + 1][0], a[i + 1][1]); doc.line(b[i][0], b[i][1], b[i + 1][0], b[i + 1][1]); }
  doc.setLineWidth(0.8);
  for (let i = 0; i < n; i += 3) doc.line(a[i][0], a[i][1], b[i][0], b[i][1]);
  txt(WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text('StemCells Protocol — Simulator Report', M + 44, M + 24);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); txt(tint(WHITE, 1));
  const isReprogHdr = (p.modality || 'reprogramming') === 'reprogramming';
  doc.text(isReprogHdr ? 'Personalised epigenetic reprogramming & safety envelope' : 'Personalised regenerative cell therapy & safety envelope', M + 44, M + 38);
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8); txt([219, 230, 255]);
  doc.text('Research / illustrative — not medical advice.', M + 44, M + 50);
  y = M + 58 + 14;

  // ---- key/value table helper ----
  const kv = (rows: [string, string][], accent: RGB = PRIMARY) => {
    const kw = 150; const rh = 18;
    need(rows.length * rh + 6);
    rows.forEach(([k, v], i) => {
      const ry = y + i * rh;
      fill(tint(accent, 0.1)); doc.rect(M, ry, kw, rh, 'F');
      fill(WHITE); doc.rect(M + kw, ry, CW - kw, rh, 'F');
      stroke(BORDER); doc.setLineWidth(0.4); doc.rect(M, ry, CW, rh);
      txt(PRIMARY_DK); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
      doc.text(k, M + 6, ry + 12);
      txt(INK); doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(String(v), CW - kw - 12);
      doc.text(lines.slice(0, 1), M + kw + 6, ry + 12);
    });
    y += rows.length * rh + 8;
  };

  const section = (num: string, title: string, accent: RGB = PRIMARY) => {
    need(30);
    fill(accent); doc.roundedRect(M, y, 18, 18, 4, 4, 'F');
    txt(WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(num, M + 9, y + 13, { align: 'center' });
    txt(INK); doc.setFontSize(12.5); doc.text(title, M + 26, y + 13);
    stroke(tint(accent, 0.5)); doc.setLineWidth(1); doc.line(M, y + 22, M + CW, y + 22);
    y += 30;
  };

  // ---- patient / therapy ----
  const d = p.disease || {};
  const hdr: [string, string][] = [];
  if (d.name) hdr.push(['Therapy / disease', d.name]);
  if (d.department) hdr.push(['Department', d.department]);
  if (d.tissue) hdr.push(['Target tissue', d.tissue]);
  if (d.capsid) hdr.push(['AAV capsid', String(d.capsid).toUpperCase()]);
  if (p.sample) hdr.push(['Sample / patient', p.sample]);
  if (p.chronological_age != null) hdr.push(['Chronological age', String(p.chronological_age)]);
  if (hdr.length) kv(hdr);

  // ---- KPI tiles ----
  const isReprog = (p.modality || 'reprogramming') === 'reprogramming';
  const ea = p.epigenetic_age || {}; const rej = p.rejuvenation || {}; const regen = p.regeneration || {}; const tum = p.tumor || {};
  const cards: { value: string; label: string; color: RGB }[] = [];
  if (ea.dnam_age != null) cards.push({ value: `${ea.dnam_age}`, label: 'DNAm age (yrs)', color: PRIMARY });
  if (isReprog) {
    if (rej.years_reversed != null) cards.push({ value: `-${rej.years_reversed}`, label: 'years reversed', color: GREEN });
    if (rej.tissue_rejuvenation_index != null) cards.push({ value: `${rej.tissue_rejuvenation_index}%`, label: 'rejuvenation index', color: TEAL });
  } else if (regen.regeneration_index != null) {
    cards.push({ value: `${regen.regeneration_index}%`, label: 'regeneration index', color: GREEN });
    cards.push({ value: `${regen.doses}`, label: 'therapy doses', color: TEAL });
  }
  if (tum.risk_tier) cards.push({ value: tum.risk_tier, label: 'tumorigenicity tier', color: tierColor(tum.risk_tier) });
  if (cards.length) {
    need(58); const gap = 8; const cwid = (CW - gap * (cards.length - 1)) / cards.length;
    cards.forEach((c, i) => {
      const x = M + i * (cwid + gap);
      fill(tint(c.color, 0.12)); doc.roundedRect(x, y, cwid, 50, 6, 6, 'F');
      fill(c.color); doc.roundedRect(x, y, cwid, 5, 3, 3, 'F'); doc.rect(x, y + 2, cwid, 3, 'F');
      txt(c.color); doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text(c.value, x + cwid / 2, y + 30, { align: 'center' });
      txt(SUB); doc.setFontSize(7.5); doc.text(c.label, x + cwid / 2, y + 44, { align: 'center' });
    });
    y += 62;
  }

  // ---- §1 epigenetic age + age track ----
  if (ea.dnam_age != null) {
    section('1', 'Epigenetic age');
    need(30);
    const x0 = M + 2, x1 = M + CW - 6; const scale = (age: number) => x0 + (x1 - x0) * Math.min(100, Math.max(0, age)) / 100;
    fill(BGSOFT); doc.roundedRect(x0, y + 6, x1 - x0, 8, 4, 4, 'F');
    fill(PRIMARY); const xd = scale(ea.dnam_age); doc.roundedRect(x0, y + 6, Math.max(6, xd - x0), 8, 4, 4, 'F');
    txt(PRIMARY_DK); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.text(`DNAm ${ea.dnam_age} yr`, xd, y + 2, { align: 'center' });
    if (ea.chronological_age != null) { const xc = scale(ea.chronological_age); stroke(SUB); doc.setLineWidth(1); doc.line(xc, y, xc, y + 16); txt(SUB); doc.setFontSize(7.5); doc.text(`actual ${ea.chronological_age}`, xc, y + 26, { align: 'center' }); }
    txt(SUB); doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
    [0, 20, 40, 60, 80, 100].forEach((av) => doc.text(String(av), scale(av), y + 30, { align: 'center' }));
    y += 34;
    kv([
      ['Clock', String(ea.clock)],
      ['Predicted DNAm age (yrs)', String(ea.dnam_age)],
      ['Chronological age', ea.chronological_age != null ? String(ea.chronological_age) : 'Not provided'],
      ['Age acceleration', ea.age_acceleration != null ? `+${ea.age_acceleration} yr` : '— (needs chronological age)'],
      ['CpG coverage', `${ea.n_used}/${ea.n_total} (${ea.coverage})`],
    ]);
  }

  // ---- §2 reprogramming projection (reprogramming modality only) ----
  if (isReprog && rej.projected_age != null) {
    section('2', 'Reprogramming projection', GREEN);
    need(30);
    const x0 = M + 2, x1 = M + CW - 6; const scale = (age: number) => x0 + (x1 - x0) * Math.min(100, Math.max(0, age)) / 100;
    fill(BGSOFT); doc.roundedRect(x0, y + 6, x1 - x0, 10, 5, 5, 'F');
    const xp = scale(rej.projected_age), xd = scale(ea.dnam_age || rej.projected_age);
    fill(tint(GREEN, 0.35)); doc.rect(xp, y + 6, Math.max(2, xd - xp), 10, 'F');
    fill(GREEN); doc.roundedRect(x0, y + 6, Math.max(6, xp - x0), 10, 5, 5, 'F');
    txt(GREEN); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text(`after ${rej.projected_age}`, xp, y + 28, { align: 'center' });
    txt(SUB); doc.text(`before ${ea.dnam_age}`, xd, y + 28, { align: 'center' });
    fill(GREEN); doc.roundedRect(M + CW - 104, y - 4, 104, 15, 7, 7, 'F'); txt(WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.text(`-${rej.years_reversed} yr younger`, M + CW - 52, y + 6, { align: 'center' });
    y += 34;
    kv([['Cycles', String(rej.cycles)], ['Projected DNAm age (yrs)', String(rej.projected_age)], ['Years reversed', String(rej.years_reversed)], ['Tissue rejuvenation index', `${rej.tissue_rejuvenation_index}%`]], GREEN);
  }

  // ---- §2 regeneration projection (cell modality only) ----
  if (!isReprog && regen.regeneration_index != null) {
    section('2', 'Regeneration projection', GREEN);
    need(30);
    const x0 = M + 2; const tw = CW - 4;
    fill(BGSOFT); doc.roundedRect(x0, y + 6, tw, 10, 5, 5, 'F');
    fill(GREEN); doc.roundedRect(x0, y + 6, Math.max(6, tw * Math.min(1, regen.regeneration_index / 100)), 10, 5, 5, 'F');
    txt(GREEN); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.text(`tissue-repair index ${regen.regeneration_index}%`, x0, y + 2);
    y += 24;
    // per-dose bars
    const curve = regen.per_dose || [];
    if (curve.length) {
      need(60); const chartH = 44, baseY = y + chartH; const slot = (CW - 10) / curve.length;
      curve.forEach((d: any, i: number) => {
        const bx = M + i * slot + slot / 2 - 7; const hh = chartH * (d.repaired / 100);
        fill(d.dose === regen.doses ? GREEN : tint(GREEN, 0.4)); doc.rect(bx, baseY - hh, 14, hh, 'F');
        txt(SUB); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.text(`${d.repaired}%`, bx + 7, baseY - hh - 2, { align: 'center' }); doc.text(String(d.dose), bx + 7, baseY + 8, { align: 'center' });
      });
      y = baseY + 16;
    }
    kv([['Therapy doses', String(regen.doses)], ['Tissue-repair index', `${regen.regeneration_index}%`], ['Target tissue', String(p.disease?.tissue || regen.tissue_key)]], GREEN);
    if (regen.basis) { need(20); txt(SUB); doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.text(doc.splitTextToSize(regen.basis, CW), M, y); y += 20; }
  }

  // ---- §3 top CpGs ----
  const targets = p.targets || [];
  if (targets.length) {
    section('3', 'Top target CpGs');
    const cols = [110, 90, 40, 100, CW - 340];
    const head = ['CpG', 'Gene', 'Chr', 'Direction', 'Contribution'];
    need(20); fill(PRIMARY); doc.rect(M, y, CW, 16, 'F'); txt(WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    let cxp = M; head.forEach((h, i) => { doc.text(h, cxp + 4, y + 11); cxp += cols[i]; });
    y += 16;
    targets.slice(0, 12).forEach((t: any, i: number) => {
      need(15);
      fill(i % 2 ? BGSOFT : WHITE); doc.rect(M, y, CW, 15, 'F'); stroke(BORDER); doc.setLineWidth(0.3); doc.rect(M, y, CW, 15);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); txt(INK);
      const dcol = /demeth/i.test(t.direction) ? GREEN : RED;
      const cells = [t.cpg, t.gene || '-', String(t.chrom || '-'), t.direction, String(Math.round(t.contribution * 100000) / 100000)];
      cxp = M; cells.forEach((c, ci) => { if (ci === 3) { txt(dcol); doc.setFont('helvetica', 'bold'); } else { txt(INK); doc.setFont('helvetica', 'normal'); } doc.text(String(c), cxp + 4, y + 10); cxp += cols[ci]; });
      y += 15;
    });
    y += 10;
  }

  // ---- §4 construct map ----
  const con = p.construct;
  if (con && con.vectors) {
    section('4', 'OSK Tet-On construct (Track A)');
    txt(INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(doc.splitTextToSize(`Strategy: ${con.strategy}  ·  Capsid: ${con.capsid_desc}`, CW), M, y); y += 16;
    const featColor = (nm: string): RGB => {
      const s = nm.toLowerCase();
      if (s.includes('itr')) return [148, 163, 184];
      if (/promoter|tre|efs|ef1|cmv/.test(s)) return PRIMARY;
      if (/oct4|sox2|klf4|rtta|cds|pou5f1/.test(s)) return GREEN;
      if (/p2a|t2a|peptide/.test(s)) return AMBER;
      if (s.includes('polya')) return [124, 58, 237];
      if (/kozak|start/.test(s)) return TEAL;
      if (s.includes('wpre')) return [37, 99, 235];
      return SUB;
    };
    con.vectors.forEach((v: any) => {
      need(40);
      txt(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.text(`${v.name} — ${v.length_bp} bp`, M, y + 8);
      txt(v.fits_aav ? GREEN : RED); doc.text(v.fits_aav ? '✓ fits AAV' : '✗ over AAV limit', M + CW, y + 8, { align: 'right' });
      const total = v.features.reduce((a: number, f: any) => a + Math.max(1, f.length), 0) || 1;
      let x = M; const by = y + 14; const bhh = 14;
      v.features.forEach((f: any) => {
        const w = CW * Math.max(1, f.length) / total; fill(featColor(f.name)); doc.rect(x, by, w, bhh, 'F'); stroke(WHITE); doc.setLineWidth(0.5); doc.rect(x, by, w, bhh);
        if (w > 40) { txt(WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.text(String(f.name).split('(')[0].trim().slice(0, 12), x + w / 2, by + 9, { align: 'center' }); }
        x += w;
      });
      y += 40;
    });
    txt(SUB); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    doc.text('■ promoter   ■ CDS (OSK/rtTA)   ■ 2A peptide   ■ polyA   ■ Kozak   ■ ITR', M, y + 4); y += 14;
  }

  // ---- §4 IV exosome carrier (cell modality) ----
  const exo = p.exosome;
  if (!isReprog && exo) {
    section('4', 'IV exosome carrier (delivery)', TEAL);
    kv([
      ['Carrier', `${exo.strategy} · ${exo.vesicle_size_nm} nm`],
      ['Route', exo.route],
      ['Cargo', exo.cargo],
      ['Targeting', `${exo.targeting.tissue} — ${exo.targeting.ligand}`],
      ['Source', exo.source_cell],
    ], TEAL);
    if (exo.advantages?.length) { need(20); txt(SUB); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.text(doc.splitTextToSize('Advantages: ' + exo.advantages.join('; '), CW), M, y + 4); y += 22; }
  }

  // ---- §6 safety avatar ----
  const saf = p.safety;
  if (saf) {
    section('6', 'Safety Implant Blob — avatar pre-screen', TEAL);
    const bar = (yy: number, label: string, pct: number, col: RGB) => {
      txt(SUB); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text(label, M, yy + 9);
      const x0 = M + 150; const tw = CW - 150 - 44; fill(BGSOFT); doc.roundedRect(x0, yy, tw, 12, 6, 6, 'F');
      fill(col); doc.roundedRect(x0, yy, Math.max(6, tw * Math.min(1, pct / 100)), 12, 6, 6, 'F');
      txt(col); doc.setFont('helvetica', 'bold'); doc.text(`${pct}%`, x0 + tw + 6, yy + 10);
    };
    need(40); bar(y, 'Without avatar pre-screen', saf.projected_success_without, SUB); bar(y + 20, 'With avatar pre-screen', saf.projected_success_with, GREEN); y += 42;
    kv([['Host', saf.host], ['Avatar cycles', String(saf.avatar_cycles)], ['Risk caught by avatar', `${Math.round((saf.risk_reduction || 0) * 100)}%`]], TEAL);
  }

  // ---- §7 tumorigenicity ----
  if (tum.risk_tier) {
    const tc = tierColor(tum.risk_tier);
    section('7', 'Tumorigenicity safety envelope', tc);
    const t7cards = [
      { value: tum.risk_tier, label: 'risk tier', color: tc },
      { value: `${Math.round((tum.estimated_risk || 0) * 100)}%`, label: `risk at ${tum.requested_cycles} cycle(s)`, color: tc },
      { value: String(tum.max_safe_cycles), label: 'max safe cycles', color: PRIMARY },
      { value: `${tum.tissue_proliferation_factor}×`, label: `proliferation (${tum.tissue_key})`, color: PRIMARY },
    ];
    need(56); const gap = 8; const cwid = (CW - gap * 3) / 4;
    t7cards.forEach((c, i) => { const x = M + i * (cwid + gap); fill(tint(c.color, 0.12)); doc.roundedRect(x, y, cwid, 48, 6, 6, 'F'); fill(c.color); doc.roundedRect(x, y, cwid, 4, 2, 2, 'F'); txt(c.color); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text(String(c.value), x + cwid / 2, y + 28, { align: 'center' }); txt(SUB); doc.setFontSize(7); doc.text(c.label, x + cwid / 2, y + 42, { align: 'center' }); });
    y += 58;
    // risk-by-cycle bar chart
    const curve = tum.risk_curve || [];
    if (curve.length) {
      need(120);
      const chartH = 90, x0 = M + 30, cw2 = CW - 40; const thr = (tum.risk_threshold || 0.15) * 100;
      const vals = curve.map((c: any) => c.risk * 100); const vmax = Math.max(...vals, thr, 5) * 1.15;
      const baseY = y + chartH;
      txt(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.text('Estimated over-induction risk by reprogramming cycle', M, y - 2);
      const bw = 16; const slot = cw2 / curve.length;
      curve.forEach((c: any, i: number) => {
        const bx = x0 + i * slot + slot / 2 - bw / 2; const hh = chartH * (c.risk * 100) / vmax;
        fill(c.cycles === tum.requested_cycles ? tc : tint(PRIMARY, 0.4)); doc.rect(bx, baseY - hh, bw, hh, 'F');
        txt(SUB); doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(String(c.cycles), bx + bw / 2, baseY + 10, { align: 'center' });
        doc.text(`${Math.round(c.risk * 100)}%`, bx + bw / 2, baseY - hh - 2, { align: 'center' });
      });
      const ty = baseY - chartH * thr / vmax; stroke(RED); doc.setLineWidth(0.8); doc.setLineDashPattern([3, 2], 0); doc.line(x0, ty, x0 + cw2, ty); doc.setLineDashPattern([], 0);
      txt(RED); doc.setFontSize(7); doc.text(`${thr}% planning threshold`, x0 + cw2, ty - 3, { align: 'right' });
      y = baseY + 18;
    }
    if (tum.summary) { need(24); txt(INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(doc.splitTextToSize(tum.summary, CW), M, y); y += 24; }
  }

  // ---- §8 immune & adverse-event safety envelope ----
  const imm = p.immune;
  if (imm && imm.classes) {
    const ic = tierColor(imm.overall_tier);
    section('8', 'Immune & adverse-event safety envelope', ic);
    // overall tier + comorbidity chips
    need(24);
    txt(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
    doc.text(`Overall symptom outlook: `, M, y + 4);
    txt(ic); doc.text(String(imm.overall_tier), M + 118, y + 4);
    if (imm.comorbidities?.length) {
      txt(SUB); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      doc.text(doc.splitTextToSize(`Comorbidities: ${imm.comorbidities.join(', ')}`, CW - 170), M + 170, y + 4);
    }
    y += 16;
    // per-class risk bars
    imm.classes.forEach((c: any) => {
      need(26);
      const cc = tierColor(c.tier);
      txt(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.text(c.label, M, y + 8);
      txt(cc); doc.text(c.tier, M + CW, y + 8, { align: 'right' });
      const x0 = M; const tw = CW; fill(BGSOFT); doc.roundedRect(x0, y + 11, tw, 7, 3.5, 3.5, 'F');
      fill(cc); doc.roundedRect(x0, y + 11, Math.max(5, tw * Math.min(1, c.index)), 7, 3.5, 3.5, 'F');
      txt(SUB); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
      doc.text(doc.splitTextToSize((c.symptoms || []).slice(0, 5).join(' · '), CW).slice(0, 1), M, y + 26);
      y += 30;
    });
    // two-column: can't see / tests to ask
    need(70);
    const colW = (CW - 10) / 2;
    const box = (x: number, title: string, items: string[], accent: RGB) => {
      fill(tint(accent, 0.08)); doc.roundedRect(x, y, colW, 66, 5, 5, 'F'); stroke(tint(accent, 0.4)); doc.setLineWidth(0.5); doc.roundedRect(x, y, colW, 66, 5, 5);
      txt(accent); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.text(title, x + 6, y + 11);
      txt(INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
      let yy = y + 20;
      items.slice(0, 4).forEach((it) => { const ls = doc.splitTextToSize(`• ${it}`, colW - 12); doc.text(ls.slice(0, 2), x + 6, yy); yy += 5 * Math.min(2, ls.length) + 2; });
    };
    box(M, "WHAT THIS CAN'T SEE", imm.cant_see || [], RED);
    box(M + colW + 10, 'ASK YOUR CLINICIAN FOR', imm.tests_to_ask || [], PRIMARY);
    y += 72;
    if (imm.modifiable?.length) {
      need(16); txt(GREEN); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      doc.text(doc.splitTextToSize(`Modifiable: ${imm.modifiable[0]}`, CW), M, y + 4); y += 16;
    }
    if (imm.summary) { need(20); txt(INK); doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.text(doc.splitTextToSize(imm.summary, CW), M, y + 4); y += 22; }
  }

  // ---- disclaimer ----
  need(40);
  fill(tint(PRIMARY, 0.07)); doc.roundedRect(M, y, CW, 34, 4, 4, 'F'); stroke(tint(PRIMARY, 0.4)); doc.setLineWidth(0.5); doc.roundedRect(M, y, CW, 34, 4, 4);
  txt(SUB); doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5);
  const disc = isReprog
    ? 'Epigenetic age is computed from your data with the published Horvath (2013) clock, on your device. The construct is a deterministic assembly of standard parts. Figures are research/illustrative — the age-reversal projection is a model estimate, not a measured outcome; the safety envelope estimates and mitigates tumorigenicity risk, it does not eliminate it. Not medical advice.'
    : 'Epigenetic age is computed from your data with the published Horvath (2013) clock, on your device. The regeneration projection and exosome carrier are illustrative research designs, not measured outcomes; the immune / adverse-event read is a relative, probabilistic estimate — not a diagnosis or a yes/no prediction. Not medical advice.';
  doc.text(doc.splitTextToSize(disc, CW - 16), M + 8, y + 12);

  doc.save(filename);
}
