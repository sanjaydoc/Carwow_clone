"""OSK Tet-On construct assembler (D9, Track A).

Wires the known parts into a Tet-On cassette, lays out an annotated feature map,
sums the length, and enforces the AAV packaging limit — automatically proposing
a two-vector split when a single AAV can't hold it (the real-world solution).

Deterministic assembly of established parts. The result is a *research
construct*, not a clinical-grade or validated therapeutic, and carries no dosing
advice.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from .parts import AAV_CAPACITY_BP, PARTS, Part, capsid_description


@dataclass
class Feature:
    key: str
    name: str
    type: str
    start: int
    end: int
    length: int

    def public(self) -> dict:
        return {
            "key": self.key,
            "name": self.name,
            "type": self.type,
            "start": self.start,
            "end": self.end,
            "length": self.length,
        }


@dataclass
class Vector:
    name: str
    features: list[Feature]
    length_bp: int
    fits_aav: bool

    def public(self) -> dict:
        return {
            "name": self.name,
            "length_bp": self.length_bp,
            "fits_aav": self.fits_aav,
            "capacity_bp": AAV_CAPACITY_BP,
            "headroom_bp": AAV_CAPACITY_BP - self.length_bp,
            "features": [f.public() for f in self.features],
        }


@dataclass
class ConstructResult:
    strategy: str                 # "single-aav" | "dual-aav (split)"
    vectors: list[Vector]
    capsid: str
    capsid_desc: str
    dox_protocol: dict
    parts_used: list[dict]
    objectives: list[dict] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    disclaimer: str = (
        "Deterministic assembly of standard, published parts (OSK + Tet-On + AAV). "
        "This is a research construct for in-silico illustration — not clinical-grade, "
        "not validated, and not medical or dosing advice."
    )

    def public(self) -> dict:
        return {
            "strategy": self.strategy,
            "vectors": [v.public() for v in self.vectors],
            "capsid": self.capsid,
            "capsid_desc": self.capsid_desc,
            "dox_protocol": self.dox_protocol,
            "parts_used": self.parts_used,
            "objectives": self.objectives,
            "notes": self.notes,
            "disclaimer": self.disclaimer,
        }


def _layout(name: str, keys: list[str]) -> Vector:
    features: list[Feature] = []
    pos = 0
    for key in keys:
        part = PARTS[key]
        features.append(Feature(key, part.name, part.type, pos, pos + part.length_bp, part.length_bp))
        pos += part.length_bp
    return Vector(name=name, features=features, length_bp=pos, fits_aav=pos <= AAV_CAPACITY_BP)


def _dox_protocol() -> dict:
    return {
        "logic": "Tet-On 3G: doxycycline present → rtTA binds TRE3G → OSK ON; "
        "doxycycline withdrawn → OSK OFF.",
        "regimen": "Partial reprogramming uses BRIEF, cyclic induction — short "
        "'dox-on' windows separated by 'dox-off' recovery, repeated with monitoring.",
        "critical_variable": "Induction DURATION. Too long risks loss of cell "
        "identity → iPSC conversion → tumour risk. Duration is the safety dial.",
        "note": "Illustrative regimen structure only — no human dose is given. "
        "Any real protocol requires preclinical work, regulatory approval and a clinician.",
    }


def assemble_microdystrophin(
    *,
    capsid: str = "aavrh74",
    tissue_key: str | None = "muscle",
    promoter: str = "ck8",
    objectives: list[dict] | None = None,
) -> dict:
    """Assemble a micro-dystrophin AAV GENE-REPLACEMENT construct (for muscular
    dystrophy / DMD) — a fundamentally different modality from OSK reprogramming.

    Muscular dystrophy is caused by a broken dystrophin gene, so the fix is to
    DELIVER a working (shortened) copy, not to reprogram the epigenome. Full
    dystrophin (~11 kb) is far too big for AAV, so a micro-dystrophin that keeps
    the essential domains is used, driven by a muscle-restricted promoter, in a
    single AAV. Returns its own shape (no dox switch)."""
    if promoter not in ("ck8", "mhck7"):
        promoter = "ck8"
    keys = ["itr5", promoter, "kozak", "microdys", "min_polya", "itr3"]
    vector = _layout("AAV micro-dystrophin (single vector)", keys)
    prom = PARTS[promoter]
    notes: list[str] = []
    if not vector.fits_aav:
        notes.append(
            f"Genome is {vector.length_bp} bp (> {AAV_CAPACITY_BP} bp) — switch to the "
            "compact CK8 promoter or a smaller micro-dystrophin variant to fit one AAV."
        )
    return {
        "construct_type": "gene_replacement",
        "modality": "Micro-dystrophin AAV gene replacement",
        "strategy": "single-aav" if vector.fits_aav else "oversized — needs a more compact design",
        "capsid": capsid,
        "capsid_desc": capsid_description(capsid, tissue_key),
        "vectors": [vector.public()],
        "driver": {
            "name": prom.name,
            "length_bp": prom.length_bp,
            "role": "Muscle-restricted DRIVER — turns the transgene on only in "
                    "skeletal/cardiac muscle, sparing other tissues.",
        },
        "payload": {
            "name": PARTS["microdys"].name,
            "length_bp": PARTS["microdys"].length_bp,
            "role": "Functional micro-dystrophin — a shortened dystrophin that keeps the "
                    "essential actin- and dystroglycan-binding domains and fits inside AAV.",
            "reference": PARTS["microdys"].reference,
        },
        "mechanism": "Gene REPLACEMENT: the AAV delivers a working micro-dystrophin gene so "
                     "muscle fibres make their own functional protein. No doxycycline switch, "
                     "no reprogramming — expression is constitutive and muscle-restricted.",
        "alternatives": [
            {"name": "Exon-skipping (antisense oligo, PMO)",
             "note": "Restores the reading frame of the patient's OWN dystrophin mRNA — mutation-specific "
                     "(e.g. exon 51/53 deletions); needs repeat dosing."},
            {"name": "CRISPR exon excision (dual gRNA + SaCas9)",
             "note": "Edits the genome to restore the reading frame; potentially permanent, delivered as "
                     "dual-AAV (Cas9 + guides)."},
            {"name": "Full-length dystrophin",
             "note": "~11 kb — far too large for AAV; requires non-viral, lentiviral, or utrophin-upregulation approaches."},
        ],
        "objectives": objectives or [],
        "notes": notes,
        "disclaimer": "Deterministic assembly of published DMD gene-therapy parts (micro-dystrophin + "
                      "muscle promoter + AAV). Research construct for in-silico illustration — not "
                      "clinical-grade, not validated, not medical advice. The right modality "
                      "(micro-dystrophin vs exon-skipping vs CRISPR) is MUTATION-DEPENDENT and needs "
                      "the patient's dystrophin genotype.",
    }


def assemble_dux4_silencing(
    *,
    capsid: str = "aavrh74",
    tissue_key: str | None = "muscle",
    promoter: str = "ck8",
    objectives: list[dict] | None = None,
) -> dict:
    """Assemble an anti-DUX4 SILENCING construct (for FSHD) — an epigenetic-disease
    modality, distinct from both OSK reprogramming and micro-dystrophin replacement.

    FSHD is caused by D4Z4 macrosatellite HYPOMETHYLATION, which de-represses the
    toxic DUX4 gene in muscle. The fix is to switch DUX4 back OFF: the leading
    gene therapy delivers an AAV artificial microRNA that knocks DUX4 mRNA down;
    the epigenetic alternative re-methylates/re-silences the D4Z4 array (CRISPRi).
    Returns the same shape as the micro-dystrophin construct (no dox switch)."""
    if promoter not in ("ck8", "mhck7"):
        promoter = "ck8"
    keys = ["itr5", promoter, "midux4", "min_polya", "itr3"]
    vector = _layout("AAV anti-DUX4 microRNA (single vector)", keys)
    prom = PARTS[promoter]
    return {
        "construct_type": "epigenetic_silencing",
        "modality": "AAV anti-DUX4 microRNA — DUX4 knockdown (RNAi)",
        "strategy": "single-aav" if vector.fits_aav else "oversized — needs a more compact design",
        "capsid": capsid,
        "capsid_desc": capsid_description(capsid, tissue_key),
        "vectors": [vector.public()],
        "driver": {
            "name": prom.name,
            "length_bp": prom.length_bp,
            "role": "Muscle-restricted DRIVER — expresses the anti-DUX4 microRNA only in "
                    "skeletal muscle, where DUX4 is toxic.",
        },
        "payload": {
            "name": PARTS["midux4"].name,
            "length_bp": PARTS["midux4"].length_bp,
            "role": "Anti-DUX4 microRNA — knocks down the toxic DUX4 transcript that D4Z4 "
                    "hypomethylation de-represses (silences the effector, not the whole locus).",
            "reference": PARTS["midux4"].reference,
        },
        "mechanism": "DUX4 SILENCING: FSHD's root cause is loss of methylation at the D4Z4 array, "
                     "which switches the toxic DUX4 gene ON in muscle. This construct switches DUX4 "
                     "back OFF by RNAi — addressing the actual epigenetic lesion, unlike generic "
                     "reprogramming or gene replacement.",
        "alternatives": [
            {"name": "CRISPRi re-silencing (dCas9–KRAB–DNMT3A at D4Z4)",
             "note": "Re-establishes repressive methylation/heterochromatin at the D4Z4 array — "
                     "fixes the epigenetic lesion directly (dCas9 fusion is large; delivery is the challenge)."},
            {"name": "Antisense oligonucleotide (ASO) vs DUX4",
             "note": "Degrades DUX4 mRNA without a virus; needs repeat dosing and muscle delivery."},
            {"name": "Small molecule (e.g. p38 inhibitor)",
             "note": "Lowers DUX4 expression pharmacologically — systemic, reversible, non-genetic."},
        ],
        "objectives": objectives or [],
        "notes": [],
        "disclaimer": "Deterministic assembly of published FSHD parts (anti-DUX4 miRNA / muscle "
                      "promoter / AAV). Research construct for in-silico illustration — not "
                      "clinical-grade, not validated, not medical advice.",
    }


def assemble_osk_teton(
    *,
    constitutive_promoter: str = "efs",
    polya: str = "min_polya",
    include_wpre: bool = True,
    capsid: str = "aav9",
    tissue_key: str | None = None,
    factor_order: tuple[str, str, str] = ("oct4", "sox2", "klf4"),
    objectives: list[dict] | None = None,
) -> ConstructResult:
    """Assemble the OSK Tet-On construct; split across two AAVs if needed."""
    o, s, k = factor_order
    notes: list[str] = []

    # Payload arm: TRE3G → Kozak → OSK (2A-linked) → [WPRE] → polyA
    payload = ["tre3g", "kozak", o, "p2a", s, "t2a", k]
    if include_wpre:
        payload.append("wpre")
    payload += [polya]
    # Driver arm: constitutive promoter → rtTA → polyA
    driver = [constitutive_promoter, "rtta3g", polya]

    single = _layout("Single AAV (all-in-one)", ["itr5", *payload, *driver, "itr3"])

    if single.fits_aav:
        vectors = [single]
        strategy = "single-aav"
    else:
        # Split: Vector 1 carries the payload, Vector 2 the driver.
        v1_keys = ["itr5", *payload, "itr3"]
        v1 = _layout("Vector 1 — payload (TRE3G–OSK)", v1_keys)
        if not v1.fits_aav and include_wpre:
            # Drop WPRE from the payload to make Vector 1 fit.
            payload_no_wpre = [p for p in payload if p != "wpre"]
            v1 = _layout("Vector 1 — payload (TRE3G–OSK)", ["itr5", *payload_no_wpre, "itr3"])
            notes.append("WPRE dropped from the payload vector to fit AAV capacity.")
        v2 = _layout("Vector 2 — driver (promoter–rtTA)", ["itr5", *driver, "itr3"])
        vectors = [v1, v2]
        strategy = "dual-aav (split)"
        notes.append(
            f"Single-vector cassette is {single.length_bp} bp (> {AAV_CAPACITY_BP} bp AAV "
            "limit) → split into two co-delivered AAVs."
        )

    used_keys = {kk for v in vectors for kk in [f.key for f in v.features]}
    parts_used = [PARTS[kk].public() for kk in used_keys]

    return ConstructResult(
        strategy=strategy,
        vectors=vectors,
        capsid=capsid,
        capsid_desc=capsid_description(capsid, tissue_key),
        dox_protocol=_dox_protocol(),
        parts_used=sorted(parts_used, key=lambda p: p["length_bp"], reverse=True),
        objectives=objectives or [],
        notes=notes,
    )
