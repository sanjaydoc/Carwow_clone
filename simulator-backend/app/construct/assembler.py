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

from .parts import AAV_CAPACITY_BP, CAPSIDS, PARTS, Part


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


def assemble_osk_teton(
    *,
    constitutive_promoter: str = "efs",
    polya: str = "min_polya",
    include_wpre: bool = True,
    capsid: str = "aav9",
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
        capsid_desc=CAPSIDS.get(capsid, "custom capsid"),
        dox_protocol=_dox_protocol(),
        parts_used=sorted(parts_used, key=lambda p: p["length_bp"], reverse=True),
        objectives=objectives or [],
        notes=notes,
    )
