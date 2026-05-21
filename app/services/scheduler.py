"""
HexBlock background scheduler.
Runs daily blocklist updates and session cleanup.
"""

import asyncio
import logging
import threading

import schedule
import time

from config import settings

logger = logging.getLogger("hexblock.scheduler")


def _run_async(coro):
    asyncio.run(coro)


async def _prune_query_log():
    """Delete query log entries older than the configured retention period."""
    import aiosqlite
    from database import DB
    async with aiosqlite.connect(DB) as db:
        cur = await db.execute(
            "SELECT value FROM settings WHERE key = 'log_retention_days'"
        )
        row = await cur.fetchone()
        days = int(row[0]) if row else 7
        result = await db.execute(
            """DELETE FROM query_log
               WHERE logged_at < datetime('now', ? || ' days')""",
            (f'-{days}',),
        )
        await db.commit()
        logger.info("Query log pruned — deleted %d entries older than %d days",
                    result.rowcount, days)


def _schedule_jobs():
    from services.blocklist_service import BlocklistService
    from services.auth_service import AuthService

    schedule.every().day.at(
        f"{settings.auto_update_hour:02d}:00"
    ).do(lambda: _run_async(BlocklistService.update_all()))

    schedule.every().day.at("04:00").do(
        lambda: _run_async(_prune_query_log())
    )

    schedule.every(1).hours.do(
        lambda: _run_async(AuthService.purge_expired_sessions())
    )

    logger.info(
        "Scheduler started — blocklist updates at %02d:00, log pruning at 04:00",
        settings.auto_update_hour,
    )

    while True:
        schedule.run_pending()
        time.sleep(60)


def start_scheduler():
    t = threading.Thread(target=_schedule_jobs, daemon=True)
    t.start()
