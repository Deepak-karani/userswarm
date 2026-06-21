"""UserSwarm FastAPI app entrypoint."""
from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import init_db
from .routers import annotate, compare, runs

_SCREENSHOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "screenshots"))

app = FastAPI(title="UserSwarm")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    # Live-only: fail fast if any required credential / Orkes URL is missing,
    # instead of silently booting into a mock path.
    settings.require_live()
    init_db()


os.makedirs(_SCREENSHOT_DIR, exist_ok=True)
app.mount("/static/screenshots", StaticFiles(directory=_SCREENSHOT_DIR), name="screenshots")

app.include_router(runs.router)
app.include_router(annotate.router)
app.include_router(compare.router)


@app.get("/")
def root() -> dict:
    return {"app": "UserSwarm", "modes": settings.mode_summary()}
