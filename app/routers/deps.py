"""
HexBlock shared router dependencies.
Centralises auth checking so it is not duplicated across every router.
"""

from fastapi import Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

from services.auth_service import AuthService

templates = Jinja2Templates(directory="templates")


async def require_session(request: Request):
    """
    Check for a valid session cookie.
    Returns True if authenticated, False otherwise.
    Use in every protected page route.
    """
    token = request.cookies.get("hb_session")
    if not token:
        return False
    return await AuthService.validate_session(token)


def redirect_login():
    return RedirectResponse(url="/login", status_code=302)
