"""Pydantic request/response schemas for the Plaid integration."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class LinkTokenResponse(BaseModel):
    """Returned to the frontend so it can initialize Plaid Link."""

    link_token: str
    expiration: str | None = None


class ExchangePublicTokenRequest(BaseModel):
    """Sent by the frontend after Plaid Link's ``onSuccess`` fires."""

    public_token: str = Field(..., description="Short-lived token from Plaid Link")
    institution_name: str | None = None
    institution_id: str | None = None


class ExchangePublicTokenResponse(BaseModel):
    """Confirmation returned after exchanging for a long-lived access token.

    The access token itself is NEVER returned to the frontend — only stored
    server-side, keyed by the authenticated user.
    """

    item_id: str
    ok: bool = True


class PlaidAccount(BaseModel):
    account_id: str
    name: str
    official_name: str | None = None
    type: str
    subtype: str | None = None
    mask: str | None = None
    current_balance: float | None = None
    available_balance: float | None = None
    iso_currency_code: str | None = None


class PlaidAccountsResponse(BaseModel):
    item_id: str
    accounts: list[PlaidAccount]


class PlaidSyncResponse(BaseModel):
    """Summary returned after triggering a balance/transaction sync."""

    item_id: str
    accounts_synced: int
    transactions_added: int = 0
    transactions_modified: int = 0
    transactions_removed: int = 0


class PlaidWebhookPayload(BaseModel):
    """Incoming webhook from Plaid. Schema intentionally permissive."""

    webhook_type: str
    webhook_code: str
    item_id: str | None = None
    error: dict[str, Any] | None = None

    model_config = {"extra": "allow"}
