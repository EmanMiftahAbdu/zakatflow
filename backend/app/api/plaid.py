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

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.auth import get_current_user
from app.schemas.plaid import (
    ExchangePublicTokenRequest,
    ExchangePublicTokenResponse,
    LinkTokenResponse,
    PlaidAccountsResponse,
    PlaidSyncResponse,
)
from app.services import plaid_service
from app.services.plaid_sync import (
    sync_plaid_accounts_to_assets,
    detect_riba_from_transactions,
)

router = APIRouter()


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
        payload = plaid_service.exchange_public_token(
            user_id,
            body.public_token,
            institution_name=body.institution_name,
            institution_id=body.institution_id,
        )
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


@router.get("/institutions")
async def list_institutions(user_id: str = Depends(get_current_user)) -> list[dict]:
    """List all linked institutions for the current user."""
    return plaid_service.get_linked_institutions(user_id)


@router.delete("/institutions/{item_id}")
async def unlink_institution(
    item_id: str,
    user_id: str = Depends(get_current_user),
) -> dict:
    """Unlink an institution by item_id."""
    removed = plaid_service.unlink_institution(user_id, item_id)
    if not removed:
        raise HTTPException(status_code=404, detail=f"Item {item_id} not found")
    return {"ok": True, "item_id": item_id}


@router.get("/transactions")
async def list_transactions(user_id: str = Depends(get_current_user)) -> list[dict]:
    """Return synced transactions across all linked institutions."""
    try:
        return plaid_service.get_transactions(user_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Plaid error: {exc}") from exc


@router.post("/refresh")
async def refresh_balances(user_id: str = Depends(get_current_user)) -> PlaidAccountsResponse:
    """Refresh account balances only (no transaction sync)."""
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


@router.post("/sync-assets")
async def sync_assets(user_id: str = Depends(get_current_user)) -> dict:
    """Sync Plaid accounts into ZakatFlow assets/liabilities and detect riba.

    1. Fetches accounts + balances from Plaid
    2. Maps them to asset categories (cash, stocks, retirement) or liabilities
    3. Syncs transactions and scans for interest income (riba)
    """
    try:
        # Get accounts + balances from Plaid
        accounts_payload = plaid_service.get_accounts(user_id)
        accounts = accounts_payload["accounts"]

        # Map Plaid accounts -> ZakatFlow assets/liabilities
        sync_result = sync_plaid_accounts_to_assets(user_id, accounts)

        # Pull transactions and scan for interest income (riba)
        riba_result = {"total_interest_detected": 0, "accounts_with_interest": 0}
        try:
            txn_data = plaid_service.get_transactions(user_id)
            riba_result = detect_riba_from_transactions(user_id, txn_data)
        except (LookupError, Exception):
            pass  # Transactions may not be available yet

        return {
            "accounts_synced": len(accounts),
            **sync_result,
            "riba": riba_result,
        }
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Plaid sync error: {exc}") from exc


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
