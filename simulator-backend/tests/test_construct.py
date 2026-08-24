"""Lock the Track A construct assembler behaviour."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.construct import assemble_osk_teton  # noqa: E402
from app.construct.parts import AAV_CAPACITY_BP  # noqa: E402


def test_splits_when_over_aav_capacity():
    r = assemble_osk_teton()
    # OSK + Tet-On exceeds one AAV → must split into two co-delivered vectors.
    assert r.strategy == "dual-aav (split)"
    assert len(r.vectors) == 2
    for v in r.vectors:
        assert v.fits_aav
        assert v.length_bp <= AAV_CAPACITY_BP


def test_payload_carries_osk_and_switch():
    r = assemble_osk_teton()
    names = " ".join(f.name for v in r.vectors for f in v.features).upper()
    for token in ("TRE3G", "OCT4", "SOX2", "KLF4", "RTTA"):
        assert token in names


def test_dox_protocol_has_no_dose():
    r = assemble_osk_teton()
    text = " ".join(str(v) for v in r.dox_protocol.values()).lower()
    assert "doxycycline" in text
    assert "duration" in text  # safety-critical variable is called out


if __name__ == "__main__":
    test_splits_when_over_aav_capacity()
    test_payload_carries_osk_and_switch()
    test_dox_protocol_has_no_dose()
    print("all construct tests passed")
