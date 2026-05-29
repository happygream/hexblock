"""
HexBlock — Privacy Gateway
hexblock.py — application entrypoint
"""

import ipaddress
import logging
from contextlib import asynccontextmanager
from typing import Optional

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from config import settings
from database import init_db
from routers import auth, dashboard, blocklists, devices, vpn, rules, security
from routers import settings as settings_router
from routers import api
from services.blocklist_service import BlocklistService
from services.scheduler import start_scheduler
from services.log_reader_service import start_log_reader

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("hexblock")

# Cloudflare published IPv4 and IPv6 ranges.
# Fetched once at startup and cached.
# Source: https://www.cloudflare.com/ips/
_CF_NETWORKS: list[ipaddress.IPv4Network | ipaddress.IPv6Network] = []

CLOUDFLARE_IPS_V4 = "https://www.cloudflare.com/ips-v4"
CLOUDFLARE_IPS_V6 = "https://www.cloudflare.com/ips-v6"


async def _load_cloudflare_ranges():
    """
    Fetch Cloudflare IP ranges at startup.
    Falls back to a hardcoded list if the fetch fails so the
    application always starts even without outbound internet access.
    """
    global _CF_NETWORKS
    fallback = [
        "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22",
        "103.31.4.0/22",   "141.101.64.0/18", "108.162.192.0/18",
        "190.93.240.0/20", "188.114.96.0/20", "197.234.240.0/22",
        "198.41.128.0/17", "162.158.0.0/15",  "104.16.0.0/13",
        "104.24.0.0/14",   "172.64.0.0/13",   "131.0.72.0/22",
        "2400:cb00::/32",  "2606:4700::/32",   "2803:f800::/32",
        "2405:b500::/32",  "2405:8100::/32",   "2a06:98c0::/29",
        "2c0f:f248::/32",
    ]
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            v4 = (await client.get(CLOUDFLARE_IPS_V4)).text.strip().splitlines()
            v6 = (await client.get(CLOUDFLARE_IPS_V6)).text.strip().splitlines()
            ranges = v4 + v6
    except Exception:
        logger.warning("Could not fetch Cloudflare IP ranges — using built-in fallback list")
        ranges = fallback

    _CF_NETWORKS = []
    for cidr in ranges:
        cidr = cidr.strip()
        if not cidr:
            continue
        try:
            _CF_NETWORKS.append(ipaddress.ip_network(cidr, strict=False))
        except ValueError:
            pass

    logger.info("Loaded %d Cloudflare IP ranges", len(_CF_NETWORKS))


def _is_cloudflare_ip(ip_str: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip_str)
        return any(addr in net for net in _CF_NETWORKS)
    except ValueError:
        return False


def _get_connecting_ip(request: Request) -> str:
    """
    Return the real client IP, respecting the configured proxy mode.

    - Default: use the direct connecting IP from the TCP socket.
    - TRUST_PROXY=1: read X-Forwarded-For from any upstream proxy.
    - TRUST_CLOUDFLARE=1: read CF-Connecting-IP only if the request
      arrives from a verified Cloudflare IP range. Falls back to
      X-Forwarded-For otherwise.
    """
    direct_ip = request.client.host if request.client else "unknown"

    if settings.trust_cloudflare:
        if _is_cloudflare_ip(direct_ip):
            cf_ip = request.headers.get("CF-Connecting-IP")
            if cf_ip:
                return cf_ip.strip()
        # Request is not from Cloudflare — ignore forwarded headers
        return direct_ip

    if settings.trust_proxy:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()

    return direct_ip


class ProxyMiddleware(BaseHTTPMiddleware):
    """
    Populates request.state.client_ip with the real client IP
    and corrects request.scope['scheme'] from X-Forwarded-Proto
    or CF-Visitor when running behind a proxy or Cloudflare Tunnel.
    """

    async def dispatch(self, request: Request, call_next):
        request.state.client_ip = _get_connecting_ip(request)

        if settings.trust_cloudflare or settings.trust_proxy:
            # Correct the scheme so HTTPS is reflected in redirects
            proto = (
                request.headers.get("CF-Visitor", "")
                    .replace('"', "")
                    .replace("{scheme:", "")
                    .replace("}", "")
                    .strip()
                or request.headers.get("X-Forwarded-Proto", "")
            )
            if proto in ("https", "http"):
                request.scope["scheme"] = proto

        return await call_next(request)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("HexBlock starting")
    if settings.trust_cloudflare:
        await _load_cloudflare_ranges()
    await init_db()
    await BlocklistService.apply_all_active()
    import asyncio as _asyncio
    from services.event_bus import set_main_loop
    set_main_loop(_asyncio.get_event_loop())
    start_scheduler()
    start_log_reader()
    yield
    logger.info("HexBlock stopping")


app = FastAPI(
    title="HexBlock",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
    root_path=settings.root_path,
)

app.add_middleware(ProxyMiddleware)

if settings.allowed_hosts and settings.allowed_hosts != "*":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=[h.strip() for h in settings.allowed_hosts.split(",")],
    )

app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(blocklists.router)
app.include_router(devices.router)
app.include_router(vpn.router)
app.include_router(rules.router)
app.include_router(security.router)
app.include_router(settings_router.router)
app.include_router(api.router, prefix="/api/v1")


@app.get("/")
async def root(request: Request):
    from services.auth_service import AuthService
    if not await AuthService.is_setup_complete():
        return RedirectResponse(url="/onboard")
    return RedirectResponse(url="/dashboard")


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/robots.txt", include_in_schema=False)
async def robots():
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(
        "User-agent: *\nDisallow: /\n",
        media_type="text/plain",
    )


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    from fastapi.responses import FileResponse
    import os
    path = os.path.join(os.path.dirname(__file__), "static", "favicon.ico")
    return FileResponse(path, media_type="image/x-icon")
