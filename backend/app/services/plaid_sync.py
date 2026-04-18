"""Bridge between Plaid data and ZakatFlow assets.

Maps Plaid accounts and transactions into our asset categories,
auto-detects interest income (riba), and syncs to Supabase.
"""

from app.core.supabase import get_supabase_client


# Plaid account type/subtype -> ZakatFlow asset category
ACCOUNT_CATEGORY_MAP = {
    # Depository accounts
    ("depository", "checking"): "cash",
    ("depository", "savings"): "cash",
    ("depository", "money market"): "cash",
    ("depository", "cd"): "cash",
    ("depository", "cash management"): "cash",
    # Investment accounts
    ("investment", "401k"): "retirement",
    ("investment", "401a"): "retirement",
    ("investment", "403B"): "retirement",
    ("investment", "ira"): "retirement",
    ("investment", "roth"): "retirement",
    ("investment", "roth 401k"): "retirement",
    ("investment", "pension"): "retirement",
    ("investment", "brokerage"): "stocks_hold",
    ("investment", "mutual fund"): "stocks_hold",
    ("investment", "stock plan"): "stocks_hold",
    # Credit (liabilities, not assets)
    ("credit", "credit card"): None,
    # Loan (liabilities, not assets)
    ("loan", "auto"): None,
    ("loan", "mortgage"): None,
    ("loan", "student"): None,
    ("loan", "personal"): None,
}

# Plaid transaction categories that indicate interest income
INTEREST_CATEGORIES = {
    "Interest Earned",
    "Interest",
    "Dividend",
    "Interest Income",
}

# Savings/CD accounts are typically interest-bearing
INTEREST_BEARING_SUBTYPES = {"savings", "cd", "money market"}


def sync_plaid_accounts_to_assets(user_id: str, plaid_accounts: list[dict]) -> dict:
    """Convert Plaid accounts into ZakatFlow assets and liabilities.

    Returns summary of what was created/updated.
    """
    supabase = get_supabase_client()
    assets_created = 0
    assets_updated = 0
    liabilities_created = 0

    for account in plaid_accounts:
        account_id = account["account_id"]
        account_type = (account.get("type") or "").lower()
        subtype = (account.get("subtype") or "").lower()
        name = account.get("name") or account.get("official_name") or "Linked Account"
        balance = account.get("current_balance") or 0

        if balance <= 0 and account_type not in ("credit", "loan"):
            continue

        category = ACCOUNT_CATEGORY_MAP.get(
            (account_type, subtype),
            _fallback_category(account_type),
        )

        # Credit/loan accounts become liabilities
        if category is None:
            _upsert_liability(supabase, user_id, account_id, name, abs(balance))
            liabilities_created += 1
            continue

        is_interest_bearing = subtype in INTEREST_BEARING_SUBTYPES
        metadata = {
            "plaid_account_id": account_id,
            "plaid_type": account_type,
            "plaid_subtype": subtype,
            "interest_bearing": is_interest_bearing,
            "source": "plaid",
        }

        # Check if asset already exists for this Plaid account
        existing = (
            supabase.table("assets")
            .select("id")
            .eq("user_id", user_id)
            .contains("metadata", {"plaid_account_id": account_id})
            .execute()
        )

        if existing.data:
            # Update balance
            supabase.table("assets").update({
                "amount": balance,
                "metadata": metadata,
            }).eq("id", existing.data[0]["id"]).execute()
            assets_updated += 1
        else:
            # Create new asset
            is_zakatable = category != "retirement"
            supabase.table("assets").insert({
                "user_id": user_id,
                "category": category,
                "label": f"{name} (Plaid)",
                "amount": balance,
                "is_zakatable": is_zakatable,
                "metadata": metadata,
            }).execute()
            assets_created += 1

    return {
        "assets_created": assets_created,
        "assets_updated": assets_updated,
        "liabilities_created": liabilities_created,
    }


def detect_riba_from_transactions(
    user_id: str, transactions: list[dict]
) -> dict:
    """Scan Plaid transactions for interest/dividend income.

    Updates matching assets with detected interest amounts.
    """
    supabase = get_supabase_client()
    total_interest = 0.0
    interest_by_account: dict[str, float] = {}

    for txn in transactions:
        categories = txn.get("category") or []
        txn_name = (txn.get("name") or "").lower()
        amount = abs(txn.get("amount") or 0)

        is_interest = False

        # Check category match
        for cat in categories:
            if cat in INTEREST_CATEGORIES:
                is_interest = True
                break

        # Check name-based detection
        if not is_interest:
            interest_keywords = ["interest", "dividend", "apy", "yield"]
            if any(kw in txn_name for kw in interest_keywords):
                is_interest = True

        if is_interest and amount > 0:
            account_id = txn.get("account_id", "unknown")
            interest_by_account[account_id] = (
                interest_by_account.get(account_id, 0) + amount
            )
            total_interest += amount

    # Update assets with detected interest amounts
    for account_id, interest_amount in interest_by_account.items():
        existing = (
            supabase.table("assets")
            .select("id, metadata")
            .eq("user_id", user_id)
            .contains("metadata", {"plaid_account_id": account_id})
            .execute()
        )
        if existing.data:
            asset = existing.data[0]
            metadata = asset.get("metadata") or {}
            metadata["interest_bearing"] = True
            metadata["interest_amount"] = round(interest_amount, 2)
            metadata["riba_detected"] = True
            supabase.table("assets").update({
                "metadata": metadata,
            }).eq("id", asset["id"]).execute()

    return {
        "total_interest_detected": round(total_interest, 2),
        "accounts_with_interest": len(interest_by_account),
        "interest_by_account": {
            k: round(v, 2) for k, v in interest_by_account.items()
        },
    }


def _fallback_category(account_type: str) -> str | None:
    """Fallback when specific subtype isn't mapped."""
    fallbacks = {
        "depository": "cash",
        "investment": "stocks_hold",
        "credit": None,
        "loan": None,
    }
    return fallbacks.get(account_type, "cash")


def _upsert_liability(
    supabase, user_id: str, account_id: str, name: str, amount: float
) -> None:
    """Create or update a liability from a Plaid credit/loan account."""
    existing = (
        supabase.table("liabilities")
        .select("id")
        .eq("user_id", user_id)
        .eq("label", f"{name} (Plaid)")
        .execute()
    )

    if existing.data:
        supabase.table("liabilities").update({
            "amount": amount,
        }).eq("id", existing.data[0]["id"]).execute()
    else:
        supabase.table("liabilities").insert({
            "user_id": user_id,
            "label": f"{name} (Plaid)",
            "amount": amount,
            "due_within_year": True,
        }).execute()
