# AI-GENERATED (Cursor Agent) — Issue #8: Integrate Auth0 backend authentication
# Owned by Backend Developer 1 (mamadub03).
# File-level AI attribution for this module (not per-symbol).
# ---------------------------------------------------------------------------
# FILE PURPOSE
#   Validate Auth0 access tokens (JWTs) using the tenant JWKS.
#   Frontend 2 obtains the token; this module decides if it is trusted.
# ---------------------------------------------------------------------------

"""Auth0 JWT verification helpers."""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

import jwt
from fastapi import HTTPException, status
from jwt import PyJWKClient

from app.core.config import Settings, get_settings


@dataclass(frozen=True)
class Auth0Claims:
    """Normalized claims extracted from a validated access token."""

    sub: str
    email_verified: bool
    raw: dict


# =============================================================================
# COMPONENT: JWKS client
# -----------------------------------------------------------------------------
# What: Cached client that fetches Auth0 signing keys for RS256 verification.
# =============================================================================
@lru_cache
def _jwks_client(domain: str) -> PyJWKClient:
    return PyJWKClient(f"https://{domain}/.well-known/jwks.json")


def _email_verified_from_claims(payload: dict) -> bool:
    """Read email_verified from standard or namespaced Auth0 claims."""
    if "email_verified" in payload:
        return bool(payload.get("email_verified"))
    # Optional custom claim if the SPA access token does not include email_verified.
    for key, value in payload.items():
        if key.endswith("/email_verified") or key.endswith("email_verified"):
            return bool(value)
    return False


# =============================================================================
# COMPONENT: verify_access_token
# -----------------------------------------------------------------------------
# What: Decode + verify Bearer JWT (signature, audience, issuer, expiry).
# Raises: HTTP 401 on any validation failure.
# =============================================================================
def verify_access_token(token: str, settings: Settings | None = None) -> Auth0Claims:
    """Validate an Auth0 access token and return normalized claims."""
    settings = settings or get_settings()
    if not settings.auth0_domain or not settings.auth0_api_audience:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Auth0 is not configured. Set AUTH0_DOMAIN and AUTH0_API_AUDIENCE "
                "in backend/.env (coordinate with Frontend 2 Issue #26)."
            ),
        )

    domain = settings.auth0_domain
    audience = settings.auth0_api_audience
    issuer = settings.auth0_issuer or f"https://{domain}/"

    try:
        signing_key = _jwks_client(domain).get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=audience,
            issuer=issuer,
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    sub = payload.get("sub")
    if not sub or not isinstance(sub, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject (sub)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return Auth0Claims(
        sub=sub,
        email_verified=_email_verified_from_claims(payload),
        raw=payload,
    )
