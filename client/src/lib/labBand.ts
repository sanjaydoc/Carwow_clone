// Animated "live lab activity" band for the Protocol Simulator header.
// Six canvas-2D scenes, one per pipeline step, in the spirit of a wet-lab bench.
// Framework-free so it can drive any <canvas>; the React wrapper (SimHeaderBand)
// creates one per header. Nothing here touches the pipeline — purely decorative.

export interface Palette {
  ink: string; muted: string; band: string; spike: string; rate: string; data: string;
}
export const LIGHT: Palette = {
  ink: '#211B18', muted: '#9A8F86', band: '#F3EEE6',
  spike: '#C4452E', rate: '#12876A', data: '#2F6FED',
};
export const DARK: Palette = {
  ink: '#F2ECE4', muted: '#A99F95', band: 'rgba(255,255,255,0.02)',
  spike: '#E4694E', rate: '#35C89A', data: '#6C97F5',
};

export const STEP_CAPTIONS = [
  'SAMPLE INTAKE · collect & log the patient sample',
  'SEQUENCING · DNA methylation on the flow cell',
  'ANALYSIS · epigenetic age from the reads',
  'VECTOR PRODUCTION · AAV grown in culture',
  'MOLECULE LAB · synthesis & screening',
  'AVATAR PRE-SCREEN · engrafted safety model',
];

interface Scene { reset(): void; update(dt: number): void; render(): void; }

export interface LabBand {
  setStep(i: number): void;
  setPreview(i: number | null): void;
  setPalette(p: Palette): void;
  destroy(): void;
}

