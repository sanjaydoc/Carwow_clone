"""CSV + PDF export of a Simulator run (D6).

The PDF is designed to mirror the on-screen Simulator: the same blue theme,
card-based KPI tiles, coloured status badges, age/reversal bars, a
risk-by-cycle bar chart and a colour-coded OSK construct map.
"""
from __future__ import annotations

import csv
import io

from reportlab.lib import colors
from reportlab.lib.colors import Color, HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.shapes import Drawing, Line, Rect, String
from reportlab.platypus import (
    Flowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ---------------------------------------------------------------------------
# Palette (matches the Simulator UI — #4285F4 primary)
# ---------------------------------------------------------------------------
PRIMARY = HexColor("#4285F4")
PRIMARY_DK = HexColor("#1a56db")
PRIMARY_DKR = HexColor("#0b3aa8")
INK = HexColor("#0f172a")
SUB = HexColor("#64748b")
BORDER = HexColor("#e2e8f0")
BG_SOFT = HexColor("#f1f5f9")
GREEN = HexColor("#16a34a")
AMBER = HexColor("#f59e0b")
RED = HexColor("#dc2626")
PURPLE = HexColor("#7c3aed")
TEAL = HexColor("#0d9488")
WHITE = colors.white

PAGE_W, PAGE_H = A4
LMARGIN = RMARGIN = 16 * mm
CONTENT_W = PAGE_W - LMARGIN - RMARGIN  # ≈ 504pt

_DISCLAIMER = (
    "Epigenetic age is computed from your data with the published Horvath (2013) "
    "clock. The construct is a deterministic assembly of standard parts. Generated "
    "molecules are AI research hypotheses — not validated, synthesizable or approved "
    "therapeutics. This document is not medical advice."
)


def _tint(c: Color, f: float) -> Color:
    """Lighten a colour toward white. f=1 → c, f=0 → white."""
    return Color(1 - (1 - c.red) * f, 1 - (1 - c.green) * f, 1 - (1 - c.blue) * f)


def _tier_color(tier: str | None) -> Color:
    t = (tier or "").lower()
    if t.startswith("low"):
        return GREEN
    if t.startswith("mod"):
        return AMBER
    if t.startswith("high"):
        return RED
    return PRIMARY


# ---------------------------------------------------------------------------
# CSV (unchanged)
# ---------------------------------------------------------------------------
def candidates_csv(candidates: list[dict]) -> str:
    cols = ["seq", "modality", "source", "rank_score", "qed", "mw", "logp",
            "hbd", "hba", "lipinski_pass", "valid", "novel"]
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(cols)
    for c in candidates:
        s = c.get("scores", {})
        w.writerow([
            c.get("seq"), c.get("modality"), c.get("source"),
            s.get("rank_score"), s.get("qed"), s.get("mw"), s.get("logp"),
            s.get("hbd"), s.get("hba"), s.get("lipinski_pass"),
            s.get("valid"), s.get("novel"),
        ])
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Visual flowables
# ---------------------------------------------------------------------------
class HeaderBand(Flowable):
    """Full-width blue banner with a drawn DNA helix mark + title/subtitle."""

    def __init__(self, title: str, subtitle: str, height: float = 62):
        super().__init__()
        self.title, self.subtitle, self.h = title, subtitle, height
        self.width = CONTENT_W

    def wrap(self, *_):
        return (CONTENT_W, self.h)

    def draw(self):
        c = self.canv
        h = self.h
        c.saveState()
        # banner
        c.setFillColor(PRIMARY_DK)
        c.roundRect(0, 0, CONTENT_W, h, 8, stroke=0, fill=1)
        # lighter accent panel on the right
        c.setFillColor(PRIMARY)
        c.roundRect(CONTENT_W * 0.34, 0, CONTENT_W * 0.66, h, 8, stroke=0, fill=1)
        c.setFillColor(PRIMARY_DK)
        c.rect(CONTENT_W * 0.34, 0, 10, h, stroke=0, fill=1)
        # DNA helix mark (left)
        cx, cy = 26, h / 2
        c.setStrokeColor(WHITE)
        c.setLineWidth(1.6)
        import math
        n = 22
        pts_a, pts_b = [], []
        for i in range(n):
            t = i / (n - 1)
            y = 12 + t * (h - 24)
            dx = 9 * math.sin(t * math.pi * 2.4)
            pts_a.append((cx - dx, y))
            pts_b.append((cx + dx, y))
        for i in range(n - 1):
            c.line(pts_a[i][0], pts_a[i][1], pts_a[i + 1][0], pts_a[i + 1][1])
            c.line(pts_b[i][0], pts_b[i][1], pts_b[i + 1][0], pts_b[i + 1][1])
        c.setLineWidth(1.0)
        for i in range(0, n, 3):
            c.line(pts_a[i][0], pts_a[i][1], pts_b[i][0], pts_b[i][1])
        # title
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 17)
        c.drawString(48, h - 26, self.title)
        c.setFillColor(_tint(WHITE, 1))
        c.setFont("Helvetica", 9)
        c.drawString(48, h - 40, self.subtitle)
        c.setFont("Helvetica-Oblique", 8)
        c.setFillColor(HexColor("#dbe6ff"))
        c.drawString(48, h - 52, "Research / illustrative — not medical advice.")
        c.restoreState()


