"""
HexBlock database — SQLite via aiosqlite.
All schema creation lives here.
"""

import aiosqlite
import logging
from config import settings

logger = logging.getLogger("hexblock.db")

DB = settings.db_path


async def get_db() -> aiosqlite.Connection:
    """Dependency — yields an open db connection."""
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("PRAGMA foreign_keys=ON")
        await db.execute("PRAGMA synchronous=NORMAL")
        await db.execute("PRAGMA cache_size=-32000")
        await db.execute("PRAGMA temp_store=MEMORY")
        await db.execute("PRAGMA mmap_size=268435456")
        yield db


async def init_db():
    """Create all tables if they do not exist."""
    logger.info("Initialising database at %s", DB)
    async with aiosqlite.connect(DB) as db:
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("PRAGMA foreign_keys=ON")
        await db.execute("PRAGMA synchronous=NORMAL")
        await db.execute("PRAGMA cache_size=-32000")
        await db.execute("PRAGMA temp_store=MEMORY")
        await db.execute("PRAGMA mmap_size=268435456")

        # ── Settings / setup state ──────────────────────────
        await db.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)

        # ── User account (single user) ──────────────────────
        await db.execute("""
            CREATE TABLE IF NOT EXISTS account (
                id              INTEGER PRIMARY KEY CHECK (id = 1),
                username        TEXT NOT NULL,
                password_hash   TEXT NOT NULL,
                totp_secret     TEXT,
                totp_enabled    INTEGER NOT NULL DEFAULT 0,
                created_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                last_login      TEXT
            )
        """)

        # ── Sessions ────────────────────────────────────────
        await db.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                token       TEXT PRIMARY KEY,
                created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                expires_at  TEXT NOT NULL,
                ip_address  TEXT
            )
        """)

        # ── Login attempts (brute force tracking) ───────────
        await db.execute("""
            CREATE TABLE IF NOT EXISTS login_attempts (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                ip_address  TEXT NOT NULL,
                attempted_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                success     INTEGER NOT NULL DEFAULT 0
            )
        """)

        # ── Blocklists ───────────────────────────────────────
        await db.execute("""
            CREATE TABLE IF NOT EXISTS blocklists (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                name        TEXT NOT NULL,
                category    TEXT NOT NULL,
                source_url  TEXT,
                source_type TEXT NOT NULL DEFAULT 'url',
                domain_count INTEGER NOT NULL DEFAULT 0,
                enabled     INTEGER NOT NULL DEFAULT 1,
                last_updated TEXT,
                created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            )
        """)

        # ── Custom rules (per-domain allow/deny) ────────────
        await db.execute("""
            CREATE TABLE IF NOT EXISTS rules (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                domain      TEXT NOT NULL UNIQUE,
                rule_type   TEXT NOT NULL CHECK (rule_type IN ('allow', 'deny')),
                note        TEXT,
                created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            )
        """)

        # ── Devices ─────────────────────────────────────────
        await db.execute("""
            CREATE TABLE IF NOT EXISTS devices (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                name        TEXT NOT NULL,
                ip_address  TEXT,
                mac_address TEXT,
                wg_public_key TEXT,
                wg_assigned_ip TEXT,
                created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                last_seen   TEXT
            )
        """)

        # ── Query log ────────────────────────────────────────
        await db.execute("""
            CREATE TABLE IF NOT EXISTS query_log (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                domain      TEXT NOT NULL,
                query_type  TEXT NOT NULL DEFAULT 'A',
                client_ip   TEXT,
                device_name TEXT,
                action      TEXT NOT NULL CHECK (action IN ('allowed', 'blocked')),
                blocklist   TEXT,
                logged_at   TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            )
        """)
        await db.execute("CREATE INDEX IF NOT EXISTS idx_query_log_time ON query_log(logged_at)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_query_log_action ON query_log(action)")

        # ── Audit log ────────────────────────────────────────
        await db.execute("""
            CREATE TABLE IF NOT EXISTS audit_log (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                action      TEXT NOT NULL,
                detail      TEXT,
                ip_address  TEXT,
                logged_at   TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            )
        """)

        await db.commit()
        logger.info("Database initialised")
