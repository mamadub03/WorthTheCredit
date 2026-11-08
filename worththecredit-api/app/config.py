"""All settings come from environment variables (or a `.env` file in the project root).

Use `get_settings()` anywhere; it's read once and cached.
"""

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: str = "development"  # development | production | test

    # PostgreSQL (Tiger Data in production). SQLAlchemy URL with the psycopg 3 driver:
    # postgresql+psycopg://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require
    database_url: str = "postgresql+psycopg://wtc:wtc@localhost:5432/worththecredit"

    # Comma-separated frontend origins allowed by CORS.
    cors_origins: str = "http://localhost:5173"

    # Auth0
    auth0_domain: str = ""  # dev-abc123.us.auth0.com (no https://)
    auth0_audience: str = ""  # the API Identifier, e.g. https://api.worththecredit.app
    auth0_claim_namespace: str = "https://worththecredit.app/"  # must match the Post-Login Action

    # OPTIONAL: Machine-to-Machine app (Auth0 Management API, scope update:users)
    # for POST /auth/resend-verification. Leave empty to disable that endpoint.
    auth0_m2m_client_id: str = ""
    auth0_m2m_client_secret: str = ""

    # LOCAL DEV ONLY: accept any bearer token as a fake verified user (refused in production).
    dev_auth_bypass: bool = False

    # Admin: send this value in the X-Admin-Api-Key header to hide/unhide reviews.
    admin_api_key: str = ""

    # Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash"
    gemini_timeout_seconds: int = 30
    use_fake_gemini: bool = False  # canned results for local dev, no API key needed
    recommendations_per_minute: int = 10  # per user
    candidate_limit: int = 25  # courses sent to Gemini (spec: ~20–30)
    min_candidates: int = 8  # below this, widen the search (ILIKE, then major's department)

    @field_validator("auth0_domain")
    @classmethod
    def _strip_domain(cls, v: str) -> str:
        return v.strip().removeprefix("https://").removeprefix("http://").rstrip("/")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]

    @property
    def auth0_issuer(self) -> str:
        return f"https://{self.auth0_domain}/"

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
