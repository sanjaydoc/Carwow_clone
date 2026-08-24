"""CSV + PDF export of a Simulator run (D6)."""
from __future__ import annotations

import csv
import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

_DISCLAIMER = (
    "Epigenetic age is computed from your data with the published Horvath (2013) "
    "clock. The construct is a deterministic assembly of standard parts. Generated "
    "molecules are AI research hypotheses — not validated, synthesizable or approved "
    "therapeutics. This document is not medical advice."
)


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


def build_pdf(payload: dict) -> bytes:
    """Render a run report: epigenetic age, targets, construct, top candidates."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=18 * mm, bottomMargin=16 * mm,
                            leftMargin=16 * mm, rightMargin=16 * mm)
    styles = getSampleStyleSheet()
    h1, h2, body, small = styles["Title"], styles["Heading2"], styles["BodyText"], styles["Italic"]
    story = [Paragraph("StemCells Protocol — Simulator Report", h1),
             Paragraph("Research / illustrative. Not medical advice.", small),
             Spacer(1, 8)]

    def kv_table(rows):
        t = Table(rows, colWidths=[55 * mm, 110 * mm])
        t.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
            ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e0e0e0")),
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f2f6ff")),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        return t

    # Epigenetic age
    ea = payload.get("epigenetic_age") or {}
    if ea:
        story += [Paragraph("Epigenetic age", h2),
                  kv_table([
                      ["Clock", str(ea.get("clock"))],
                      ["Predicted DNAm age (yrs)", str(ea.get("dnam_age"))],
                      ["Chronological age", str(ea.get("chronological_age"))],
                      ["Age acceleration", str(ea.get("age_acceleration"))],
                      ["CpG coverage", f"{ea.get('n_used')}/{ea.get('n_total')} ({ea.get('coverage')})"],
                  ]), Spacer(1, 8)]

    # Targets
    targets = payload.get("targets") or []
    if targets:
        rows = [["CpG", "Gene", "Chr", "Direction", "Contribution"]]
        for t in targets[:15]:
            rows.append([t.get("cpg"), t.get("gene") or "-", t.get("chrom") or "-",
                         t.get("direction"), str(t.get("contribution"))])
        tt = Table(rows, colWidths=[30 * mm, 30 * mm, 15 * mm, 30 * mm, 30 * mm])
        tt.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4285F4")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e0e0e0")),
        ]))
        story += [Paragraph("Top target CpGs", h2), tt, Spacer(1, 8)]

    # Construct
    con = payload.get("construct") or {}
    if con:
        story += [Paragraph("OSK Tet-On construct (Track A)", h2),
                  Paragraph(f"Strategy: <b>{con.get('strategy')}</b> · Capsid: {con.get('capsid_desc')}", body)]
        for v in con.get("vectors", []):
            feats = " → ".join(f"{f['name']}({f['length']})" for f in v.get("features", []))
            story += [Paragraph(f"<b>{v['name']}</b> — {v['length_bp']} bp (fits AAV: {v['fits_aav']})", body),
                      Paragraph(feats, small), Spacer(1, 3)]
        story.append(Spacer(1, 6))

    # Candidates
    cands = payload.get("candidates") or []
    if cands:
        rows = [["#", "SMILES / seq", "rank", "QED", "MW", "Lipinski", "novel"]]
        for i, c in enumerate(cands[:20], 1):
            s = c.get("scores", {})
            rows.append([str(i), (c.get("seq") or "")[:34], str(s.get("rank_score")),
                         str(s.get("qed")), str(s.get("mw")), str(s.get("lipinski_pass")),
                         str(s.get("novel"))])
        ct = Table(rows, colWidths=[8 * mm, 62 * mm, 18 * mm, 18 * mm, 20 * mm, 22 * mm, 18 * mm])
        ct.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4285F4")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 7.5),
            ("FONTNAME", (1, 1), (1, -1), "Courier"),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e0e0e0")),
        ]))
        story += [Paragraph("Candidate molecules (Track B — research hypotheses)", h2), ct, Spacer(1, 8)]

    # Optional Claude interpretation
    interp = payload.get("interpretation")
    if interp:
        story += [Paragraph("Plain-language summary", h2), Paragraph(interp, body), Spacer(1, 8)]

    story += [Spacer(1, 6), Paragraph(_DISCLAIMER, small)]
    doc.build(story)
    return buf.getvalue()
