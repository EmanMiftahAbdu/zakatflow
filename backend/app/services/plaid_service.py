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
# Keyed by user_id -> list of {"access_token", "item_id", "cursor",
#                               "institution_name", "institution_id"}
# ---------------------------------------------------------------------------
_TOKEN_STORE: dict[str, list[dict[str, str]]] = {}


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


def exchange_public_token(
    user_id: str,
    public_token: str,
    institution_name: str | None = None,
    institution_id: str | None = None,
) -> dict[str, str]:
    """Swap a short-lived public_token for a long-lived access_token.

    Supports multiple institutions per user — each exchange appends a new item.
    """
    request = ItemPublicTokenExchangeRequest(public_token=public_token)
    response = plaid_client.item_public_token_exchange(request)
    access_token = response["access_token"]
    item_id = response["item_id"]

    items = _TOKEN_STORE.setdefault(user_id, [])

    new_record = {
        "access_token": access_token,
        "item_id": item_id,
        "cursor": "",
        "institution_name": institution_name or "",
        "institution_id": institution_id or "",
    }

    # Replace if same item already linked, otherwise append.
    for i, existing in enumerate(items):
        if existing["item_id"] == item_id:
            items[i] = new_record
            break
    else:
        items.append(new_record)

    return {"item_id": item_id, "institution_name": institution_name or ""}


def get_accounts(user_id: str) -> dict[str, Any]:
    """Fetch account list + live balances across all linked institutions."""
    items = _get_items_or_raise(user_id)
    all_accounts: list[dict[str, Any]] = []

    for record in items:
        request = AccountsBalanceGetRequest(access_token=record["access_token"])
        response = plaid_client.accounts_balance_get(request)

        for a in response["accounts"]:
            balances = a.get("balances") or {}
            all_accounts.append(
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
                    "item_id": record["item_id"],
                    "institution_name": record.get("institution_name", ""),
                }
            )

    return {"items_count": len(items), "accounts": all_accounts}


def sync_transactions(user_id: str) -> dict[str, Any]:
    """Incrementally pull transactions across all linked institutions."""
    items = _get_items_or_raise(user_id)

    total_added = 0
    total_modified = 0
    total_removed = 0

    for record in items:
        cursor = record.get("cursor") or ""
        has_more = True

        while has_more:
            request = TransactionsSyncRequest(
                access_token=record["access_token"],
                cursor=cursor,
            )
            response = plaid_client.transactions_sync(request)
            total_added += len(response["added"])
            total_modified += len(response["modified"])
            total_removed += len(response["removed"])
            cursor = response["next_cursor"]
            has_more = response["has_more"]

        record["cursor"] = cursor

    accounts_payload = get_accounts(user_id)

    return {
        "items_synced": len(items),
        "accounts_synced": len(accounts_payload["accounts"]),
        "transactions_added": total_added,
        "transactions_modified": total_modified,
        "transactions_removed": total_removed,
    }


def get_transactions(user_id: str) -> list[dict[str, Any]]:
    """Fetch all transactions across all linked institutions.

    Returns a flat list of transaction dicts suitable for riba detection.
    """
    items = _get_items_or_raise(user_id)
    all_txns: list[dict[str, Any]] = []

    for record in items:
        cursor = record.get("cursor") or ""
        has_more = True

        while has_more:
            request = TransactionsSyncRequest(
                access_token=record["access_token"],
                cursor=cursor,
            )
            response = plaid_client.transactions_sync(request)
            for t in response["added"]:
                all_txns.append({
                    "account_id": t.get("account_id"),
                    "name": t.get("name"),
                    "amount": t.get("amount"),
                    "category": t.get("category") or [],
                    "date": str(t.get("date")) if t.get("date") else None,
                    "item_id": record["item_id"],
                    "institution_name": record.get("institution_name", ""),
                })
            cursor = response["next_cursor"]
            has_more = response["has_more"]

        record["cursor"] = cursor

    return all_txns


def get_linked_institutions(user_id: str) -> list[dict[str, str]]:
    """Return summary of all linked institutions for a user."""
    items = _TOKEN_STORE.get(user_id, [])
    return [
        {
            "item_id": item["item_id"],
            "institution_name": item.get("institution_name", ""),
            "institution_id": item.get("institution_id", ""),
        }
        for item in items
    ]


def unlink_institution(user_id: str, item_id: str) -> bool:
    """Remove a linked institution by item_id."""
    items = _TOKEN_STORE.get(user_id, [])
    for i, item in enumerate(items):
        if item["item_id"] == item_id:
            items.pop(i)
            return True
    return False


def handle_webhook(payload: dict[str, Any]) -> None:
    """Dispatch incoming webhook events."""
    # TODO verify webhook JWT via plaid_client.webhook_verification_key_get
    # TODO route + enqueue follow-up sync jobs
    return None


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------
def _get_items_or_raise(user_id: str) -> list[dict[str, str]]:
    items = _TOKEN_STORE.get(user_id)
    if not items:
        raise LookupError(f"No Plaid items linked for user_id={user_id}")
    return items
