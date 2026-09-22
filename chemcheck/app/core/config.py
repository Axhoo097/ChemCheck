"""
Central configuration. Everything is loaded from environment variables
(via a .env file locally) through pydantic-settings. Never hardcode
secrets/DB URLs anywhere else in the codebase — import `settings` instead.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "ChemCheck"
    environment: str = "development"

    # PostgreSQL is the source of truth in every real environment.
    database_url: str = "postgresql+asyncpg://chemcheck:chemcheck@localhost:5432/chemcheck"

    secret_key: str = "change-me-in-env"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours

    # Comma-separated list, e.g. "http://localhost:3000,https://chemcheck.app"
    allowed_origins: str = "http://localhost:3000"

    # Phase 9 — optional Redis URL for score caching.
    # Leave unset (or empty) to run without Redis; the app degrades gracefully.
    # Example: redis://localhost:6379/0
    redis_url: str | None = None

    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
