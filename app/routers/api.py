"""
HexBlock REST API — used by the frontend JS for live data.
All endpoints require a valid session cookie.
"""

import asyncio
import json
import aiosqlite
from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse, StreamingResponse

from config import settings
from services.auth_service import AuthService
from services.blocklist_service import BlocklistService
from services.wireguard_service import WireGuardService
from models.schemas import RuleCreate, DeviceCreate, SettingsUpdate

router = APIRouter(tags=["api"])


async def require_auth(request: Request):
    token = request.cookies.get("hb_session")
    if not token or not await AuthService.validate_session(token):
        raise HTTPException(status_code=401, detail="Not authenticated")


# ── Display HTML page (no auth) ──────────────────────────────

@router.get("/display-screen", include_in_schema=False)
async def display_screen():
    from fastapi.responses import FileResponse
    import os
    path = "/opt/hexblock-display/display.html"
    if os.path.exists(path):
        return FileResponse(path, media_type="text/html")
    from fastapi.responses import HTMLResponse
    return HTMLResponse("<h1>Display file not found</h1>")


def _get_temp() -> float | None:
    try:
        with open("/sys/class/thermal/thermal_zone0/temp") as f:
            return round(int(f.read().strip()) / 1000, 1)
    except Exception:
        return None


def _get_sysinfo() -> dict:
    info = {"cpu": None, "ram": None, "uptime": None}
    try:
        import psutil
        info["cpu"] = round(psutil.cpu_percent(interval=0.1), 1)
        info["ram"] = round(psutil.virtual_memory().percent, 1)
        secs = int(psutil.boot_time())
        import time
        up = int(time.time()) - secs
        h, m = divmod(up // 60, 60)
        d, h = divmod(h, 24)
        info["uptime"] = f"{d}d {h}h {m}m" if d else f"{h}h {m}m"
    except Exception:
        pass
    return info


# ── Public display endpoint (no auth) ────────────────────────

@router.get("/display")
async def display_stats(request: Request):
    """Unauthenticated stats for the local display screen."""
    import aiosqlite as _aiosqlite
    async with _aiosqlite.connect(settings.db_path) as db:
        cur = await db.execute(
            "SELECT COUNT(*) FROM query_log WHERE logged_at >= datetime('now', 'start of day')"
        )
        queries_today = (await cur.fetchone())[0]
        cur = await db.execute(
            "SELECT COUNT(*) FROM query_log WHERE action = 'blocked' AND logged_at >= datetime('now', 'start of day')"
        )
        blocked_today = (await cur.fetchone())[0]
        cur = await db.execute("SELECT COUNT(*) FROM devices")
        devices_total = (await cur.fetchone())[0]
        cur = await db.execute("SELECT COUNT(*) FROM blocklists WHERE enabled = 1")
        active_lists = (await cur.fetchone())[0]
        cur = await db.execute(
            """SELECT domain, COUNT(*) as c FROM query_log
               WHERE action = 'blocked' AND logged_at >= date('now')
               GROUP BY domain ORDER BY c DESC LIMIT 8"""
        )
        top_blocked = [{"domain": r[0], "count": r[1]} for r in await cur.fetchall()]
        cur = await db.execute("SELECT name, ip_address, last_seen FROM devices ORDER BY last_seen DESC LIMIT 6")
        devices = [{"name": r[0], "ip_address": r[1], "last_seen": r[2]} for r in await cur.fetchall()]
    block_rate = round((blocked_today / queries_today * 100), 1) if queries_today else 0.0
    return {
        "queries_today": queries_today,
        "blocked_today": blocked_today,
        "block_rate": block_rate,
        "devices_total": devices_total,
        "active_lists": active_lists,
        "top_blocked": top_blocked,
        "devices": devices,
        "version": "1.2.0",
        "temp": _get_temp(),
        **_get_sysinfo(),
    }


# ── Public SSE stream (no auth) ───────────────────────────────

@router.get("/display/stream")
async def display_stream(request: Request):
    """Unauthenticated SSE stream for the local display screen."""
    from services.event_bus import subscribe
    import json

    async def event_generator():
        yield "data: {}\n\n"
        async for event in subscribe():
            if await request.is_disconnected():
                break
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── SSE stream ───────────────────────────────────────────────

@router.get("/stream")
async def stream_events(request: Request):
    await require_auth(request)
    from services.event_bus import subscribe

    async def event_generator():
        yield "data: {}\n\n"  # initial ping
        async for event in subscribe():
            if await request.is_disconnected():
                break
            yield f"data: {json.dumps(event)}\n\n"



    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Stats ─────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(request: Request):
    await require_auth(request)
    async with aiosqlite.connect(settings.db_path) as db:
        cur = await db.execute(
            "SELECT COUNT(*) FROM query_log WHERE logged_at >= datetime('now', 'start of day')"
        )
        queries_today = (await cur.fetchone())[0]

        cur = await db.execute(
            "SELECT COUNT(*) FROM query_log WHERE action = 'blocked' AND logged_at >= datetime('now', 'start of day')"
        )
        blocked_today = (await cur.fetchone())[0]

        cur = await db.execute("SELECT COUNT(*) FROM devices")
        devices_total = (await cur.fetchone())[0]

        cur = await db.execute(
            "SELECT COUNT(*) FROM blocklists WHERE enabled = 1"
        )
        active_lists = (await cur.fetchone())[0]

        cur = await db.execute(
            """SELECT domain, COUNT(*) as c FROM query_log
               WHERE action = 'blocked' AND logged_at >= date('now')
               GROUP BY domain ORDER BY c DESC LIMIT 5"""
        )
        top_blocked = [{"domain": r[0], "count": r[1]} for r in await cur.fetchall()]

    block_rate = round((blocked_today / queries_today * 100), 1) if queries_today else 0.0

    return {
        "queries_today":  queries_today,
        "blocked_today":  blocked_today,
        "block_rate":     block_rate,
        "devices_total":  devices_total,
        "active_lists":   active_lists,
        "top_blocked":    top_blocked,
    }


# ── Query log ─────────────────────────────────────────────────

@router.get("/log")
async def get_log(request: Request, limit: int = 50, filter: str = "all"):
    await require_auth(request)
    async with aiosqlite.connect(settings.db_path) as db:
        db.row_factory = aiosqlite.Row
        if filter == "blocked":
            cur = await db.execute(
                "SELECT * FROM query_log WHERE action = 'blocked' ORDER BY logged_at DESC LIMIT ?",
                (limit,),
            )
        elif filter == "allowed":
            cur = await db.execute(
                "SELECT * FROM query_log WHERE action = 'allowed' ORDER BY logged_at DESC LIMIT ?",
                (limit,),
            )
        else:
            cur = await db.execute(
                "SELECT * FROM query_log ORDER BY logged_at DESC LIMIT ?",
                (limit,),
            )
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


# ── Blocklists ─────────────────────────────────────────────────

@router.get("/blocklists")
async def list_blocklists(request: Request):
    await require_auth(request)
    async with aiosqlite.connect(settings.db_path) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT * FROM blocklists ORDER BY created_at")
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.post("/blocklists")
async def add_blocklist(
    request: Request,
    name:       str = Form(...),
    category:   str = Form(...),
    source_url: str = Form(None),
):
    await require_auth(request)
    import asyncio
    # Insert record immediately with 0 domains, fetch in background
    async with aiosqlite.connect(settings.db_path) as db:
        cur = await db.execute(
            """INSERT INTO blocklists (name, category, source_url, source_type, domain_count, last_updated)
               VALUES (?, ?, ?, ?, 0, datetime('now', 'localtime'))""",
            (name, category, source_url, "url"),
        )
        bl_id = cur.lastrowid
        await db.commit()
    async def _fetch_in_bg(bid, url):
        try:
            raw = await BlocklistService.fetch_url(url)
            domains = BlocklistService.parse_hosts_content(raw)
            await BlocklistService.save_blocklist_file(bid, domains)
            async with aiosqlite.connect(settings.db_path) as db:
                await db.execute(
                    "UPDATE blocklists SET domain_count = ?, last_updated = datetime('now', 'localtime') WHERE id = ?",
                    (len(domains), bid),
                )
                await db.commit()
            asyncio.create_task(BlocklistService.apply_all_active())
        except Exception as e:
            import logging
            logging.getLogger("hexblock.blocklists").error("Background fetch failed: %s", e)
    if source_url:
        # Quick reachability check before adding
        try:
            async with aiosqlite.connect(settings.db_path) as db:
                pass  # db is fine
            import httpx as _httpx
            async with _httpx.AsyncClient(timeout=10.0) as client:
                r = await client.head(source_url, follow_redirects=True)
                if r.status_code >= 400:
                    # Remove the record we just inserted
                    async with aiosqlite.connect(settings.db_path) as db:
                        await db.execute("DELETE FROM blocklists WHERE id = ?", (bl_id,))
                        await db.commit()
                    raise HTTPException(status_code=400, detail=f"URL returned {r.status_code} — check the URL is correct")
        except HTTPException:
            raise
        except Exception as e:
            # Remove the record and return error
            async with aiosqlite.connect(settings.db_path) as db:
                await db.execute("DELETE FROM blocklists WHERE id = ?", (bl_id,))
                await db.commit()
            raise HTTPException(status_code=400, detail=f"Cannot reach URL: {e}")
        asyncio.create_task(_fetch_in_bg(bl_id, source_url))
    return {"id": bl_id, "status": "added"}


@router.post("/blocklists/upload")
async def upload_blocklist(
    request: Request,
    name:     str        = Form(...),
    category: str        = Form(...),
    file:     UploadFile = File(...),
):
    await require_auth(request)
    import asyncio
    raw_content = (await file.read()).decode("utf-8", errors="ignore")
    async with aiosqlite.connect(settings.db_path) as db:
        cur = await db.execute(
            """INSERT INTO blocklists (name, category, source_url, source_type, domain_count, last_updated)
               VALUES (?, ?, ?, ?, 0, datetime('now', 'localtime'))""",
            (name, category, None, "file"),
        )
        bl_id = cur.lastrowid
        await db.commit()
    async def _parse_in_bg(bid, text):
        try:
            domains = BlocklistService.parse_hosts_content(text)
            await BlocklistService.save_blocklist_file(bid, domains)
            async with aiosqlite.connect(settings.db_path) as db:
                await db.execute(
                    "UPDATE blocklists SET domain_count = ?, last_updated = datetime('now', 'localtime') WHERE id = ?",
                    (len(domains), bid),
                )
                await db.commit()
            asyncio.create_task(BlocklistService.apply_all_active())
        except Exception as e:
            import logging
            logging.getLogger("hexblock.blocklists").error("Background parse failed: %s", e)
    asyncio.create_task(_parse_in_bg(bl_id, raw_content))
    return {"id": bl_id, "status": "uploaded"}


@router.patch("/blocklists/{bl_id}")
async def toggle_blocklist(request: Request, bl_id: int, enabled: bool):
    await require_auth(request)
    await BlocklistService.toggle(bl_id, enabled)
    return {"status": "updated"}


@router.delete("/blocklists/{bl_id}")
async def delete_blocklist(request: Request, bl_id: int):
    await require_auth(request)
    await BlocklistService.delete(bl_id)
    return {"status": "deleted"}


@router.put("/blocklists/{bl_id}")
async def edit_blocklist(request: Request, bl_id: int):
    await require_auth(request)
    body = await request.json()
    name     = body.get("name", "").strip()
    url      = body.get("url", "").strip()
    category = body.get("category", "CUSTOM").strip().upper()
    if not name:
        from fastapi.responses import JSONResponse
        return JSONResponse({"error": "Name required"}, status_code=400)
    await BlocklistService.edit(bl_id, name, url, category)
    return {"status": "updated"}

@router.post("/blocklists/sync")
async def sync_blocklists(request: Request):
    await require_auth(request)
    await BlocklistService.update_all()
    return {"status": "synced"}


# ── Rules ──────────────────────────────────────────────────────

@router.get("/rules")
async def list_rules(request: Request):
    await require_auth(request)
    async with aiosqlite.connect(settings.db_path) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT * FROM rules ORDER BY created_at DESC")
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.post("/rules")
async def add_rule(request: Request, rule: RuleCreate):
    await require_auth(request)
    async with aiosqlite.connect(settings.db_path) as db:
        cur = await db.execute(
            "INSERT INTO rules (domain, rule_type, note) VALUES (?, ?, ?)",
            (rule.domain, rule.rule_type, rule.note),
        )
        rule_id = cur.lastrowid
        await db.commit()
    asyncio.create_task(BlocklistService.apply_all_active())
    return {"id": rule_id, "status": "added"}


@router.delete("/rules/{rule_id}")
async def delete_rule(request: Request, rule_id: int):
    await require_auth(request)
    async with aiosqlite.connect(settings.db_path) as db:
        await db.execute("DELETE FROM rules WHERE id = ?", (rule_id,))
        await db.commit()
    asyncio.create_task(BlocklistService.apply_all_active())
    return {"status": "deleted"}


# ── Devices ────────────────────────────────────────────────────

@router.get("/devices")
async def list_devices(request: Request):
    await require_auth(request)
    async with aiosqlite.connect(settings.db_path) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT * FROM devices ORDER BY created_at")
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.post("/devices")
async def add_device(request: Request, device: DeviceCreate):
    await require_auth(request)
    peer = await WireGuardService.add_peer(device.name)
    async with aiosqlite.connect(settings.db_path) as db:
        cur = await db.execute(
            """INSERT INTO devices (name, ip_address, wg_public_key, wg_assigned_ip)
               VALUES (?, ?, ?, ?)""",
            (device.name, device.ip_address, peer["public_key"], peer["assigned_ip"]),
        )
        device_id = cur.lastrowid
        await db.commit()
    return {
        "id":         device_id,
        "name":       device.name,
        "qr_b64":     peer["qr_b64"],
        "config":     peer["config"],
        "assigned_ip": peer["assigned_ip"],
    }


@router.delete("/devices/{device_id}")
async def delete_device(request: Request, device_id: int):
    await require_auth(request)
    async with aiosqlite.connect(settings.db_path) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            "SELECT wg_public_key FROM devices WHERE id = ?", (device_id,)
        )
        row = await cur.fetchone()
        if row and row["wg_public_key"]:
            await WireGuardService.remove_peer(row["wg_public_key"])
        await db.execute("DELETE FROM devices WHERE id = ?", (device_id,))
        await db.commit()
    return {"status": "deleted"}


