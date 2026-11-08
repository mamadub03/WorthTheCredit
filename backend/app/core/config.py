# AI-GENERATED (Cursor Agent) — Issues #2–#3 / #8: settings
# Owned by Backend Developer 1 (mamadub03).
# File-level AI attribution for this module (not per-symbol).
# Loads settings from environment / .env. Secrets must never be hardcoded here.

"""Application settings loaded from environment variables."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the FastAPI service."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = Field(default="WorthTheCredit API", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    debug: bool = Field(default=True, alias="DEBUG")
    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8000, alias="PORT")
    # Comma-separated list in .env; parsed into a list of origins.
    cors_origins: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173",
        alias="CORS_ORIGINS",
    )
    # Tiger Data PostgreSQL URL. Required for DB sessions / Alembic; optional
    # for app boot so /health still works before credentials are configured.
    # Shared with Backend Developer 2 — same .env.example contract.
    database_url: str | None = Field(default=None, alias="DATABASE_URL")

    # Auth0 (Issue #8). Coordinate domain + API audience with Frontend 2 (#26).
    # No client secret on the API — we only validate JWTs via JWKS.
    auth0_domain: str | None = Field(default=None, alias="AUTH0_DOMAIN")
    auth0_api_audience: str | None = Field(default=None, alias="AUTH0_API_AUDIENCE")
    # Optional override; defaults to https://{AUTH0_DOMAIN}/
    auth0_issuer: str | None = Field(default=None, alias="AUTH0_ISSUER")
    # LOCAL TESTING ONLY (integration branch): accept signed-in students whose
    # access token has no email_verified claim yet. Still needs a valid Auth0
    # token. Honored only when APP_ENV=development; off by default.
    auth_skip_email_verification: bool = Field(
        default=False, alias="AUTH_SKIP_EMAIL_VERIFICATION"
    )

    @property
    def skip_email_verification(self) -> bool:
        """True only for local development with the testing switch on."""
        return self.auth_skip_email_verification and self.app_env == "development"

    @property
    def cors_origin_list(self) -> list[str]:
        """Return CORS origins as a cleaned list."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
