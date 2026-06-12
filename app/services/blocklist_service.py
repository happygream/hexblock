"""
HexBlock blocklist service.
Handles fetching, parsing (hosts format + plain domain lists),
writing dnsmasq host files, and signalling dnsmasq to reload.
"""

import asyncio
import logging
import os
import re
import subprocess
from pathlib import Path

import aiosqlite
import httpx

from config import settings

logger = logging.getLogger("hexblock.blocklists")

HOSTS_DIR = Path(settings.blocklist_dir)
DNSMASQ_OUTPUT = Path(settings.dnsmasq_hosts_file)


class BlocklistService:

    # ── Fetch & parse ────────────────────────────────────────

    @staticmethod
    def parse_hosts_content(text: str) -> list[str]:
        """
        Parse a hosts file or plain domain list.
        Handles:
          - 0.0.0.0 domain.com
          - 127.0.0.1 domain.com
          - plain domain.com lines
          - # comments
        """
        domains = []
        for line in text.splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            # AdGuard format: ||domain^
            if line.startswith('||') and line.endswith('^'):
                d = line[2:-1].lower()
                if d and '/' not in d:
                    domains.append(d)
                continue
            # dnsmasq format: address=/domain/0.0.0.0
            m = re.match(r'^address=/([^/]+)/', line)
            if m:
                d = m.group(1).lower()
                if d:
                    domains.append(d)
                continue
            # hosts format
            m = re.match(r'^(?:0\.0\.0\.0|127\.0\.0\.1)\s+(\S+)', line)
            if m:
                d = m.group(1).lower()
                if d not in ("localhost", "0.0.0.0", "broadcasthost", "local"):
                    domains.append(d)
                continue
            # plain domain
            if re.match(r'^[a-zA-Z0-9][a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}$', line):
                domains.append(line.lower())
                continue
            # plain IP address — block directly
            if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', line):
                domains.append(line)

        # deduplicate preserving order
        seen = set()
        result = []
        for d in domains:
            if d not in seen:
                seen.add(d)
                result.append(d)
        return result

    @staticmethod
    async def fetch_url(url: str) -> str:
        """Fetch a blocklist from a URL with a generous timeout."""
        async with httpx.AsyncClient(follow_redirects=True, timeout=60.0) as client:
            r = await client.get(url)
            r.raise_for_status()
            return r.text

    @staticmethod
    async def save_blocklist_file(bl_id: int, domains: list[str]):
        """Write parsed domains to a per-list file in the blocklist dir."""
        HOSTS_DIR.mkdir(parents=True, exist_ok=True)
        path = HOSTS_DIR / f"list_{bl_id}.txt"
        path.write_text("\n".join(domains))

    @staticmethod
    async def load_blocklist_file(bl_id: int) -> list[str]:
        path = HOSTS_DIR / f"list_{bl_id}.txt"
        if not path.exists():
            return []
        return path.read_text().splitlines()

    # ── Blocklist CRUD ───────────────────────────────────────

    @staticmethod
    async def add(name: str, category: str, source_url: str = None,
                  source_type: str = "url", content: str = None) -> int:
        """Add a new blocklist record. If content is provided, parse immediately."""
        domains = []
        if content:
            domains = BlocklistService.parse_hosts_content(content)
        elif source_url:
            try:
                raw = await BlocklistService.fetch_url(source_url)
                domains = BlocklistService.parse_hosts_content(raw)
            except Exception as e:
                logger.warning("Failed to fetch %s: %s", source_url, e)

        async with aiosqlite.connect(settings.db_path) as db:
            cur = await db.execute(
                """INSERT INTO blocklists (name, category, source_url, source_type, domain_count, last_updated)
                   VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))""",
                (name, category, source_url, source_type, len(domains)),
            )
            bl_id = cur.lastrowid
            await db.commit()

        if domains:
            await BlocklistService.save_blocklist_file(bl_id, domains)

        await BlocklistService.apply_all_active()
        return bl_id

    @staticmethod
    async def toggle(bl_id: int, enabled: bool):
        async with aiosqlite.connect(settings.db_path) as db:
            await db.execute(
                "UPDATE blocklists SET enabled = ? WHERE id = ?",
                (1 if enabled else 0, bl_id),
            )
            await db.commit()
        await BlocklistService.apply_all_active()

    @staticmethod
    async def edit(bl_id: int, name: str, url: str, category: str):
        """Update blocklist name, URL and category."""
        async with aiosqlite.connect(settings.db_path) as db:
            await db.execute(
                "UPDATE blocklists SET name = ?, source_url = ?, category = ? WHERE id = ?",
                (name, url, category, bl_id)
            )
            await db.commit()

    @staticmethod
    async def delete(bl_id: int):
        async with aiosqlite.connect(settings.db_path) as db:
            await db.execute("DELETE FROM blocklists WHERE id = ?", (bl_id,))
            await db.commit()
        path = HOSTS_DIR / f"list_{bl_id}.txt"
        if path.exists():
            path.unlink()
        import asyncio, concurrent.futures
        loop = asyncio.get_event_loop()
        loop.run_in_executor(None, lambda: asyncio.run(BlocklistService.apply_all_active()))

    @staticmethod
    async def update_all():
        """Re-fetch all URL-based blocklists. Called by scheduler."""
        async with aiosqlite.connect(settings.db_path) as db:
            cur = await db.execute(
                "SELECT id, source_url FROM blocklists WHERE source_type = 'url' AND source_url IS NOT NULL"
            )
            rows = await cur.fetchall()

        for row in rows:
            bl_id, url = row[0], row[1]
            try:
                raw     = await BlocklistService.fetch_url(url)
                domains = BlocklistService.parse_hosts_content(raw)
                await BlocklistService.save_blocklist_file(bl_id, domains)
                async with aiosqlite.connect(settings.db_path) as db:
                    await db.execute(
                        "UPDATE blocklists SET domain_count = ?, last_updated = datetime('now', 'localtime') WHERE id = ?",
                        (len(domains), bl_id),
                    )
                    await db.commit()
                logger.info("Updated blocklist %d — %d domains", bl_id, len(domains))
            except Exception as e:
                logger.error("Failed to update blocklist %d: %s", bl_id, e)

        await BlocklistService.apply_all_active()

    # ── Apply to dnsmasq ─────────────────────────────────────

    @staticmethod
    async def apply_all_active():
        """
        Merge all enabled blocklists and custom deny rules into a single
        dnsmasq hosts file, then signal dnsmasq to reload.
        """
        # Collect all enabled list IDs
        async with aiosqlite.connect(settings.db_path) as db:
            cur = await db.execute(
                "SELECT id FROM blocklists WHERE enabled = 1"
            )
            rows = await cur.fetchall()
            bl_ids = [r[0] for r in rows]

            # Custom deny rules
            cur2 = await db.execute(
                "SELECT domain FROM rules WHERE rule_type = 'deny'"
            )
            deny_rows = await cur2.fetchall()
            deny_domains = [r[0] for r in deny_rows]

        # Fetch allow rules
        async with aiosqlite.connect(settings.db_path) as db:
            cur3 = await db.execute(
                "SELECT domain FROM rules WHERE rule_type = 'allow'"
            )
            allow_rows = await cur3.fetchall()
            allow_domains = {r[0] for r in allow_rows}

        # Merge all domains
        all_domains: set[str] = set()
        for bl_id in bl_ids:
            doms = await BlocklistService.load_blocklist_file(bl_id)
            all_domains.update(doms)
        all_domains.update(deny_domains)

        # Remove allowed domains and their subdomains
        all_domains = {d for d in all_domains if not any(d == a or d.endswith('.' + a) for a in allow_domains)}

        # Write dnsmasq-format hosts file
        DNSMASQ_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        lines = [f"address=/{d}/#" for d in all_domains]
        DNSMASQ_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        with DNSMASQ_OUTPUT.open('w') as fh:
            fh.write("# HexBlock — generated file, do not edit manually\n")
            fh.writelines(l + "\n" for l in lines)

        logger.info(
            "Applied %d blocked domains to dnsmasq (%d lists)",
            len(all_domains), len(bl_ids),
        )

        # Reload dnsmasq
        BlocklistService._reload_dnsmasq()

    @staticmethod
    def _reload_dnsmasq():
        try:
            subprocess.run(
                settings.dnsmasq_reload_cmd.split(),
                capture_output=True, timeout=5,
            )
            logger.info("dnsmasq reloaded")
        except Exception as e:
            logger.warning("dnsmasq reload failed: %s", e)