class KpiRow(Flowable):
    """A row of coloured stat cards. cards = [{'value','label','color'}]."""

    def __init__(self, cards: list[dict], height: float = 56):
        super().__init__()
        self.cards, self.h = cards, height
        self.width = CONTENT_W

    def wrap(self, *_):
        return (CONTENT_W, self.h)

    def draw(self):
        c = self.canv
        n = len(self.cards)
        if not n:
            return
        gap = 8
        cw = (CONTENT_W - gap * (n - 1)) / n
        for i, card in enumerate(self.cards):
            x = i * (cw + gap)
            col = card.get("color", PRIMARY)
            c.setFillColor(_tint(col, 0.12))
            c.roundRect(x, 0, cw, self.h, 7, stroke=0, fill=1)
            # top accent
            c.setFillColor(col)
            c.roundRect(x, self.h - 6, cw, 6, 3, stroke=0, fill=1)
            c.rect(x, self.h - 6, cw, 3, stroke=0, fill=1)
            # value
            c.setFillColor(col)
            c.setFont("Helvetica-Bold", 19)
            c.drawCentredString(x + cw / 2, self.h / 2 - 2, str(card.get("value", "")))
            # label
            c.setFillColor(SUB)
            c.setFont("Helvetica", 7.5)
            label = str(card.get("label", ""))
            c.drawCentredString(x + cw / 2, 8, label[:34])


class SectionHeader(Flowable):
    """Numbered pill badge + title + underline."""

    def __init__(self, num: str, title: str, color: Color = PRIMARY):
        super().__init__()
        self.num, self.title, self.color = num, title, color
        self.h = 22
        self.width = CONTENT_W

    def wrap(self, *_):
        return (CONTENT_W, self.h)

    def draw(self):
        c = self.canv
        c.saveState()
        c.setFillColor(self.color)
        c.roundRect(0, 2, 18, 18, 5, stroke=0, fill=1)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(9, 6.5, self.num)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 12.5)
        c.drawString(26, 6, self.title)
        c.setStrokeColor(_tint(self.color, 0.5))
        c.setLineWidth(1.2)
        c.line(0, 0, CONTENT_W, 0)
        c.restoreState()


class AgeTrack(Flowable):
    """A 0–100yr track with the DNAm-age fill and (optional) chronological marker."""

    def __init__(self, dnam: float | None, chrono: float | None):
        super().__init__()
        self.dnam, self.chrono = dnam, chrono
        self.h = 46
        self.width = CONTENT_W

    def wrap(self, *_):
        return (CONTENT_W, self.h)

    def _x(self, age):
        x0, x1 = 4, CONTENT_W - 8
        return x0 + (x1 - x0) * max(0.0, min(100.0, age)) / 100.0

    def draw(self):
        c = self.canv
        c.saveState()
        y = 16
        # track
        c.setFillColor(BG_SOFT)
        c.roundRect(4, y, CONTENT_W - 12, 10, 5, stroke=0, fill=1)
        if self.dnam is not None:
            xd = self._x(self.dnam)
            c.setFillColor(PRIMARY)
            c.roundRect(4, y, max(6, xd - 4), 10, 5, stroke=0, fill=1)
            # DNAm marker
            c.setFillColor(PRIMARY_DKR)
            c.setFont("Helvetica-Bold", 9)
            c.drawCentredString(xd, y + 16, f"DNAm {self.dnam:g} yr")
            c.setStrokeColor(PRIMARY_DKR)
            c.setLineWidth(1.4)
            c.line(xd, y - 2, xd, y + 12)
        if self.chrono is not None:
            xc = self._x(self.chrono)
            c.setStrokeColor(SUB)
            c.setLineWidth(1.2)
            c.setDash(2, 2)
            c.line(xc, y - 4, xc, y + 14)
            c.setDash()
            c.setFillColor(SUB)
            c.setFont("Helvetica", 8)
            c.drawCentredString(xc, y - 12, f"actual {self.chrono:g}")
        # scale ticks
        c.setFillColor(SUB)
        c.setFont("Helvetica", 6.5)
        for a in (0, 20, 40, 60, 80, 100):
            c.drawCentredString(self._x(a), y - 12 if self.chrono is None else 2, str(a))
        c.restoreState()


