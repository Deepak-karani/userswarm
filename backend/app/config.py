"""Central configuration.

Anthropic (LLM), Agentspan (Orkes), and Arize run LIVE only — there is no mock
fallback. Missing credentials / an unreachable Orkes server raise at startup
rather than silently degrading to a fake path. Terac has no live backend yet
(unimplemented endpoint), so it still produces synthetic annotation labels.
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


class ConfigError(RuntimeError):
    """Raised when a required live credential / server URL is missing."""


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
        self.max_browser_actions = int(os.getenv("MAX_BROWSER_ACTIONS", "10"))
        self.min_browser_actions = int(os.getenv("MIN_BROWSER_ACTIONS", "4"))
        # Per-UXTester wall-clock budget (seconds): the loop stops and writes its report
        # once exceeded, so a hard site can never make a run crawl for many minutes.
        self.tester_budget_seconds = int(os.getenv("TESTER_BUDGET_SECONDS", "90"))
        self.browser_headless = _truthy(os.getenv("BROWSER_HEADLESS")) is not False

    # ------------------------------------------------------------------ #
    # Live-only enforcement. No mock fallback: a missing credential is a
    # hard error, not a silent switch to fake output.
    # ------------------------------------------------------------------ #
    def require_live(self) -> None:
        """Fail fast if any LIVE-only integration is unconfigured."""
        missing: list[str] = []
        if not self.anthropic_api_key:
            missing.append("ANTHROPIC_API_KEY (LLM)")
        if not self.agentspan_server_url:
            missing.append("AGENTSPAN_SERVER_URL (Orkes/Agentspan)")
        if not (self.arize_api_key and self.arize_space_id):
            missing.append("ARIZE_API_KEY + ARIZE_SPACE_ID (Arize)")
        if missing:
            raise ConfigError(
                "Live-only mode requires: " + ", ".join(missing) +
                ". Mock fallbacks have been removed; set these in .env."
            )

    @property
    def terac_mock(self) -> bool:
        """Terac is the one integration without a live backend yet."""
        override = _truthy(os.getenv("TERAC_MOCK"))
        return override if override is not None else not self.terac_api_key

    @property
    def effective_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        # SQLite fallback keeps local persistence working without Postgres.
        path = os.path.join(os.path.dirname(__file__), "..", "userswarm.db")
        return f"sqlite:///{os.path.abspath(path)}"

    def mode_summary(self) -> dict[str, str]:
        return {
            "llm": "live",
            "agentspan": "live",
            "arize": "live",
            "terac": "mock" if self.terac_mock else "live",
            "db": "sqlite" if not self.database_url else "postgres",
        }


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