# ── VPN ────────────────────────────────────────────────────────

@router.get("/vpn/status")
async def vpn_status(request: Request):
    await require_auth(request)
    status = await WireGuardService.get_status()
    return status


# ── Settings ───────────────────────────────────────────────────

@router.get("/settings")
async def get_settings(request: Request):
    await require_auth(request)
    async with aiosqlite.connect(settings.db_path) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT key, value FROM settings")
        rows = await cur.fetchall()
        result = {r["key"]: r["value"] for r in rows}
        # Include username from the account table so the dashboard
        # can display it in the sidebar without a separate request
        cur2 = await db.execute("SELECT username FROM account WHERE id = 1")
        acc = await cur2.fetchone()
        if acc:
            result["username"] = acc["username"]
    return result


@router.patch("/settings")
async def update_settings(request: Request, data: SettingsUpdate):
    await require_auth(request)
    updates = data.model_dump(exclude_none=True)
    async with aiosqlite.connect(settings.db_path) as db:
        for k, v in updates.items():
            await db.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                (k, str(v).lower() if isinstance(v, bool) else str(v)),
            )
        await db.commit()
    return {"status": "updated"}


# ── Audit log ──────────────────────────────────────────────────

@router.get("/audit")
async def get_audit(request: Request, limit: int = 20):
    await require_auth(request)
    async with aiosqlite.connect(settings.db_path) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            "SELECT * FROM audit_log ORDER BY logged_at DESC LIMIT ?", (limit,)
        )
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


