from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def normalize_database_url(value: str) -> str:
    """Normalize postgres/postgresql URIs for SQLAlchemy + psycopg 3."""
    cleaned = (value or "").strip()
    if cleaned.startswith("postgres://"):
        return cleaned.replace("postgres://", "postgresql+psycopg://", 1)
    if cleaned.startswith("postgresql://"):
        return cleaned.replace("postgresql://", "postgresql+psycopg://", 1)
    return cleaned

DATABASE_URL = normalize_database_url(os.getenv("DATABASE_URL", f"sqlite:///{ROOT / 'brandtrace.db'}"))
if not DATABASE_URL.startswith(("sqlite://", "postgresql+psycopg://")):
    raise RuntimeError("DATABASE_URL must use sqlite:// or postgresql:// (psycopg) syntax.")

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
    if origin.strip()
]

MAX_CONTENT_CHARS = int(os.getenv("MAX_CONTENT_CHARS", "50000"))
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))  # 10 MB limit

AI_PROVIDER = os.getenv("AI_PROVIDER", "mock").lower()
AI_PROVIDER_API_KEY = os.getenv("AI_PROVIDER_API_KEY") or os.getenv("GEMINI_API_KEY") or ""
AI_MODEL_NAME = os.getenv("AI_MODEL_NAME", "gemini-2.5-flash")
AI_TIMEOUT_SECONDS = float(os.getenv("AI_TIMEOUT_SECONDS", "8.0"))
