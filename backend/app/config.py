"""Central configuration + per-sponsor mock-mode detection.

Every sponsor integration (Anthropic, Agentspan, Arize, Terac) has a *real* code
path and a *mock* code path behind one interface. Mock mode auto-enables when the
relevant credential / server is absent, so the whole demo runs fully offline.
Set the matching ``*_MOCK`` env var to force a mode either way.
"""
from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv

# Load .env from repo root and backend/ if present.
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))


def _truthy(value: str | None) -> bool | None:
    if value is None:
        return None
    return value.strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    def __init__(self) -> None:
        # --- LLM ---
        self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "").strip()
        self.llm_model_fast = os.getenv("LLM_MODEL_FAST", "claude-sonnet-4-6")
        self.llm_model_smart = os.getenv("LLM_MODEL_SMART", "claude-opus-4-8")

        # --- Agentspan (Orkes) ---
        self.agentspan_server_url = os.getenv("AGENTSPAN_SERVER_URL", "").strip()

        # --- Arize ---
        self.arize_api_key = os.getenv("ARIZE_API_KEY", "").strip()
        self.arize_space_id = os.getenv("ARIZE_SPACE_ID", "").strip()

        # --- Terac ---
        self.terac_api_key = os.getenv("TERAC_API_KEY", "").strip()
        self.terac_base_url = os.getenv("TERAC_BASE_URL", "https://api.terac.ai").strip()

        # --- Persistence ---
        self.database_url = os.getenv("DATABASE_URL", "").strip()

        # --- Browser ---
        self.max_browser_actions = int(os.getenv("MAX_BROWSER_ACTIONS", "12"))
        self.min_browser_actions = int(os.getenv("MIN_BROWSER_ACTIONS", "8"))
        self.browser_headless = _truthy(os.getenv("BROWSER_HEADLESS")) is not False

        # --- Mock overrides (None => auto-derive from missing creds) ---
        self._llm_mock = _truthy(os.getenv("LLM_MOCK"))
        self._agentspan_mock = _truthy(os.getenv("AGENTSPAN_MOCK"))
        self._arize_mock = _truthy(os.getenv("ARIZE_MOCK"))
        self._terac_mock = _truthy(os.getenv("TERAC_MOCK"))

    # Mock flags: explicit override wins, else auto-derive.
    @property
    def llm_mock(self) -> bool:
        return self._llm_mock if self._llm_mock is not None else not self.anthropic_api_key

    @property
    def agentspan_mock(self) -> bool:
        return self._agentspan_mock if self._agentspan_mock is not None else not self.agentspan_server_url

    @property
    def arize_mock(self) -> bool:
        return self._arize_mock if self._arize_mock is not None else not (self.arize_api_key and self.arize_space_id)

    @property
    def terac_mock(self) -> bool:
        return self._terac_mock if self._terac_mock is not None else not self.terac_api_key

    @property
    def effective_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        # SQLite fallback keeps the "runs offline" guarantee.
        path = os.path.join(os.path.dirname(__file__), "..", "userswarm.db")
        return f"sqlite:///{os.path.abspath(path)}"

    def mode_summary(self) -> dict[str, str]:
        return {
            "llm": "mock" if self.llm_mock else "live",
            "agentspan": "mock" if self.agentspan_mock else "live",
            "arize": "mock" if self.arize_mock else "live",
            "terac": "mock" if self.terac_mock else "live",
            "db": "sqlite" if not self.database_url else "postgres",
        }


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