export function createLabBand(
  canvas: HTMLCanvasElement,
  opts: { palette?: Palette; onStep?: (i: number) => void } = {},
): LabBand {
  const ctx = canvas.getContext('2d')!;
  // guard against negative computed radii
  const _arc = ctx.arc.bind(ctx);
  (ctx as any).arc = (x: number, y: number, r: number, a: number, b: number, cc?: boolean) =>
    _arc(x, y, Math.max(0, r || 0), a, b, cc);

  let P: Palette = opts.palette || LIGHT;
  let W = 0, H = 0;
  let active = 0, preview: number | null = null, shown = -1, fade = 0;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  function hexA(c: string, a: number): string {
    if (c.startsWith('#')) {
      const n = parseInt(c.slice(1), 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    }
    return c;
  }
  function rr(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    if (!W || !H) return;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const s of scenes) s.reset();
  }

  /* ---------------- scenes ---------------- */

  // 1 · sample intake
  const sIntake = ((): Scene => {
    let t = 0, fill = 0;
    return {
      reset() { t = 0; fill = 0; },
      update(dt) { t += dt; fill += dt * 0.30; if (fill > 1.5) fill = 0; },
      render() {
        const cx = W * 0.5, tw = 30, top = H * 0.20, th = H * 0.60, bot = top + th;
        const tube = (x: number, frac: number, focus: boolean) => {
          rr(x - tw / 2, top, tw, th, 7); ctx.fillStyle = hexA(P.muted, 0.10); ctx.fill();
          ctx.strokeStyle = hexA(P.ink, focus ? 0.5 : 0.28); ctx.lineWidth = 1.5; ctx.stroke();
          rr(x - tw / 2 - 2, top - 10, tw + 4, 11, 3); ctx.fillStyle = focus ? P.data : hexA(P.muted, 0.5); ctx.fill();
          const fh = Math.min(1, frac) * (th - 12);
          if (fh > 0) { ctx.save(); rr(x - tw / 2, top, tw, th, 7); ctx.clip();
            ctx.fillStyle = P.spike; ctx.fillRect(x - tw / 2, bot - fh, tw, fh);
            ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x - tw / 2, bot - fh, tw, 3); ctx.restore(); }
        };
        tube(cx - 78, 0, false); tube(cx + 78, 0, false); tube(cx, fill, true);
        if (fill < 1) {
          ctx.strokeStyle = hexA(P.ink, 0.35); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(cx, top - 26); ctx.lineTo(cx, top - 12); ctx.stroke();
          const surf = bot - Math.min(1, fill) * (th - 12);
          const dy = top - 8 + ((t * 1.6) % 1) * (surf - (top - 8));
          ctx.beginPath(); ctx.ellipse(cx, dy, 3, 4, 0, 0, 7); ctx.fillStyle = P.spike; ctx.fill();
        }
        ctx.save(); ctx.translate(cx - tw / 2 + 5, top + th * 0.34);
        for (let i = 0; i < 11; i++) { ctx.fillStyle = hexA(P.ink, 0.55); ctx.fillRect(i * 2.0, 0, i % 3 ? 1 : 2.2, 20); }
        ctx.restore();
        if (fill >= 1) { ctx.strokeStyle = P.rate; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(cx + tw / 2 + 8, top + 8); ctx.lineTo(cx + tw / 2 + 13, top + 13);
          ctx.lineTo(cx + tw / 2 + 22, top + 2); ctx.stroke(); ctx.lineCap = 'butt'; }
        cap(cx, bot + 16, 'EDTA · WHOLE BLOOD', 'center');
      },
    };
  })();

  // 2 · sequencing
  const sSeq = ((): Scene => {
    const cols = 6, rows = 4; let well = 0, wt = 0, ph = 0; let filled = new Set<number>();
    return {
      reset() { well = 0; wt = 0; ph = 0; filled = new Set(); },
      update(dt) { ph += dt; wt += dt;
        if (wt > 0.45) { wt = 0; filled.add(well); well = (well + 1) % (cols * rows); if (well === 0) filled.clear(); } },
      render() {
        const px = 18, py = 26, pw = W * 0.30, ph2 = H - py - 34, cw = pw / cols, ch = ph2 / rows, rad = Math.min(cw, ch) * 0.30;
        rr(px - 7, py - 9, pw + 14, ph2 + 18, 7); ctx.strokeStyle = hexA(P.ink, 0.25); ctx.lineWidth = 1.2; ctx.stroke();
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const i = r * cols + c, x = px + c * cw + cw / 2, y = py + r * ch + ch / 2;
          ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fillStyle = filled.has(i) ? hexA(P.data, 0.7) : hexA(P.muted, 0.10); ctx.fill();
          ctx.strokeStyle = hexA(P.ink, 0.18); ctx.lineWidth = 0.7; ctx.stroke();
        }
        const wr = Math.floor(well / cols), wc = well % cols, wx = px + wc * cw + cw / 2, wy = py + wr * ch + ch / 2;
        ctx.fillStyle = hexA(P.ink, 0.6); rr(wx - 3, 6, 6, wy - 16, 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(wx - 3, wy - 12); ctx.lineTo(wx + 3, wy - 12); ctx.lineTo(wx, wy - 4); ctx.closePath(); ctx.fill();
        if (wt < 0.16) { ctx.beginPath(); ctx.arc(wx, wy - 1, 2, 0, 7); ctx.fillStyle = P.data; ctx.fill(); }
        cap(px - 2, py - 14, '96-WELL', 'left');
        const gx = W * 0.40, gw = W - gx - 14, baseY = H - 30, amp = H * 0.30, bases = [P.rate, P.data, P.ink, P.spike];
        ctx.lineWidth = 1.8;
        for (let i = 0; i < gw / 6; i++) { const x = gx + i * 6, bi = Math.floor(i + ph * 10) % 4;
          const h = (0.25 + 0.75 * Math.abs(Math.sin(i * 1.27 + bi))) * amp;
          ctx.strokeStyle = bases[bi]; ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(x, baseY - h); ctx.stroke(); }
        ctx.strokeStyle = hexA(P.ink, 0.2); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx, baseY); ctx.lineTo(gx + gw, baseY); ctx.stroke();
        ctx.font = '600 8px "IBM Plex Mono",monospace';
        ['A', 'C', 'G', 'T'].forEach((b, k) => { ctx.fillStyle = bases[k]; ctx.fillText(b, gx + k * 14, 16); });
      },
    };
  })();

  // 3 · analysis
  const sAnalysis = ((): Scene => {
    const cols = 16, rows = 6; let n = 0; const ages: number[] = [];
    return {
      reset() { n = 0; ages.length = 0; const base = 80, eff = 0.36, floor = 20; ages.push(base); let a = base;
        for (let i = 0; i < 5; i++) { a -= eff * (a - floor); ages.push(a); } },
      update(dt) { n += dt * 22; if (n > cols * rows + 30) n = 0; },
      render() {
        const mx = 18, my = 22, mw = W - 36, mh = H - my - 26;
        rr(mx, my, mw, mh, 8); ctx.strokeStyle = hexA(P.ink, 0.28); ctx.lineWidth = 1.4; ctx.stroke();
        const hx = mx + 12, hy = my + 14, hw = mw * 0.5, hh = mh - 26, cw = hw / cols, ch = hh / rows;
        const shownN = Math.min(cols * rows, Math.floor(n));
        for (let i = 0; i < shownN; i++) { const r = i % rows, c = Math.floor(i / rows), v = 0.5 + 0.5 * Math.sin(i * 0.7 + c * 0.4);
          ctx.fillStyle = v > 0.5 ? hexA(P.spike, 0.35 + v * 0.55) : hexA(P.data, 0.3 + (1 - v) * 0.5);
          ctx.fillRect(hx + c * cw + 0.5, hy + r * ch + 0.5, cw - 1, ch - 1); }
        cap(hx, my + 10, 'METHYLATION β', 'left');
        const rx = mx + mw * 0.56, ry = my + 16, rw = mw * 0.4, rh = mh - 30;
        ctx.font = '700 26px Sora,system-ui,sans-serif'; ctx.fillStyle = P.ink; ctx.textAlign = 'left';
        ctx.fillText('80.0', rx, ry + 22);
        cap(rx, ry + 34, 'DNAm AGE (yr)', 'left');
        const na = ages.length, gy = ry + 40, gh = rh - 42;
        const gpx = (i: number) => rx + (i / (na - 1)) * rw, gpy = (v: number) => gy + gh - ((v - 15) / (80 - 15)) * gh;
        ctx.beginPath(); for (let i = 0; i < na; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, gpx(i), gpy(ages[i]));
        ctx.strokeStyle = P.rate; ctx.lineWidth = 1.8; ctx.stroke();
        ctx.lineTo(gpx(na - 1), gy + gh); ctx.lineTo(gpx(0), gy + gh); ctx.closePath(); ctx.fillStyle = hexA(P.rate, 0.12); ctx.fill();
        ctx.textAlign = 'start';
      },
    };
  })();

  // 4 · vector production — culture flask releasing a clean stream of AAV capsids
  const sVector = ((): Scene => {
    let t = 0; const N = 4; const cells = Array.from({ length: 7 }, (_, i) => ({ ang: (i / 7) * 7, rad: 0.35 + (i % 3) * 0.22 }));
    // a professional icosahedral-ish AAV capsid: hexagon shell + inner facets
    function capsid(x: number, y: number, R: number, alpha: number) {
      ctx.save(); ctx.translate(x, y); ctx.globalAlpha = alpha;
      const V = (k: number) => [Math.cos(k / 6 * 7 - Math.PI / 2) * R, Math.sin(k / 6 * 7 - Math.PI / 2) * R] as const;
      ctx.beginPath(); for (let s = 0; s < 6; s++) { const [vx, vy] = V(s); (s ? ctx.lineTo : ctx.moveTo).call(ctx, vx, vy); } ctx.closePath();
      ctx.fillStyle = hexA(P.spike, 0.14); ctx.fill(); ctx.strokeStyle = P.spike; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.strokeStyle = hexA(P.spike, 0.45); ctx.lineWidth = 0.8;
      ctx.beginPath(); for (const set of [[0, 2, 4], [1, 3, 5]]) { set.forEach((k, j) => { const [vx, vy] = V(k); (j ? ctx.lineTo : ctx.moveTo).call(ctx, vx, vy); }); ctx.closePath(); } ctx.stroke();
      ctx.globalAlpha = 1; ctx.restore();
    }
    return {
      reset() { t = 0; },
      update(dt) { t += dt; },
      render() {
        const fx = W * 0.22, bot = H - 26, bodyTop = H * 0.42, neckTop = 22, bodyW = Math.min(W * 0.22, 120), neckW = 16;
        const sideX = (y: number, s: number) => y <= bodyTop ? fx + s * neckW / 2 : fx + s * (neckW / 2 + (bodyW / 2 - neckW / 2) * ((y - bodyTop) / (bot - bodyTop)));
        // liquid + meniscus
        const liqTop = bodyTop + (bot - bodyTop) * 0.34;
        ctx.beginPath(); ctx.moveTo(sideX(liqTop, -1), liqTop); ctx.lineTo(sideX(bot, -1), bot); ctx.lineTo(sideX(bot, 1), bot); ctx.lineTo(sideX(liqTop, 1), liqTop); ctx.closePath();
        ctx.fillStyle = hexA(P.rate, 0.13); ctx.fill();
        ctx.beginPath(); ctx.moveTo(sideX(liqTop, -1), liqTop); ctx.lineTo(sideX(liqTop, 1), liqTop); ctx.strokeStyle = hexA(P.rate, 0.6); ctx.lineWidth = 1.2; ctx.stroke();
        // producer cells, slow orderly orbit inside the liquid
        const midY = (liqTop + bot) / 2;
        for (const c of cells) { const x = fx + Math.cos(c.ang + t * 0.5) * (bodyW * 0.32) * c.rad, y = midY + Math.sin(c.ang + t * 0.5) * (bot - liqTop) * 0.30 * c.rad;
          ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fillStyle = hexA(P.rate, 0.85); ctx.fill(); }
        // flask glass
        ctx.beginPath(); ctx.moveTo(fx - neckW / 2, neckTop); ctx.lineTo(fx - neckW / 2, bodyTop); ctx.lineTo(fx - bodyW / 2, bot);
        ctx.lineTo(fx + bodyW / 2, bot); ctx.lineTo(fx + neckW / 2, bodyTop); ctx.lineTo(fx + neckW / 2, neckTop);
        ctx.strokeStyle = hexA(P.ink, 0.5); ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.stroke(); ctx.lineJoin = 'miter';
        ctx.beginPath(); ctx.moveTo(fx - neckW / 2 - 4, neckTop); ctx.lineTo(fx + neckW / 2 + 4, neckTop); ctx.strokeStyle = hexA(P.ink, 0.5); ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineCap = 'butt';
        // release path: gentle arc from neck to upper-right
        const p0x = fx + neckW / 2 + 6, p0y = neckTop + 4, p1x = W - 40, p1y = 30;
        const path = (u: number) => { const x = p0x + (p1x - p0x) * u, y = p0y + (p1y - p0y) * u - Math.sin(u * Math.PI) * 14; return [x, y] as const; };
        // faint dotted guide
        ctx.strokeStyle = hexA(P.ink, 0.14); ctx.lineWidth = 1; ctx.setLineDash([2, 5]);
        ctx.beginPath(); for (let u = 0; u <= 1.001; u += 0.04) { const [x, y] = path(u); (u ? ctx.lineTo : ctx.moveTo).call(ctx, x, y); } ctx.stroke(); ctx.setLineDash([]);
        // evenly-spaced capsids travelling the path (orderly, consistent size)
        const speed = 0.16;
        for (let i = 0; i < N; i++) { const u = ((i / N) + t * speed) % 1; const [x, y] = path(u);
          const alpha = Math.min(1, Math.sin(u * Math.PI) * 1.6); capsid(x, y, 9, alpha); }
        // tidy label, top-left (clear of the live indicator)
        cap(14, 14, 'HEK293 → rAAV', 'left');
      },
    };
  })();

  // 5 · molecule lab
  const sMolLab = ((): Scene => {
    let bubbles: any[] = [], rot = 0, plate: boolean[] = [], scan = 0;
    return {
      reset() { bubbles = Array.from({ length: 9 }, () => ({ x: rnd(-13, 13), y: rnd(0, 26), s: rnd(0.5, 1.2) }));
        rot = 0; plate = Array.from({ length: 12 }, () => Math.random() < 0.30); scan = 0; },
      update(dt) { rot += dt * 0.5; for (const b of bubbles) { b.y -= b.s * 24 * dt; if (b.y < 0) { b.y = 26; b.x = rnd(-13, 13); } }
        scan += dt * 1.6; if (scan > 12) { scan = 0; plate = plate.map(() => Math.random() < 0.30); } },
      render() {
        const fx = W * 0.24, fy = H * 0.58, R = H * 0.24;
        ctx.beginPath(); ctx.arc(fx, fy, R, 0, 7); ctx.strokeStyle = hexA(P.ink, 0.45); ctx.lineWidth = 1.8; ctx.stroke();
        ctx.strokeRect(fx - 8, fy - R - 16, 16, 18);
        ctx.save(); ctx.beginPath(); ctx.arc(fx, fy, R - 1.5, 0, 7); ctx.clip();
        ctx.fillStyle = hexA(P.data, 0.12); ctx.fillRect(fx - R, fy - 2, R * 2, R + 2);
        for (const b of bubbles) { const by = fy + R - 4 - (b.y / 26) * (R * 1.4);
          ctx.beginPath(); ctx.arc(fx + b.x, by, 1.6 + b.s, 0, 7); ctx.fillStyle = hexA(P.data, 0.5); ctx.fill(); }
        ctx.restore();
        ctx.save(); ctx.translate(fx, fy - R - 30); ctx.rotate(rot); const mr = 9;
        ctx.beginPath(); for (let s = 0; s < 6; s++) { const a = s / 6 * 7; (s ? ctx.lineTo : ctx.moveTo).call(ctx, Math.cos(a) * mr, Math.sin(a) * mr); } ctx.closePath();
        ctx.strokeStyle = P.rate; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mr, 0); ctx.lineTo(mr + 7, 0); ctx.stroke();
        for (let s = 0; s < 6; s++) { const a = s / 6 * 7; ctx.beginPath(); ctx.arc(Math.cos(a) * mr, Math.sin(a) * mr, 2, 0, 7); ctx.fillStyle = P.rate; ctx.fill(); }
        ctx.restore();
        const gx = W * 0.55, gy = 24, gw = W - gx - 16, gh = H - gy - 22, C = 4, Rw = 3, cw = gw / C, ch = gh / Rw, rad = Math.min(cw, ch) * 0.34;
        for (let i = 0; i < 12; i++) { const c = i % C, r = Math.floor(i / C), x = gx + c * cw + cw / 2, y = gy + r * ch + ch / 2;
          const hit = plate[i] && scan > (c + 1) * 1.2;
          ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fillStyle = hit ? hexA(P.rate, 0.85) : hexA(P.muted, 0.12);
          if (hit) { ctx.shadowColor = hexA(P.rate, 0.5); ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0; } else ctx.fill();
          ctx.strokeStyle = hexA(P.ink, 0.18); ctx.lineWidth = 0.7; ctx.stroke(); }
        cap(gx, 16, 'SCREEN · hits ●', 'left');
      },
    };
  })();

  // 6 · avatar pre-screen
  const sAvatar = ((): Scene => {
    let t = 0, prog = 0;
    return {
      reset() { t = 0; prog = 0; },
      update(dt) { t += dt; prog += dt * 0.22; if (prog > 1.2) prog = 0; },
      render() {
        const cx = W * 0.30, cy = H * 0.62, breathe = 1 + Math.sin(t * 1.6) * 0.02;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(breathe, breathe);
        ctx.fillStyle = hexA(P.muted, 0.32); ctx.strokeStyle = hexA(P.ink, 0.5); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(0, 0, 44, 24, 0, 0, 7); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(46, -4, 14, 0, 7); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(44, -16, 7, 0, 7); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(56, -6, 1.7, 0, 7); ctx.fillStyle = P.ink; ctx.fill();
        ctx.beginPath(); ctx.moveTo(-42, 4); ctx.quadraticCurveTo(-74, 10, -70, -14); ctx.strokeStyle = hexA(P.ink, 0.45); ctx.lineWidth = 2; ctx.stroke();
        const bp = 0.5 + 0.5 * Math.sin(t * 3.2);
        ctx.beginPath(); ctx.arc(-6, -18, 8 + bp * 2, 0, 7); ctx.fillStyle = P.rate;
        ctx.shadowColor = hexA(P.rate, 0.6); ctx.shadowBlur = 15; ctx.fill(); ctx.shadowBlur = 0;
        ctx.restore();
        const mx = W * 0.52, my = 18, mw = W * 0.24, mh = H * 0.34;
        rr(mx, my, mw, mh, 5); ctx.strokeStyle = hexA(P.ink, 0.3); ctx.lineWidth = 1.2; ctx.stroke();
        ctx.save(); rr(mx, my, mw, mh, 5); ctx.clip(); ctx.beginPath();
        const midy = my + mh / 2;
        for (let x = 0; x < mw; x += 2) { const tt = (x / mw * 6) + t * 4; let y = midy; const beat = tt % 6;
          if (beat > 2.6 && beat < 3.4) y = midy - Math.sin((beat - 2.6) / 0.8 * Math.PI) * mh * 0.34;
          (x ? ctx.lineTo : ctx.moveTo).call(ctx, mx + x, y); }
        ctx.strokeStyle = P.rate; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
        cap(mx + 4, my - 4, 'VITALS', 'left');
        const sx = W * 0.86, sy = H * 0.55, SR = H * 0.26, p = Math.min(1, prog);
        ctx.beginPath(); ctx.arc(sx, sy, SR, -Math.PI / 2, -Math.PI / 2 + 7, false); ctx.strokeStyle = hexA(P.muted, 0.3); ctx.lineWidth = 4; ctx.stroke();
        ctx.beginPath(); ctx.arc(sx, sy, SR, -Math.PI / 2, -Math.PI / 2 + 7 * p, false); ctx.strokeStyle = P.rate; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineCap = 'butt';
        ctx.font = '700 14px Sora,system-ui,sans-serif'; ctx.fillStyle = P.ink; ctx.textAlign = 'center'; ctx.fillText(Math.round(80 + p * 18) + '%', sx, sy + 1);
        cap(sx, sy + 14, 'SAFE', 'center');
      },
    };
  })();

  function cap(x: number, y: number, text: string, align: CanvasTextAlign) {
    ctx.font = '500 8px "IBM Plex Mono",monospace'; ctx.fillStyle = hexA(P.muted, 0.9);
    ctx.textAlign = align; ctx.fillText(text, x, y); ctx.textAlign = 'start';
  }

  const scenes: Scene[] = [sIntake, sSeq, sAnalysis, sVector, sMolLab, sAvatar];

  const disp = () => (preview != null ? preview : active);
  function setShown(i: number) { if (i !== shown) { shown = i; scenes[i].reset(); fade = 1; opts.onStep?.(i); } }

  let raf = 0, last = performance.now(), running = true;
  function frame(now: number) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (W && H) {
      setShown(disp());
      const s = scenes[shown];
      s.update(dt); ctx.clearRect(0, 0, W, H); s.render();
      if (fade > 0) { ctx.fillStyle = P.band; ctx.globalAlpha = fade; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; fade = Math.max(0, fade - dt * 4); }
    }
    raf = requestAnimationFrame(frame);
  }
  function renderStatic() { // reduced motion
    if (!W || !H) return;
    const i = disp(); if (i !== shown) { shown = i; scenes[i].reset(); opts.onStep?.(i); }
    for (let k = 0; k < 40; k++) scenes[i].update(0.05);
    ctx.clearRect(0, 0, W, H); scenes[i].render();
  }

  const ro = new ResizeObserver(() => { resize(); if (reduce) renderStatic(); });
  ro.observe(canvas);
  const onVis = () => { last = performance.now(); if (document.hidden) { running = false; } else if (!reduce) { running = true; requestAnimationFrame(frame); } };
  document.addEventListener('visibilitychange', onVis);

  resize();
  if (reduce) renderStatic(); else raf = requestAnimationFrame(frame);

  return {
    setStep(i) { active = Math.max(0, Math.min(5, i)); if (reduce) renderStatic(); },
    setPreview(i) { preview = i; if (reduce) renderStatic(); },
    setPalette(p) { P = p; if (reduce) renderStatic(); },
    destroy() { running = false; cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', onVis); },
  };
}