class ReversalTrack(Flowable):
    """Before → after age band with the years-reversed badge + index bar."""

    def __init__(self, dnam, projected, years, index_pct):
        super().__init__()
        self.dnam, self.proj = dnam, projected
        self.years, self.idx = years, index_pct
        self.h = 84
        self.width = CONTENT_W

    def wrap(self, *_):
        return (CONTENT_W, self.h)

    def _x(self, age):
        x0, x1 = 4, CONTENT_W - 8
        return x0 + (x1 - x0) * max(0.0, min(100.0, age or 0)) / 100.0

    def draw(self):
        c = self.canv
        c.saveState()
        y = 48
        c.setFillColor(BG_SOFT)
        c.roundRect(4, y, CONTENT_W - 12, 12, 6, stroke=0, fill=1)
        xp, xd = self._x(self.proj), self._x(self.dnam)
        # reversed band (green) from projected → dnam
        c.setFillColor(_tint(GREEN, 0.35))
        c.rect(xp, y, max(2, xd - xp), 12, stroke=0, fill=1)
        # younger fill
        c.setFillColor(GREEN)
        c.roundRect(4, y, max(6, xp - 4), 12, 6, stroke=0, fill=1)
        # markers (labels below the track to clear the years badge)
        for x, lab, col in ((xd, f"before {self.dnam:g}", SUB), (xp, f"after {self.proj:g}", GREEN)):
            c.setStrokeColor(col)
            c.setLineWidth(1.4)
            c.line(x, y - 2, x, y + 14)
            c.setFillColor(col)
            c.setFont("Helvetica-Bold", 8.5)
            c.drawCentredString(x, y - 12, lab)
        # arrow younger
        c.setStrokeColor(GREEN)
        c.setLineWidth(1.4)
        midy = y + 6
        c.line(xd - 4, midy, xp + 8, midy)
        c.line(xp + 8, midy, xp + 14, midy + 4)
        c.line(xp + 8, midy, xp + 14, midy - 4)
        # years badge
        if self.years:
            c.setFillColor(GREEN)
            c.roundRect(CONTENT_W - 96, y + 16, 92, 16, 8, stroke=0, fill=1)
            c.setFillColor(WHITE)
            c.setFont("Helvetica-Bold", 9)
            c.drawCentredString(CONTENT_W - 50, y + 20, f"−{self.years:g} yr younger")
        # tissue rejuvenation index bar
        if self.idx is not None:
            by = 12
            c.setFillColor(SUB)
            c.setFont("Helvetica", 8)
            c.drawString(4, by + 14, "Tissue rejuvenation index")
            c.setFillColor(BG_SOFT)
            c.roundRect(4, by, CONTENT_W - 60, 9, 4.5, stroke=0, fill=1)
            c.setFillColor(TEAL)
            frac = max(0.0, min(1.0, self.idx / 100.0))
            c.roundRect(4, by, max(6, (CONTENT_W - 60) * frac), 9, 4.5, stroke=0, fill=1)
            c.setFillColor(TEAL)
            c.setFont("Helvetica-Bold", 9)
            c.drawRightString(CONTENT_W - 4, by + 1, f"{self.idx:g}%")
        c.restoreState()


