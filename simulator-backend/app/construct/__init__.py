"""Track A (D9): assemble the *known* OSK Tet-On vector from a parts library.

This is deterministic assembly of established biological parts — a research
construct, NOT a clinical-grade or validated therapeutic. It does not invent
biology; it wires standard parts (OSK genes, Tet-On switch, AAV backbone) and
checks the AAV packaging limit.
"""

from .assembler import ConstructResult, assemble_osk_teton
from .exosome import design_exosome_delivery
from .parts import PARTS, Part

__all__ = ["ConstructResult", "assemble_osk_teton", "design_exosome_delivery", "PARTS", "Part"]
