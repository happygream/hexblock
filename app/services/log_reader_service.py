"""
HexBlock DNS log reader.
Tails /var/log/dnsmasq.log on the host (mounted into the container)
and writes query and block events to the query_log table in SQLite.
"""

import asyncio
import fcntl
import logging
import os
import re
import threading
import time

import aiosqlite

from database import DB

logger = logging.getLogger("hexblock.log_reader")

LOG_FILE = "/var/log/dnsmasq.log"

_QUERY_RE      = re.compile(r"query\[([A-Z]+)\]\s+(\S+)\s+from\s+([\d\.a-fA-F:]+)")
_BLOCK_RE      = re.compile(r"config\s+(\S+)\s+is\s+(?:0\.0\.0\.0|NXDOMAIN|::)")
_FORWARD_RE    = re.compile(r"forwarded\s+(\S+)\s+to\s+")


def _run_async(coro):
    from services.event_bus import _main_loop
    if _main_loop and _main_loop.is_running():
        asyncio.run_coroutine_threadsafe(coro, _main_loop)
    else:
        asyncio.run(coro)


async def _insert(domain: str, qtype: str, client_ip: str,
                  action: str, blocklist=None):
    from datetime import datetime
    logged_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        async with aiosqlite.connect(DB) as db:
            await db.execute(
                """INSERT INTO query_log
                   (domain, query_type, client_ip, action, blocklist, logged_at)
                   VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))""",
                (domain, qtype, client_ip, action, blocklist),
            )
            await db.commit()
    except Exception as exc:
        logger.debug("DB insert error: %s", exc)
    try:
        from services.event_bus import publish
        publish({
            "domain": domain,
            "query_type": qtype,
            "client_ip": client_ip,
            "action": action,
            "blocklist": blocklist,
            "logged_at": logged_at,
        })
    except Exception as exc:
        logger.debug("Event bus publish error: %s", exc)


async def _upsert_device(client_ip: str):
    try:
        async with aiosqlite.connect(DB) as db:
            cur = await db.execute(
                "SELECT id FROM devices WHERE ip_address = ?", (client_ip,)
            )
            row = await cur.fetchone()
            if row:
                await db.execute(
                    "UPDATE devices SET last_seen = datetime('now', 'localtime') WHERE ip_address = ?",
                    (client_ip,)
                )
            else:
                hostname = await _resolve_hostname(client_ip)
                await db.execute(
                    """INSERT OR IGNORE INTO devices (name, ip_address, last_seen)
                       VALUES (?, ?, datetime('now', 'localtime'))""",
                    (hostname, client_ip)
                )
            await db.commit()
    except Exception as exc:
        logger.debug("Device upsert error: %s", exc)


async def _resolve_hostname(ip: str) -> str:
    try:
        import dns.resolver
        import dns.reversename
        rev = dns.reversename.from_address(ip)
        resolver = dns.resolver.Resolver()
        resolver.nameservers = ["192.168.1.1"]
        answer = resolver.resolve(rev, "PTR")
        host = str(answer[0]).rstrip(".")
        return host.replace(".localdomain", "").replace(".local", "")
    except Exception:
        try:
            import socket
            host = await asyncio.get_event_loop().run_in_executor(
                None, lambda: socket.gethostbyaddr(ip)[0]
            )
            return host.replace(".localdomain", "").replace(".local", "")
        except Exception:
            return ip


def _tail_log_file():
    # Wait for log file to exist
    for _ in range(30):
        if os.path.exists(LOG_FILE):
            break
        logger.info("Waiting for %s...", LOG_FILE)
        time.sleep(2)

    if not os.path.exists(LOG_FILE):
        logger.error("Log file %s not found — log reader giving up", LOG_FILE)
        return

    logger.info("DNS log reader tailing %s", LOG_FILE)
    pending: dict = {}
    recent: dict = {}  # domain:client_ip -> timestamp for dedup

    with open(LOG_FILE, "r") as f:
        # Seek to end so we only process new lines
        f.seek(0, 2)

        while True:
            line = f.readline()
            if not line:
                time.sleep(0.1)
                # Handle log rotation
                try:
                    if os.stat(LOG_FILE).st_ino != os.fstat(f.fileno()).st_ino:
                        f = open(LOG_FILE, "r")
                except Exception:
                    pass
                continue

            line = line.strip()

            # Skip localhost health checks
            if "127.0.0.1" in line or "health.check" in line:
                continue

            m = _QUERY_RE.search(line)
            if m:
                qtype, domain, client_ip = m.group(1), m.group(2), m.group(3)
                pending[domain] = (qtype, client_ip)
                continue

            m = _BLOCK_RE.search(line)
            if m:
                domain = m.group(1)
                qtype, client_ip = pending.pop(domain, ("A", "unknown"))
                _run_async(_insert(domain, qtype, client_ip, "blocked", "hexblock.hosts"))
                _run_async(_upsert_device(client_ip))
                continue

            m = _FORWARD_RE.search(line)
            if m:
                domain = m.group(1)
                if domain in pending:
                    qtype, client_ip = pending.pop(domain)
                    _run_async(_insert(domain, qtype, client_ip, "allowed", None))
                    _run_async(_upsert_device(client_ip))

            if len(pending) > 5000:
                for k in list(pending.keys())[:1000]:
                    del pending[k]


def start_log_reader():
    lockfile = "/tmp/hexblock-log-reader.lock"
    try:
        fd = open(lockfile, "w")
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        logger.info("DNS log reader already running in another worker, skipping")
        return
    t = threading.Thread(target=_tail_log_file, daemon=True, name="dns-log-reader")
    t.start()
    logger.info("DNS log reader thread started")
