"""Epigenetic age + target discovery (D3) — the real, computed core."""

from .clocks import ClockResult, HorvathClock, load_horvath
from .targets import TargetSite, discover_targets

__all__ = [
    "ClockResult",
    "HorvathClock",
    "load_horvath",
    "TargetSite",
    "discover_targets",
]
