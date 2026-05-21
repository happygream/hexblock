"""
HexBlock authentication service.
Handles setup detection, password hashing, session management,
brute-force lockout, and TOTP.
"""

import secrets
import logging
from datetime import datetime, timedelta, timezone

import aiosqlite
import pyotp
from passlib.context import CryptContext

from config import settings

logger = logging.getLogger("hexblock.auth")

pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__memory_cost=65536,
    argon2__time_cost=3,
    argon2__parallelism=2,
)


class AuthService:

    # ── Setup ────────────────────────────────────────────────

    @staticmethod
    async def is_setup_complete() -> bool:
        async with aiosqlite.connect(settings.db_path) as db:
            cur = await db.execute(
                "SELECT value FROM settings WHERE key = 'setup_complete'"
            )
            row = await cur.fetchone()
            return row is not None and row[0] == "1"

    @staticmethod
    async def complete_setup(
        username: str,
        password: str,
        hostname: str,
        upstream_dns: str,
        timezone: str,
        vpn_mode: str,
    ):
        hash_ = pwd_context.hash(password)
        secret_key = secrets.token_hex(32)

        async with aiosqlite.connect(settings.db_path) as db:
            await db.execute(
                "INSERT OR REPLACE INTO account (id, username, password_hash) VALUES (1, ?, ?)",
                (username, hash_),
            )
            for k, v in [
                ("setup_complete", "1"),
                ("hostname",       hostname),
                ("upstream_dns",   upstream_dns),
                ("timezone",       timezone),
                ("vpn_mode",       vpn_mode),
                ("secret_key",     secret_key),
                ("auto_update",    "1"),
                ("log_queries",    "1"),
                ("log_retention_days", "7"),
                ("safe_search",    "0"),
                ("dns_over_https", "1"),
                ("session_timeout", str(settings.session_lifetime)),
            ]:
                await db.execute(
                    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                    (k, v),
                )
            await db.commit()

        await AuthService._audit("Setup completed", f"username={username}")
        logger.info("Setup completed for user: %s", username)

    # ── Login ────────────────────────────────────────────────

    @staticmethod
    async def check_lockout(ip: str) -> tuple[bool, int]:
        """Returns (is_locked_out, attempts_remaining)."""
        window = datetime.now(timezone.utc) - timedelta(seconds=settings.lockout_seconds)
        async with aiosqlite.connect(settings.db_path) as db:
            cur = await db.execute(
                """SELECT COUNT(*) FROM login_attempts
                   WHERE ip_address = ? AND success = 0
                   AND attempted_at > ?""",
                (ip, window.isoformat()),
            )
            row = await cur.fetchone()
            count = row[0]

        if count >= settings.max_login_attempts:
            return True, 0
        return False, settings.max_login_attempts - count

    @staticmethod
    async def verify_credentials(username: str, password: str) -> bool:
        async with aiosqlite.connect(settings.db_path) as db:
            cur = await db.execute(
                "SELECT password_hash FROM account WHERE id = 1 AND username = ?",
                (username,),
            )
            row = await cur.fetchone()
        if not row:
            return False
        return pwd_context.verify(password, row[0])

    @staticmethod
    async def record_attempt(ip: str, success: bool):
        async with aiosqlite.connect(settings.db_path) as db:
            await db.execute(
                "INSERT INTO login_attempts (ip_address, success) VALUES (?, ?)",
                (ip, 1 if success else 0),
            )
            await db.commit()

    # ── Sessions ─────────────────────────────────────────────

    @staticmethod
    async def create_session(ip: str) -> str:
        token = secrets.token_urlsafe(48)
        async with aiosqlite.connect(settings.db_path) as db:
            # get session timeout from settings
            cur = await db.execute(
                "SELECT value FROM settings WHERE key = 'session_timeout'"
            )
            row = await cur.fetchone()
            timeout = int(row[0]) if row else settings.session_lifetime
            expires = datetime.now(timezone.utc) + timedelta(seconds=timeout)

            await db.execute(
                """INSERT INTO sessions (token, expires_at, ip_address)
                   VALUES (?, ?, ?)""",
                (token, expires.isoformat(), ip),
            )
            await db.execute(
                "UPDATE account SET last_login = datetime('now') WHERE id = 1"
            )
            await db.commit()

        await AuthService._audit("Login", f"ip={ip}")
        return token

    @staticmethod
    async def validate_session(token: str) -> bool:
        if not token:
            return False
        async with aiosqlite.connect(settings.db_path) as db:
            cur = await db.execute(
                """SELECT expires_at FROM sessions
                   WHERE token = ? AND expires_at > datetime('now')""",
                (token,),
            )
            row = await cur.fetchone()
        return row is not None

    @staticmethod
    async def destroy_session(token: str):
        async with aiosqlite.connect(settings.db_path) as db:
            await db.execute("DELETE FROM sessions WHERE token = ?", (token,))
            await db.commit()
        await AuthService._audit("Logout")

    @staticmethod
    async def purge_expired_sessions():
        async with aiosqlite.connect(settings.db_path) as db:
            await db.execute(
                "DELETE FROM sessions WHERE expires_at <= datetime('now')"
            )
            await db.commit()

    # ── TOTP ─────────────────────────────────────────────────

    @staticmethod
    async def generate_totp_secret() -> tuple[str, str]:
        """Returns (secret, provisioning_uri)."""
        async with aiosqlite.connect(settings.db_path) as db:
            cur = await db.execute(
                "SELECT username FROM account WHERE id = 1"
            )
            row = await cur.fetchone()
            username = row[0] if row else "admin"

        secret = pyotp.random_base32()
        totp   = pyotp.TOTP(secret)
        uri    = totp.provisioning_uri(name=username, issuer_name="HexBlock")
        return secret, uri

    @staticmethod
    async def enable_totp(secret: str, code: str) -> bool:
        totp = pyotp.TOTP(secret)
        if not totp.verify(code, valid_window=1):
            return False
        async with aiosqlite.connect(settings.db_path) as db:
            await db.execute(
                "UPDATE account SET totp_secret = ?, totp_enabled = 1 WHERE id = 1",
                (secret,),
            )
            await db.commit()
        await AuthService._audit("2FA enabled")
        return True

    @staticmethod
    async def verify_totp(code: str) -> bool:
        async with aiosqlite.connect(settings.db_path) as db:
            cur = await db.execute(
                "SELECT totp_secret, totp_enabled FROM account WHERE id = 1"
            )
            row = await cur.fetchone()
        if not row or not row[1]:
            return True  # TOTP not enabled — pass through
        totp = pyotp.TOTP(row[0])
        return totp.verify(code, valid_window=1)

    # ── Password change ───────────────────────────────────────

    @staticmethod
    async def change_password(current: str, new: str) -> bool:
        async with aiosqlite.connect(settings.db_path) as db:
            cur = await db.execute(
                "SELECT password_hash FROM account WHERE id = 1"
            )
            row = await cur.fetchone()
        if not row or not pwd_context.verify(current, row[0]):
            return False
        new_hash = pwd_context.hash(new)
        async with aiosqlite.connect(settings.db_path) as db:
            await db.execute(
                "UPDATE account SET password_hash = ? WHERE id = 1",
                (new_hash,),
            )
            await db.commit()
        await AuthService._audit("Password changed")
        return True

    # ── Audit ─────────────────────────────────────────────────

    @staticmethod
    async def _audit(action: str, detail: str = None, ip: str = None):
        try:
            async with aiosqlite.connect(settings.db_path) as db:
                await db.execute(
                    "INSERT INTO audit_log (action, detail, ip_address) VALUES (?, ?, ?)",
                    (action, detail, ip),
                )
                await db.commit()
        except Exception:
            pass
