"""Runtime configuration (D1).

All settings are read from environment variables / a local `.env` file. Nothing
here reaches the network unless *you* run Track B (which shells out to the
De-Novo-LLM repo on your machine).
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SIM_", env_file=".env", extra="ignore")

    # "laptop" caps generation sizes and serializes GPU jobs (6 GB VRAM safe).
    mode: str = "laptop"

    # On-device working directory for uploads, jobs, and outputs.
    work_dir: Path = Path("./_work")

    allowed_origins: str = "http://localhost:8000,http://127.0.0.1:8000,http://localhost:5173"

    # --- De-Novo-LLM (Track B) --------------------------------------------
    # These use their own env names (no SIM_ prefix) so they read cleanly.
    denovo_llm_dir: Path = Path("../../De-Novo-LLM")
    denovo_python: str = ""

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def is_laptop(self) -> bool:
        return self.mode.lower() == "laptop"

    # Generation caps applied in laptop mode (kept modest for 6 GB VRAM).
    @property
    def max_generate(self) -> int:
        return 200 if self.is_laptop else 5000


class DenovoSettings(BaseSettings):
    """De-Novo-LLM paths, read from the un-prefixed env vars in .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    denovo_llm_dir: Path = Path("../../De-Novo-LLM")
    denovo_python: str = ""


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    dn = DenovoSettings()
    # Let the un-prefixed DENOVO_* vars win for the repo path/python.
    s.denovo_llm_dir = dn.denovo_llm_dir
    s.denovo_python = dn.denovo_python
    s.work_dir.mkdir(parents=True, exist_ok=True)
    return s
