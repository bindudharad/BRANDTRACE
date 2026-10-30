"""
Groq API Client Factory & Diagnostics for BRANDTRACE.

Ensures:
- Initialized only on the backend.
- Never sends API keys to the frontend or logs.
- Safe fallbacks when GROQ_API_KEY is unset or GROQ_ENABLED=false.
- Graceful handling of provider errors, timeouts, and rate limits.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from app.config import (
    GROQ_ENABLED,
    GROQ_API_KEY,
    GROQ_VISION_MODEL,
    GROQ_TEXT_MODEL,
    GROQ_TIMEOUT_SECONDS,
)

logger = logging.getLogger("brandtrace.groq")


def is_groq_configured() -> bool:
    """Return True if Groq is enabled and an API key is present."""
    return bool(GROQ_ENABLED and GROQ_API_KEY)


def get_groq_client() -> Optional[Any]:
    """
    Return an authenticated Groq client or None if unconfigured.
    Uses lazy import to ensure the application starts even in minimal environments.
    """
    if not is_groq_configured():
        return None

    try:
        from groq import Groq
        return Groq(
            api_key=GROQ_API_KEY,
            timeout=GROQ_TIMEOUT_SECONDS,
            max_retries=1,
        )
    except ImportError:
        logger.warning("The 'groq' package is not installed. Groq features will be unavailable.")
        return None
    except Exception as exc:
        logger.error(f"Failed to initialize Groq client: {exc}")
        return None


def get_groq_diagnostics() -> Dict[str, Any]:
    """
    Safe diagnostics payload. Never reveals secrets or key substrings.
    """
    configured = is_groq_configured()
    return {
        "enabled": GROQ_ENABLED,
        "configured": configured,
        "vision_model": GROQ_VISION_MODEL if configured else None,
        "text_model": GROQ_TEXT_MODEL if configured else None,
        "timeout_seconds": GROQ_TIMEOUT_SECONDS,
        "status": "CONFIGURED" if configured else "UNCONFIGURED",
    }
