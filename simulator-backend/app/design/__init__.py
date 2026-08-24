"""Track B (D4): drive the De-Novo-LLM repo to generate novel candidate molecules.

Real generation via your trained/pretrained De-Novo-LLM. Candidates are research
hypotheses — NOT validated or synthesizable therapeutics.
"""

from .base import Candidate, DesignRequest
from .denovo_llm import DenovoLLMEngine
from .registry import get_engine

__all__ = ["Candidate", "DesignRequest", "DenovoLLMEngine", "get_engine"]
