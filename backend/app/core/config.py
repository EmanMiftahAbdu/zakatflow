from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "ZakatFlow API"
    debug: bool = False
    database_url: str = "sqlite:///./zakatflow.db"
    secret_key: str = "change-me"
    cors_origins: list[str] = ["http://localhost:3000"]

    model_config = {"env_file": ".env"}


settings = Settings()
