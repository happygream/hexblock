from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from routers.deps import require_session, redirect_login, templates

router = APIRouter()

@router.get("/vpn", response_class=HTMLResponse)
async def vpn_page(request: Request):
    if not await require_session(request):
        return redirect_login()
    return templates.TemplateResponse("dashboard.html", {"request": request})
