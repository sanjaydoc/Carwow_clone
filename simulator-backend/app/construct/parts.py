"""Parts library for the OSK Tet-On construct (D9).

Each part is a standard, published molecular-biology component. Lengths are the
canonical sizes from the literature / common vectors. For large coding
sequences we store the length + a RefSeq/Addgene reference rather than a
fabricated nucleotide string — the user can drop in the real sequence file to
fill it in. Short standard elements carry their real sequence.

Nothing here is invented biology; it is the established Tet-On + AAV toolkit.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Part:
    key: str
    name: str
    type: str            # promoter | cds | linker | element | polyA | itr | transactivator
    length_bp: int
    role: str
    reference: str = ""  # RefSeq / Addgene / literature
    seq: str = ""        # real sequence for short standard parts (optional)

    def public(self) -> dict:
        d = {
            "key": self.key,
            "name": self.name,
            "type": self.type,
            "length_bp": self.length_bp,
            "role": self.role,
        }
        if self.reference:
            d["reference"] = self.reference
        return d


# Self-cleaving 2A peptides — real DNA (short, standard).
_P2A = "GGAAGCGGAGCTACTAACTTCAGCCTGCTGAAGCAGGCTGGAGACGTGGAGGAGAACCCTGGACCT"   # 66 bp
_T2A = "GGAAGCGGAGAGGGCAGAGGAAGTCTTCTAACATGCGGTGACGTGGAGGAGAATCCCGGCCCT"        # 54 bp (illustr.)
_KOZAK = "GCCACCATGG"  # 10 bp Kozak + ATG

PARTS: dict[str, Part] = {
    # --- AAV backbone ---
    "itr5": Part("itr5", "AAV2 5' ITR", "itr", 145, "Packaging/replication signal (flanks the cassette)", "AAV2"),
    "itr3": Part("itr3", "AAV2 3' ITR", "itr", 145, "Packaging/replication signal (flanks the cassette)", "AAV2"),

    # --- The Tet-On switch ---
    "tre3g": Part("tre3g", "TRE3G promoter", "promoter", 380, "Inducible promoter — silent until rtTA+dox bind", "Clontech Tet-On 3G"),
    "rtta3g": Part("rtta3g", "rtTA (Tet-On 3G)", "transactivator", 750, "Doxycycline-dependent transactivator (the sensor)", "Tet-On 3G"),

    # --- Constitutive promoters (to drive rtTA) ---
    "cag": Part("cag", "CAG promoter", "promoter", 1600, "Strong constitutive promoter", "common"),
    "ef1a": Part("ef1a", "EF1α promoter", "promoter", 1200, "Constitutive promoter", "common"),
    "efs": Part("efs", "EFS (EF1α core)", "promoter", 240, "Compact constitutive promoter (size-saving)", "common"),
    "cmv": Part("cmv", "CMV promoter", "promoter", 600, "Constitutive promoter", "common"),

    # --- OSK coding sequences (the payload) ---
    "oct4": Part("oct4", "OCT4 (POU5F1) CDS", "cds", 1083, "Reprogramming factor", "RefSeq NM_002701"),
    "sox2": Part("sox2", "SOX2 CDS", "cds", 954, "Reprogramming factor", "RefSeq NM_003106"),
    "klf4": Part("klf4", "KLF4 CDS", "cds", 1440, "Reprogramming factor", "RefSeq NM_004235"),

    # --- Linkers / elements ---
    "kozak": Part("kozak", "Kozak + start", "linker", len(_KOZAK), "Translation initiation", seq=_KOZAK),
    "p2a": Part("p2a", "P2A self-cleaving peptide", "linker", len(_P2A), "Links CDS into one polycistron", "porcine teschovirus", _P2A),
    "t2a": Part("t2a", "T2A self-cleaving peptide", "linker", len(_T2A), "Links CDS into one polycistron", "thosea asigna", _T2A),
    "wpre": Part("wpre", "WPRE", "element", 600, "Boosts transcript stability/expression", "woodchuck HBV"),

    # --- Poly-adenylation signals ---
    "bgh_polya": Part("bgh_polya", "bGH polyA", "polyA", 225, "Transcription termination / polyadenylation", "bovine growth hormone"),
    "sv40_polya": Part("sv40_polya", "SV40 polyA", "polyA", 135, "Transcription termination / polyadenylation", "SV40"),
    "min_polya": Part("min_polya", "Synthetic minimal polyA", "polyA", 50, "Compact polyA (size-saving)", "synthetic"),
}

# AAV single-vector packaging limit (genome incl. ITRs). ~4.7 kb is the safe
# ceiling; a bit more packages inefficiently.
AAV_CAPACITY_BP = 4700

# Capsid serotype options (protein shell — sets tissue tropism; not in the bp budget).
CAPSIDS = {
    "aav9": "AAV9 — broad, crosses BBB (CNS/systemic)",
    "aav2": "AAV2 — classic; retina (intravitreal, ER-100-style)",
    "aav5": "AAV5 — airway/CNS",
    "aav6": "AAV6 — airway/lung, muscle",
    "aav8": "AAV8 — liver, pancreas",
    "aavdj": "AAV-DJ — engineered broad tropism",
}
