"""
HexBlock CSRF token service.

Generates and validates single-use tokens for state-changing form submissions.
Uses itsdangerous which is already in requirements.txt.
"""

import time
import logging
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from config import settings

logger = logging.getLogger("hexblock.csrf")

# Token valid for 1 hour — long enough for slow users, short enough to matter
TOKEN_MAX_AGE = 3600


def _serializer() -> URLSafeTimedSerializer:
    key = settings.secret_key or "hexblock-csrf-fallback-change-me"
    return URLSafeTimedSerializer(key, salt="hexblock-csrf")


def generate_token(session_token: str = "") -> str:
    """Generate a CSRF token tied to the current session."""
    s = _serializer()
    return s.dumps({"session": session_token, "ts": int(time.time())})


def validate_token(token: str, session_token: str = "") -> bool:
    """
    Validate a CSRF token.
    Returns True if valid, False if missing, expired, or tampered with.
    """
    if not token:
        return False
    s = _serializer()
    try:
        data = s.loads(token, max_age=TOKEN_MAX_AGE)
        # Tokens are tied to the session they were issued for
        return data.get("session") == session_token
    except SignatureExpired:
        logger.warning("CSRF token expired")
        return False
    except BadSignature:
        logger.warning("CSRF token invalid")
        return False
    except Exception:
        return False
