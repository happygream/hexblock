"""
HexBlock auth routes — onboarding, login, logout.
"""

from fastapi import APIRouter, Request, Response, Form
from services.csrf_service import generate_token, validate_token
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from services.auth_service import AuthService

router    = APIRouter()
templates = Jinja2Templates(directory="templates")


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ── Onboarding ───────────────────────────────────────────────

@router.get("/onboard", response_class=HTMLResponse)
async def onboard_page(request: Request):
    if await AuthService.is_setup_complete():
        return RedirectResponse(url="/dashboard")
    csrf = generate_token("")
    return templates.TemplateResponse("onboard.html", {"request": request, "csrf_token": csrf})


@router.post("/onboard")
async def onboard_submit(
    request: Request,
    username:        str = Form(...),
    password:        str = Form(...),
    confirm_password: str = Form(...),
    hostname:        str = Form("hexblock.local"),
    upstream_dns:    str = Form("1.1.1.1"),
    timezone:        str = Form("Europe/London"),
    vpn_mode:        str = Form("auto"),
):
    errors = []
    if len(username.strip()) < 3:
        errors.append("Username must be at least 3 characters")
    if len(password) < 12:
        errors.append("Password must be at least 12 characters")
    if password != confirm_password:
        errors.append("Passwords do not match")
    if errors:
        return templates.TemplateResponse("onboard.html", {
            "request": request, "errors": errors,
        })

    await AuthService.complete_setup(
        username.strip(), password, hostname, upstream_dns, timezone, vpn_mode
    )

    # Optionally install selected preset blocklists
    from services.blocklist_service import BlocklistService
    presets_param = await request.form()
    selected = presets_param.getlist("preset_lists")

    PRESET_MAP = {
        "ads":       ("StevenBlack Hosts",  "Ads",      "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts"),
        "trackers":  ("OISD Basic",         "Trackers", "https://dbl.oisd.nl/basic/"),
        "malware":   ("Phishing Army",      "Malware",  "https://phishing.army/download/phishing_army_blocklist.txt"),
        "social":    ("EasyList Social",    "Social",   "https://secure.fanboy.co.nz/fanboy-social.txt"),
        "telemetry": ("WindowsSpyBlocker",  "Telemetry","https://raw.githubusercontent.com/crazy-max/WindowsSpyBlocker/master/data/hosts/spy.txt"),
        "adult":     ("Adult Content",      "Adult",    "https://raw.githubusercontent.com/mhhakim/pihole-blocklist/master/porn.txt"),
    }
    for key in selected:
        if key in PRESET_MAP:
            name, cat, url = PRESET_MAP[key]
            await BlocklistService.add(name, cat, source_url=url)

    return RedirectResponse(url="/login", status_code=303)


# ── Login ────────────────────────────────────────────────────

@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    if not await AuthService.is_setup_complete():
        return RedirectResponse(url="/onboard")
    csrf = generate_token("")
    return templates.TemplateResponse("login.html", {"request": request, "csrf_token": csrf})


@router.post("/login")
async def login_submit(
    request: Request,
    response: Response,
    csrf_token: str = Form(""),
    username:   str = Form(...),
    password:   str = Form(...),
    totp_code:  str = Form(None),
):
    ip = get_client_ip(request)

    # Validate CSRF token first
    if not validate_token(csrf_token, ""):
        csrf = generate_token("")
        return templates.TemplateResponse("login.html", {
            "request": request,
            "error":   "Invalid form submission. Please try again.",
            "csrf_token": csrf,
        })

    # Check lockout
    locked, remaining = await AuthService.check_lockout(ip)
    if locked:
        return templates.TemplateResponse("login.html", {
            "request":  request,
            "error":    "Too many failed attempts. Please wait 5 minutes.",
            "locked": True, "csrf_token": generate_token(""),
        })

    # Verify credentials
    valid = await AuthService.verify_credentials(username, password)
    if not valid:
        await AuthService.record_attempt(ip, success=False)
        attempts_left = remaining - 1
        return templates.TemplateResponse("login.html", {
            "request":      request,
            "error":        "Incorrect username or password",
            "attempts_left": attempts_left, "csrf_token": generate_token(""),
        })

    # Verify TOTP if enabled
    totp_ok = await AuthService.verify_totp(totp_code or "")
    if not totp_ok:
        return templates.TemplateResponse("login.html", {
            "request":    request,
            "error": "Invalid authenticator code", "need_totp": True, "csrf_token": generate_token(""),
        })

    await AuthService.record_attempt(ip, success=True)
    token = await AuthService.create_session(ip)

    resp = RedirectResponse(url="/dashboard", status_code=303)
    resp.set_cookie(
        key="hb_session",
        value=token,
        httponly=True,
        samesite="strict",
        max_age=3600,
    )
    return resp


# ── Logout ───────────────────────────────────────────────────

@router.post("/logout")
async def logout(request: Request):
    token = request.cookies.get("hb_session")
    if token:
        await AuthService.destroy_session(token)
    resp = RedirectResponse(url="/login", status_code=303)
    resp.delete_cookie("hb_session")
    return resp
