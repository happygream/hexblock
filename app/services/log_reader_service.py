"""
HexBlock DNS log reader.
Tails the hexblock-dns Docker container logs via the Docker SDK
and writes query and block events to the query_log table in SQLite.
"""

import asyncio
import fcntl
import logging
import re
import threading

import aiosqlite
import docker

from database import DB

logger = logging.getLogger("hexblock.log_reader")

_QUERY_RE      = re.compile(r"query\[([A-Z]+)\]\s+(\S+)\s+from\s+([\d\.a-fA-F:]+)")
_BLOCK_ADDR_RE = re.compile(r"config\s+(\S+)\s+is\s+(?:0\.0\.0\.0|NXDOMAIN|::)")
_BLOCK_RE      = re.compile(r"(/etc/dnsmasq\.d/\S+)\s+(\S+)\s+is\s+0\.0\.0\.0")


def _run_async(coro):
    asyncio.run(coro)


async def _resolve_hostname(ip: str) -> str:
    """Attempt reverse DNS lookup via router, fall back to IP."""
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


async def _upsert_device(client_ip: str):
    """Auto-register or update last_seen for a device by IP."""
    try:
        async with aiosqlite.connect(DB) as db:
            cur = await db.execute(
                "SELECT id, name FROM devices WHERE ip_address = ?", (client_ip,)
            )
            row = await cur.fetchone()
            if row:
                await db.execute(
                    "UPDATE devices SET last_seen = datetime('now') WHERE ip_address = ?",
                    (client_ip,)
                )
            else:
                hostname = await _resolve_hostname(client_ip)
                await db.execute(
                    """INSERT OR IGNORE INTO devices (name, ip_address, last_seen)
                       VALUES (?, ?, datetime('now'))""",
                    (hostname, client_ip)
                )
            await db.commit()
    except Exception as exc:
        logger.debug("Device upsert error: %s", exc)


async def _insert(domain: str, qtype: str, client_ip: str,
                  action: str, blocklist=None):
    from datetime import datetime, timezone
    logged_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    try:
        async with aiosqlite.connect(DB) as db:
            await db.execute(
                """INSERT INTO query_log
                   (domain, query_type, client_ip, action, blocklist, logged_at)
                   VALUES (?, ?, ?, ?, ?, datetime('now'))""",
                (domain, qtype, client_ip, action, blocklist),
            )
            await db.commit()
    except Exception as exc:
        logger.debug("DB insert error: %s", exc)
    await _upsert_device(client_ip)
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


def _tail_dns_logs():
    try:
        client = docker.from_env()
    except Exception as exc:
        logger.error("Cannot connect to Docker daemon: %s", exc)
        return

    container = None
    for attempt in range(12):
        try:
            container = client.containers.get("hexblock-dns")
            break
        except docker.errors.NotFound:
            logger.warning("hexblock-dns not found, retry %d/12", attempt + 1)
            import time; time.sleep(5)

    if container is None:
        logger.error("hexblock-dns never appeared — log reader giving up")
        return

    logger.info("DNS log reader attached to hexblock-dns")
    pending: dict = {}

    for raw in container.logs(stream=True, follow=True, tail=0):
        try:
            line = raw.decode("utf-8", errors="replace").strip()
        except Exception:
            continue

        m = _QUERY_RE.search(line)
        if m:
            qtype, domain, client_ip = m.group(1), m.group(2), m.group(3)
            # Skip health check queries from localhost
            if domain == "health.check" or client_ip == "127.0.0.1":
                continue
            pending[domain] = (qtype, client_ip)
            continue

        m = _BLOCK_ADDR_RE.search(line)
        if m:
            domain = m.group(1)
            qtype, client_ip = pending.pop(domain, ("A", "unknown"))
            _run_async(_insert(domain, qtype, client_ip, "blocked", "hexblock.hosts"))
            continue

        m = _BLOCK_RE.search(line)
        if m:
            bl_path, domain = m.group(1), m.group(2)
            qtype, client_ip = pending.pop(domain, ("A", "unknown"))
            _run_async(_insert(domain, qtype, client_ip, "blocked",
                               bl_path.split("/")[-1]))
            continue

        if "forwarded" in line:
            parts = line.split()
            try:
                idx = parts.index("forwarded")
                domain = parts[idx + 1]
                if domain in pending:
                    qtype, client_ip = pending.pop(domain)
                    _run_async(_insert(domain, qtype, client_ip, "allowed", None))
            except (ValueError, IndexError):
                pass

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
    t = threading.Thread(target=_tail_dns_logs, daemon=True, name="dns-log-reader")
    t.start()
    logger.info("DNS log reader thread started")
