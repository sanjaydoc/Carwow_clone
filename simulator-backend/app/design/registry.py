"""Engine registry (D4).

Pluggable so the other repos (NeuroMamba, pdz-denovo, SonoForge) slot in later
behind the same DesignEngine interface. For now, De-Novo-LLM covers small
molecules (v1), peptides and nucleic acids.
"""
from __future__ import annotations

from .base import DesignEngine
from .denovo_llm import DenovoLLMEngine

_ENGINES: dict[str, DesignEngine] = {}


def get_engine(name: str = "denovo-llm") -> DesignEngine:
    if name not in _ENGINES:
        if name == "denovo-llm":
            _ENGINES[name] = DenovoLLMEngine()
        else:
            raise KeyError(f"Unknown design engine: {name}")
    return _ENGINES[name]
