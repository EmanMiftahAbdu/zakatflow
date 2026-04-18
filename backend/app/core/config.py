from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "ZakatFlow API"
    debug: bool = False
    database_url: str = "sqlite:///./zakatflow.db"
    secret_key: str = "change-me"
    cors_origins: list[str] = ["http://localhost:3000"]

    # Supabase (placeholders — override via .env)
    supabase_url: str = "https://your-project.supabase.co"
    supabase_anon_key: str = "your-supabase-anon-key"
    supabase_service_role_key: str = "your-supabase-service-role-key"
    supabase_jwt_secret: str = "your-supabase-jwt-secret"

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

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