class SuccessBars(Flowable):
    """Step 6 — projected success without vs with the avatar pre-screen."""

    def __init__(self, without_pct, with_pct):
        super().__init__()
        self.wo, self.wi = without_pct, with_pct
        self.h = 52
        self.width = CONTENT_W

    def wrap(self, *_):
        return (CONTENT_W, self.h)

    def _bar(self, c, y, label, pct, col):
        c.setFillColor(SUB)
        c.setFont("Helvetica", 8.5)
        c.drawString(4, y + 3, label)
        x0 = 150
        tw = CONTENT_W - x0 - 44
        c.setFillColor(BG_SOFT)
        c.roundRect(x0, y, tw, 12, 6, stroke=0, fill=1)
        c.setFillColor(col)
        frac = max(0.0, min(1.0, (pct or 0) / 100.0))
        c.roundRect(x0, y, max(6, tw * frac), 12, 6, stroke=0, fill=1)
        c.setFillColor(col)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(x0 + tw + 6, y + 2, f"{pct:g}%")

    def draw(self):
        c = self.canv
        c.saveState()
        self._bar(c, 30, "Without avatar pre-screen", self.wo, SUB)
        self._bar(c, 8, "With avatar pre-screen", self.wi, GREEN)
        c.restoreState()


def _feature_color(name: str) -> Color:
    n = (name or "").lower()
    if "itr" in n:
        return HexColor("#94a3b8")
    if any(k in n for k in ("promoter", "tre", "efs", "ef1", "cmv")):
        return PRIMARY
    if any(k in n for k in ("oct4", "sox2", "klf4", "rtta", "cds", "pou5f1")):
        return GREEN
    if any(k in n for k in ("p2a", "t2a", "peptide")):
        return AMBER
    if "polya" in n:
        return PURPLE
    if any(k in n for k in ("kozak", "start")):
        return TEAL
    return HexColor("#64748b")


class ConstructMap(Flowable):
    """A colour-coded gene map for one AAV vector (proportional feature blocks)."""

    def __init__(self, vector: dict):
        super().__init__()
        self.v = vector
        self.h = 42
        self.width = CONTENT_W

    def wrap(self, *_):
        return (CONTENT_W, self.h)

    def draw(self):
        c = self.canv
        v = self.v
        c.saveState()
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 8.5)
        fits = "✓ fits AAV" if v.get("fits_aav") else "✗ over AAV limit"
        c.drawString(2, self.h - 10, f"{v.get('name','vector')} — {v.get('length_bp','?')} bp")
        c.setFillColor(GREEN if v.get("fits_aav") else RED)
        c.setFont("Helvetica-Bold", 8)
        c.drawRightString(CONTENT_W - 2, self.h - 10, fits)
        feats = v.get("features", []) or []
        total = sum(max(1, f.get("length", 1)) for f in feats) or 1
        x = 2
        y = 8
        bw = CONTENT_W - 4
        bh = 15
        for f in feats:
            w = bw * max(1, f.get("length", 1)) / total
            col = _feature_color(f.get("name", ""))
            c.setFillColor(col)
            c.rect(x, y, w, bh, stroke=0, fill=1)
            c.setStrokeColor(WHITE)
            c.setLineWidth(0.6)
            c.rect(x, y, w, bh, stroke=1, fill=0)
            # label if wide enough
            nm = (f.get("name", "") or "").replace(" self-cleaving peptide", "")
            nm = nm.split("(")[0].strip()
            if w > 34:
                c.setFillColor(WHITE)
                c.setFont("Helvetica-Bold", 6)
                c.drawCentredString(x + w / 2, y + bh / 2 - 2, nm[:14])
            x += w
        c.restoreState()


def _risk_chart(risk_curve, requested, threshold, tier_color) -> Drawing:
    """Vertical bar chart: over-induction risk (%) by cycle, threshold line."""
    curve = risk_curve or []
    cats = [str(p.get("cycles")) for p in curve]
    vals = [round((p.get("risk") or 0) * 100, 1) for p in curve]
    thr = round((threshold or 0.15) * 100, 1)
    vmax = max(vals + [thr, 5]) * 1.15
    d = Drawing(CONTENT_W, 150)
    bc = VerticalBarChart()
    bc.x = 34
    bc.y = 24
    bc.width = CONTENT_W - 70
    bc.height = 108
    bc.data = [vals]
    bc.categoryAxis.categoryNames = cats
    bc.categoryAxis.labels.fontName = "Helvetica"
    bc.categoryAxis.labels.fontSize = 8
    bc.valueAxis.valueMin = 0
    bc.valueAxis.valueMax = vmax
    bc.valueAxis.labels.fontName = "Helvetica"
    bc.valueAxis.labels.fontSize = 7
    bc.barWidth = 8
    bc.groupSpacing = 6
    bc.bars[0].fillColor = _tint(PRIMARY, 0.4)
    bc.bars[0].strokeColor = None
    # highlight the requested cycle
    for i, p in enumerate(curve):
        if p.get("cycles") == requested:
            bc.bars[(0, i)].fillColor = tier_color
    d.add(bc)
    # threshold line
    ty = bc.y + bc.height * (thr / vmax)
    d.add(Line(bc.x, ty, bc.x + bc.width, ty, strokeColor=RED, strokeWidth=1,
               strokeDashArray=[3, 2]))
    d.add(String(bc.x + bc.width, ty + 3, f"{thr:g}% planning threshold",
                 fontName="Helvetica", fontSize=7, fillColor=RED, textAnchor="end"))
    d.add(String(2, 138, "Estimated over-induction risk by reprogramming cycle",
                 fontName="Helvetica-Bold", fontSize=8.5, fillColor=INK))
    d.add(String(34, 6, "cycles →", fontName="Helvetica", fontSize=7, fillColor=SUB))
    return d


