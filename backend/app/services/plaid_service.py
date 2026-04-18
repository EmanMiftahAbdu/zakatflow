"""Plaid API wrapper — thin, testable functions called by route handlers.

All persistence (saving access tokens, item records, account snapshots) is
expected to happen in the Supabase layer. This module just speaks Plaid.

TODO replace the in-memory token store with Supabase inserts/queries once
the ``plaid_items`` table is provisioned.
"""

from __future__ import annotations

from typing import Any

from plaid.model.accounts_balance_get_request import AccountsBalanceGetRequest
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import (
    ItemPublicTokenExchangeRequest,
)
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.transactions_sync_request import TransactionsSyncRequest

from app.core.config import settings
from app.core.plaid_client import plaid_client

# ---------------------------------------------------------------------------
# Placeholder token store. Replace with Supabase persistence.
# Keyed by user_id -> {"access_token": str, "item_id": str, "cursor": str}
# ---------------------------------------------------------------------------
_TOKEN_STORE: dict[str, dict[str, str]] = {}


def create_link_token(user_id: str) -> dict[str, Any]:
    """Create a short-lived link_token for the given user."""
    request = LinkTokenCreateRequest(
        user=LinkTokenCreateRequestUser(client_user_id=user_id),
        client_name=settings.plaid_client_name,
        products=[Products(p) for p in settings.plaid_products],
        country_codes=[CountryCode(c) for c in settings.plaid_country_codes],
        language=settings.plaid_language,
        webhook=settings.plaid_webhook_url,
    )
    response = plaid_client.link_token_create(request)
    return {
        "link_token": response["link_token"],
        "expiration": str(response.get("expiration")) if response.get("expiration") else None,
    }


def exchange_public_token(user_id: str, public_token: str) -> dict[str, str]:
    """Swap a short-lived public_token for a long-lived access_token.

    Access token is stored server-side only. Never return it to the client.
    """
    request = ItemPublicTokenExchangeRequest(public_token=public_token)
    response = plaid_client.item_public_token_exchange(request)
    access_token = response["access_token"]
    item_id = response["item_id"]

    # TODO persist to Supabase (plaid_items table) instead of in-memory dict.
    _TOKEN_STORE[user_id] = {
        "access_token": access_token,
        "item_id": item_id,
        "cursor": "",
    }
    return {"item_id": item_id}


def get_accounts(user_id: str) -> dict[str, Any]:
    """Fetch account list + live balances for the user's linked item."""
    record = _get_record_or_raise(user_id)
    request = AccountsBalanceGetRequest(access_token=record["access_token"])
    response = plaid_client.accounts_balance_get(request)

    accounts = []
    for a in response["accounts"]:
        balances = a.get("balances") or {}
        accounts.append(
            {
                "account_id": a["account_id"],
                "name": a.get("name"),
                "official_name": a.get("official_name"),
                "type": str(a.get("type")) if a.get("type") is not None else None,
                "subtype": str(a.get("subtype")) if a.get("subtype") is not None else None,
                "mask": a.get("mask"),
                "current_balance": balances.get("current"),
                "available_balance": balances.get("available"),
                "iso_currency_code": balances.get("iso_currency_code"),
            }
        )
    return {"item_id": record["item_id"], "accounts": accounts}


def sync_transactions(user_id: str) -> dict[str, Any]:
    """Incrementally pull transactions using /transactions/sync."""
    record = _get_record_or_raise(user_id)
    cursor = record.get("cursor") or ""

    added: list[Any] = []
    modified: list[Any] = []
    removed: list[Any] = []
    has_more = True

    while has_more:
        request = TransactionsSyncRequest(
            access_token=record["access_token"],
            cursor=cursor,
        )
        response = plaid_client.transactions_sync(request)
        added.extend(response["added"])
        modified.extend(response["modified"])
        removed.extend(response["removed"])
        cursor = response["next_cursor"]
        has_more = response["has_more"]

    # TODO persist transactions to Supabase and save the new cursor.
    _TOKEN_STORE[user_id]["cursor"] = cursor

    # Also refresh balances so the caller sees the account count.
    accounts_payload = get_accounts(user_id)

    return {
        "item_id": record["item_id"],
        "accounts_synced": len(accounts_payload["accounts"]),
        "transactions_added": len(added),
        "transactions_modified": len(modified),
        "transactions_removed": len(removed),
    }


def get_transactions(user_id: str) -> list[dict[str, Any]]:
    """Fetch all transactions via /transactions/sync and return parsed dicts.

    Returns a flat list of transaction dicts suitable for riba detection.
    """
    record = _get_record_or_raise(user_id)
    cursor = record.get("cursor") or ""

    all_added: list[Any] = []
    has_more = True

    while has_more:
        request = TransactionsSyncRequest(
            access_token=record["access_token"],
            cursor=cursor,
        )
        response = plaid_client.transactions_sync(request)
        all_added.extend(response["added"])
        cursor = response["next_cursor"]
        has_more = response["has_more"]

    _TOKEN_STORE[user_id]["cursor"] = cursor

    return [
        {
            "account_id": t.get("account_id"),
            "name": t.get("name"),
            "amount": t.get("amount"),
            "category": t.get("category") or [],
            "date": str(t.get("date")) if t.get("date") else None,
        }
        for t in all_added
    ]


def handle_webhook(payload: dict[str, Any]) -> None:
    """Dispatch incoming webhook events.

    Real implementation should:
      1. Verify the JWT signature from the ``Plaid-Verification`` header.
      2. Route by ``webhook_type`` / ``webhook_code``.
      3. Enqueue follow-up work (e.g. TRANSACTIONS SYNC_UPDATES_AVAILABLE).
    """
    # TODO verify webhook JWT via plaid_client.webhook_verification_key_get
    # TODO route + enqueue follow-up sync jobs
    return None


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------
def _get_record_or_raise(user_id: str) -> dict[str, str]:
    record = _TOKEN_STORE.get(user_id)
    if record is None:
        raise LookupError(f"No Plaid item linked for user_id={user_id}")
    return record
