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

# Groq Vision OCR & Content Intelligence Configuration
GROQ_ENABLED = os.getenv("GROQ_ENABLED", "false").lower() in ("true", "1", "yes")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_VISION_MODEL = os.getenv("GROQ_VISION_MODEL", "llama-3.2-11b-vision-preview").strip()
GROQ_TEXT_MODEL = os.getenv("GROQ_TEXT_MODEL", "llama-3.3-70b-versatile").strip()
GROQ_TIMEOUT_SECONDS = float(os.getenv("GROQ_TIMEOUT_SECONDS", "15.0"))
GROQ_MAX_PDF_PAGES = int(os.getenv("GROQ_MAX_PDF_PAGES", "10"))
GROQ_MAX_IMAGES_PER_REQUEST = int(os.getenv("GROQ_MAX_IMAGES_PER_REQUEST", "3"))

# Authentication & Trust Boundary Configuration
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower().strip()
AUTH_MODE = os.getenv("AUTH_MODE", "demo" if ENVIRONMENT != "production" else "production").lower().strip()
ALLOW_DEMO_AUTH = os.getenv("ALLOW_DEMO_AUTH", "true" if AUTH_MODE == "demo" else "false").lower() in ("true", "1", "yes")

API_KEY = os.getenv("BRANDTRACE_API_KEY") or os.getenv("API_KEY") or ""
ADMIN_API_KEY = os.getenv("BRANDTRACE_ADMIN_API_KEY") or os.getenv("ADMIN_API_KEY") or ""

# Demo Reset Security Configuration (Fail-closed by default on hosted/shared environments)
ALLOW_DEMO_RESET = os.getenv("ALLOW_DEMO_RESET", "true" if ENVIRONMENT == "test" else "false").lower() in ("true", "1", "yes")
DEMO_RESET_SECRET = os.getenv("DEMO_RESET_SECRET", "")

# Insecure Configuration Check: Reviewer and Admin credentials must remain independent
if API_KEY and ADMIN_API_KEY and API_KEY.strip() == ADMIN_API_KEY.strip():
    if ENVIRONMENT == "production":
        raise RuntimeError("Insecure configuration: API_KEY and ADMIN_API_KEY must not be identical in production mode.")
