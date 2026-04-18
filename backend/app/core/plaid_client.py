"""Plaid API client initialization.

This module creates a single, module-level ``PlaidApi`` instance configured
from ``app.core.config.settings``. Import ``plaid_client`` anywhere the Plaid
API needs to be called.

The environment is selected from ``settings.plaid_env``:

- ``sandbox``      → test institutions, fake credentials (user_good / pass_good)
- ``development``  → real banks, limited to 100 live items
- ``production``   → real banks, unlimited (requires Plaid approval)
"""

from __future__ import annotations

from plaid import Configuration, ApiClient
from plaid.api import plaid_api

from app.core.config import settings

_PLAID_HOSTS = {
    "sandbox": "https://sandbox.plaid.com",
    "development": "https://development.plaid.com",
    "production": "https://production.plaid.com",
}


def _build_client() -> plaid_api.PlaidApi:
    host = _PLAID_HOSTS.get(settings.plaid_env.lower())
    if host is None:
        raise ValueError(
            f"Invalid PLAID_ENV '{settings.plaid_env}'. "
            f"Expected one of: {', '.join(_PLAID_HOSTS)}"
        )

    configuration = Configuration(
        host=host,
        api_key={
            "clientId": settings.plaid_client_id,
            "secret": settings.plaid_secret,
        },
    )
    api_client = ApiClient(configuration)
    return plaid_api.PlaidApi(api_client)


plaid_client: plaid_api.PlaidApi = _build_client()
