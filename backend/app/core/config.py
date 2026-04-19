from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "ZakatFlow API"
    debug: bool = False

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # API Keys
    goldapi_key: str = ""
    resend_api_key: str = ""

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8081", "*"]

    # Plaid (placeholders — override via .env)
    # plaid_env: one of "sandbox", "development", "production"
    plaid_client_id: str = "your-plaid-client-id"
    plaid_secret: str = "your-plaid-sandbox-secret"
    plaid_env: str = "sandbox"
    plaid_products: list[str] = ["auth", "transactions"]
    plaid_country_codes: list[str] = ["US"]
    plaid_language: str = "en"
    plaid_webhook_url: str = "http://localhost:8000/api/plaid/webhook"
    plaid_client_name: str = "ZakatFlow"

    model_config = {"env_file": "../.env", "extra": "ignore"}


settings = Settings()
