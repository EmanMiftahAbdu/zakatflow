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

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    model_config = {"env_file": "../.env", "extra": "ignore"}


settings = Settings()
