"""Plaid integration route handlers.

Endpoints (all mounted under ``/api/plaid``):

- ``POST /link-token``  — create a short-lived link_token for Plaid Link
- ``POST /exchange``    — swap public_token for an access_token (server-side)
- ``GET  /accounts``    — list linked accounts with live balances
- ``POST /sync``        — trigger a transactions + balance sync
- ``POST /webhook``     — receive webhook callbacks from Plaid

Auth: every endpoint except ``/webhook`` should require the authenticated
user. ``get_current_user`` isn't wired up yet in this scaffold, so a
placeholder dependency is used — swap it for the real one once
``app.core.auth`` lands.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, Request

from app.schemas.plaid import (
    ExchangePublicTokenRequest,
    ExchangePublicTokenResponse,
    LinkTokenResponse,
    PlaidAccountsResponse,
    PlaidSyncResponse,
)
from app.services import plaid_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Placeholder auth dependency.
# Replace with ``from app.core.auth import get_current_user`` once available.
# ---------------------------------------------------------------------------
async def get_current_user(authorization: str | None = Header(default=None)) -> str:
    if not authorization:
        # For local dev with placeholder config, allow an unauthenticated
        # request and attribute it to a fixed demo user.
        return "demo-user"
    # TODO real JWT validation against Supabase
    return "demo-user"


@router.post("/link-token", response_model=LinkTokenResponse)
async def create_link_token(user_id: str = Depends(get_current_user)) -> LinkTokenResponse:
    try:
        payload = plaid_service.create_link_token(user_id)
    except Exception as exc:  # noqa: BLE001 — surface Plaid errors as 502
        raise HTTPException(status_code=502, detail=f"Plaid error: {exc}") from exc
    return LinkTokenResponse(**payload)


@router.post("/exchange", response_model=ExchangePublicTokenResponse)
async def exchange_public_token(
    body: ExchangePublicTokenRequest,
    user_id: str = Depends(get_current_user),
) -> ExchangePublicTokenResponse:
    try:
        payload = plaid_service.exchange_public_token(user_id, body.public_token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Plaid error: {exc}") from exc
    return ExchangePublicTokenResponse(**payload)


@router.get("/accounts", response_model=PlaidAccountsResponse)
async def list_accounts(user_id: str = Depends(get_current_user)) -> PlaidAccountsResponse:
    try:
        payload = plaid_service.get_accounts(user_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Plaid error: {exc}") from exc
    return PlaidAccountsResponse(**payload)


@router.post("/sync", response_model=PlaidSyncResponse)
async def sync(user_id: str = Depends(get_current_user)) -> PlaidSyncResponse:
    try:
        payload = plaid_service.sync_transactions(user_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Plaid error: {exc}") from exc
    return PlaidSyncResponse(**payload)


@router.post("/webhook")
async def webhook(request: Request) -> dict[str, bool]:
    """Receive webhook callbacks from Plaid.

    This endpoint is public (no user auth) — Plaid signs requests with a JWT
    in the ``Plaid-Verification`` header. The service layer should verify
    that header before acting on the payload.
    """
    payload = await request.json()
    plaid_service.handle_webhook(payload)
    return {"ok": True}