# ---------------------------------------------------------------------------
# PDF
# ---------------------------------------------------------------------------
def build_pdf(payload: dict) -> bytes:
    """Render a colourful, simulator-styled run report."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=14 * mm, bottomMargin=14 * mm,
                            leftMargin=LMARGIN, rightMargin=RMARGIN)
    styles = getSampleStyleSheet()
    body = ParagraphStyle("body", parent=styles["BodyText"], fontSize=9, leading=12,
                          textColor=INK)
    small = ParagraphStyle("small", parent=styles["BodyText"], fontSize=7.5, leading=10,
                           textColor=SUB)
    chip = ParagraphStyle("chip", parent=body, fontSize=8, leading=11)

    story: list = []

    def kv_table(rows, accent: Color = PRIMARY):
        rows = [[str(a), str(b)] for a, b in rows]
        t = Table(rows, colWidths=[52 * mm, CONTENT_W - 52 * mm])
        t.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
            ("INNERGRID", (0, 0), (-1, -1), 0.25, BORDER),
            ("BACKGROUND", (0, 0), (0, -1), _tint(accent, 0.10)),
            ("TEXTCOLOR", (0, 0), (0, -1), PRIMARY_DKR),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8.5),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        return t

    # ---- Header --------------------------------------------------------
    story += [HeaderBand("StemCells Protocol — Simulator Report",
                         "Personalised epigenetic reprogramming & safety envelope"),
              Spacer(1, 10)]

    # ---- Patient / therapy card ---------------------------------------
    meta = payload.get("disease") or {}
    patient = payload.get("sample")
    hdr_rows = []
    if meta.get("name"):
        hdr_rows.append(["Therapy / disease", meta.get("name")])
    if meta.get("department"):
        hdr_rows.append(["Department", meta.get("department")])
    if meta.get("tissue"):
        hdr_rows.append(["Target tissue", meta.get("tissue")])
    if meta.get("capsid"):
        hdr_rows.append(["AAV capsid", str(meta.get("capsid")).upper()])
    if patient:
        hdr_rows.append(["Sample / patient", patient])
    if payload.get("chronological_age") is not None:
        hdr_rows.append(["Chronological age", payload.get("chronological_age")])
    if hdr_rows:
        story += [kv_table(hdr_rows), Spacer(1, 10)]

    # ---- Headline KPI cards -------------------------------------------
    ea = payload.get("epigenetic_age") or {}
    rej = payload.get("rejuvenation") or {}
    tum = payload.get("tumor") or {}
    kpis = []
    if ea.get("dnam_age") is not None:
        kpis.append({"value": f"{ea.get('dnam_age')}", "label": "DNAm age (yrs)", "color": PRIMARY})
    if rej.get("years_reversed") is not None:
        kpis.append({"value": f"−{rej.get('years_reversed')}", "label": "years reversed", "color": GREEN})
    if rej.get("tissue_rejuvenation_index") is not None:
        kpis.append({"value": f"{rej.get('tissue_rejuvenation_index')}%", "label": "rejuvenation index", "color": TEAL})
    if tum.get("risk_tier"):
        kpis.append({"value": tum.get("risk_tier"), "label": "tumorigenicity tier",
                     "color": _tier_color(tum.get("risk_tier"))})
    if kpis:
        story += [KpiRow(kpis), Spacer(1, 12)]

    # ---- 1 · Epigenetic age -------------------------------------------
    if ea:
        chrono = ea.get("chronological_age")
        accel = ea.get("age_acceleration")
        block = [SectionHeader("1", "Epigenetic age"), Spacer(1, 4),
                 AgeTrack(ea.get("dnam_age"), chrono), Spacer(1, 2),
                 kv_table([
                     ["Clock", str(ea.get("clock"))],
                     ["Predicted DNAm age (yrs)", str(ea.get("dnam_age"))],
                     ["Chronological age", str(chrono) if chrono is not None else "Not provided"],
                     ["Age acceleration",
                      f"+{accel} yr" if isinstance(accel, (int, float)) else
                      (str(accel) if accel is not None else "— (needs chronological age)")],
                     ["CpG coverage", f"{ea.get('n_used')}/{ea.get('n_total')} ({ea.get('coverage')})"],
                 ])]
        story += [KeepTogether(block), Spacer(1, 10)]

    # ---- 2 · Reprogramming projection ---------------------------------
    if rej and rej.get("projected_age") is not None:
        block = [SectionHeader("2", "Reprogramming projection", GREEN), Spacer(1, 4),
                 ReversalTrack(ea.get("dnam_age") or rej.get("projected_age"),
                               rej.get("projected_age"), rej.get("years_reversed"),
                               rej.get("tissue_rejuvenation_index")), Spacer(1, 4),
                 kv_table([
                     ["Cycles", rej.get("cycles")],
                     ["Projected DNAm age (yrs)", rej.get("projected_age")],
                     ["Years reversed", rej.get("years_reversed")],
                 ], GREEN)]
        if rej.get("basis"):
            block.append(Spacer(1, 3))
            block.append(Paragraph(f"<b>Basis.</b> {rej.get('basis')}", small))
        story += [KeepTogether(block), Spacer(1, 10)]

    # ---- 3 · Top target CpGs ------------------------------------------
    targets = payload.get("targets") or []
    if targets:
        rows = [["CpG", "Gene", "Chr", "Direction", "Contribution"]]
        dir_rows = []
        for i, t in enumerate(targets[:15], start=1):
            direction = (t.get("direction") or "").strip()
            rows.append([t.get("cpg"), t.get("gene") or "-", t.get("chrom") or "-",
                         direction, str(t.get("contribution"))])
            dir_rows.append((i, direction))
        tt = Table(rows, colWidths=[34 * mm, 32 * mm, 14 * mm, 34 * mm, 32 * mm])
        style = [
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 7.5),
            ("GRID", (0, 0), (-1, -1), 0.25, BORDER),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, BG_SOFT]),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
        ]
        for i, direction in dir_rows:
            col = GREEN if "demeth" in direction.lower() else RED
            style.append(("TEXTCOLOR", (3, i), (3, i), col))
            style.append(("FONTNAME", (3, i), (3, i), "Helvetica-Bold"))
        tt.setStyle(TableStyle(style))
        story += [SectionHeader("3", "Top target CpGs"), Spacer(1, 4), tt, Spacer(1, 10)]

    # ---- 4 · OSK Tet-On construct -------------------------------------
    con = payload.get("construct") or {}
    if con:
        block = [SectionHeader("4", "OSK Tet-On construct (Track A)"), Spacer(1, 3),
                 Paragraph(f"Strategy: <b>{con.get('strategy')}</b> &nbsp;·&nbsp; "
                           f"Capsid: {con.get('capsid_desc')}", body), Spacer(1, 4)]
        for v in con.get("vectors", []):
            block += [ConstructMap(v), Spacer(1, 4)]
        # tiny legend
        legend = ("<font color='#4285F4'>■</font> promoter &nbsp; "
                  "<font color='#16a34a'>■</font> CDS (OSK/rtTA) &nbsp; "
                  "<font color='#f59e0b'>■</font> 2A peptide &nbsp; "
                  "<font color='#7c3aed'>■</font> polyA &nbsp; "
                  "<font color='#0d9488'>■</font> Kozak &nbsp; "
                  "<font color='#94a3b8'>■</font> ITR")
        block.append(Paragraph(legend, small))
        story += [KeepTogether(block), Spacer(1, 10)]

    # ---- 5 · Candidate molecules --------------------------------------
    cands = payload.get("candidates") or []
    if cands:
        rows = [["#", "SMILES / seq", "rank", "QED", "MW", "Lipinski", "novel"]]
        for i, c in enumerate(cands[:20], 1):
            s = c.get("scores", {})
            rows.append([str(i), (c.get("seq") or "")[:34], str(s.get("rank_score")),
                         str(s.get("qed")), str(s.get("mw")), str(s.get("lipinski_pass")),
                         str(s.get("novel"))])
        ct = Table(rows, colWidths=[8 * mm, 60 * mm, 18 * mm, 18 * mm, 20 * mm, 22 * mm, 18 * mm])
        ct.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 7.5),
            ("FONTNAME", (1, 1), (1, -1), "Courier"),
            ("GRID", (0, 0), (-1, -1), 0.25, BORDER),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, BG_SOFT]),
        ]))
        story += [SectionHeader("5", "Candidate molecules (Track B — research hypotheses)"),
                  Spacer(1, 4), ct, Spacer(1, 10)]

    # ---- 6 · Safety Implant Blob --------------------------------------
    saf = payload.get("safety") or {}
    if saf:
        block = [SectionHeader("6", "Safety Implant Blob — avatar pre-screen", TEAL), Spacer(1, 4),
                 SuccessBars(saf.get("projected_success_without") or 0,
                             saf.get("projected_success_with") or 0), Spacer(1, 2),
                 kv_table([
                     ["Host", saf.get("host")],
                     ["Avatar cycles", saf.get("avatar_cycles")],
                     ["Risk caught by avatar", f"{round((saf.get('risk_reduction') or 0) * 100)}%"],
                 ], TEAL)]
        if saf.get("detects"):
            block += [Spacer(1, 2), Paragraph("<b>Avatar can see:</b> " + "; ".join(saf["detects"]), small)]
        if saf.get("misses"):
            block += [Paragraph("<b>Avatar cannot see:</b> " + "; ".join(saf["misses"]), small)]
        story += [KeepTogether(block), Spacer(1, 10)]

    # ---- 7 · Tumorigenicity safety envelope ---------------------------
    if tum:
        tc = _tier_color(tum.get("risk_tier"))
        risk_pct = round((tum.get("estimated_risk") or 0) * 100)
        cards = [
            {"value": tum.get("risk_tier"), "label": "risk tier", "color": tc},
            {"value": f"{risk_pct}%", "label": f"risk at {tum.get('requested_cycles')} cycle(s)", "color": tc},
            {"value": tum.get("max_safe_cycles"), "label": "max safe cycles", "color": PRIMARY},
            {"value": f"{tum.get('tissue_proliferation_factor')}×",
             "label": f"proliferation ({tum.get('tissue_key')})", "color": PRIMARY},
        ]
        block = [SectionHeader("7", "Tumorigenicity safety envelope", tc), Spacer(1, 4),
                 KpiRow(cards), Spacer(1, 8),
                 _risk_chart(tum.get("risk_curve"), tum.get("requested_cycles"),
                             tum.get("risk_threshold"), tc), Spacer(1, 4),
                 kv_table([["Dosing", tum.get("pulse_recommendation")]], tc)]
        if tum.get("flags"):
            flags = "".join(f"• {f}<br/>" for f in tum["flags"])
            block += [Spacer(1, 3), Paragraph(f"<b>Flags.</b><br/>{flags}", small)]
        if tum.get("safety_by_design"):
            block += [Paragraph("<b>Safety-by-design:</b> " + "; ".join(tum["safety_by_design"]), small)]
        if tum.get("summary"):
            block += [Spacer(1, 2), Paragraph(tum["summary"], body)]
        if tum.get("disclaimer"):
            block += [Spacer(1, 2), Paragraph(tum["disclaimer"], small)]
        story += [KeepTogether(block), Spacer(1, 10)]

    # ---- Optional interpretation --------------------------------------
    interp = payload.get("interpretation")
    if interp:
        story += [SectionHeader("+", "Plain-language summary", PURPLE), Spacer(1, 4),
                  Paragraph(interp, body), Spacer(1, 8)]

    # ---- Footer disclaimer band ---------------------------------------
    disc = Table([[Paragraph(_DISCLAIMER, small)]], colWidths=[CONTENT_W])
    disc.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), _tint(PRIMARY, 0.07)),
        ("BOX", (0, 0), (-1, -1), 0.5, _tint(PRIMARY, 0.4)),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story += [Spacer(1, 4), disc]

    doc.build(story)
    return buf.getvalue()