# ── Extension events ───────────────────────────────────────────
# Receives block and skip events from the HexBlock Shield extension.
# Writes them to the query log so they appear in the dashboard
# alongside DNS-level blocks.

@router.post("/events")
async def record_extension_event(request: Request):
    await require_auth(request)
    try:
        body = await request.json()
    except Exception:
        return {"status": "ignored"}

    resource = body.get("resource", "")
    action   = body.get("action", "blocked")
    tab_id   = body.get("tabId")

    if not resource:
        return {"status": "ignored"}

    # Extract a domain from the resource — may be a full URL or domain
    import re
    domain = resource
    url_match = re.match(r"https?://([^/]+)", resource)
    if url_match:
        domain = url_match.group(1)

    async with aiosqlite.connect(settings.db_path) as db:
        await db.execute(
            """INSERT INTO query_log
               (domain, query_type, client_ip, device_name, action, blocklist)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                domain,
                "EXT",
                request.state.client_ip if hasattr(request.state, "client_ip") else "extension",
                f"Browser tab {tab_id}" if tab_id else "Browser extension",
                "blocked" if action == "blocked" else "allowed",
                "HexBlock Shield" if action == "blocked" else None,
            ),
        )
        await db.commit()

    return {"status": "recorded"}


# ── System info ────────────────────────────────────────────────
# Returns runtime configuration — env vars that require a restart
# to change. Used by the dashboard settings page.

@router.get("/system")
async def get_system(request: Request):
    await require_auth(request)
    return {
        "version":          "1.0.0",
        "trust_proxy":      settings.trust_proxy,
        "trust_cloudflare": settings.trust_cloudflare,
        "allowed_hosts":    settings.allowed_hosts,
        "root_path":        settings.root_path or "",
        "wg_port":          settings.wg_port,
        "env":              settings.env,
    }


# ── Password change ────────────────────────────────────────────

@router.post("/account/password")
async def change_password(request: Request):
    await require_auth(request)
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request body")

    current = body.get("current_password", "")
    new_pw  = body.get("new_password", "")
    confirm = body.get("confirm_password", "")

    if not current or not new_pw or not confirm:
        raise HTTPException(status_code=400, detail="All fields are required")

    if new_pw != confirm:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    if len(new_pw) < 12:
        raise HTTPException(status_code=400, detail="Password must be at least 12 characters")

    from services.auth_service import AuthService as _AuthService
    ok = await _AuthService.change_password(current, new_pw)
    if not ok:
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    return {"status": "changed"}

