"""Auth dependencies for routes.

    get_current_user        → valid Auth0 token required (401 otherwise); upserts the user row
    require_verified_email  → also needs the email_verified claim = true (403 "email_not_verified")
    require_admin_key       → X-Admin-Api-Key header must equal ADMIN_API_KEY

Public routes simply don't use any of these, so they work without a token.
"""

import logging
import secrets
from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.auth.tokens import AuthUnavailable, TokenClaims, TokenError, TokenVerifier, get_token_verifier
from app.be1_stubs.models import User
from app.config import Settings, get_settings
from app.db import get_db

log = logging.getLogger(__name__)

_bearer = HTTPBearer(auto_error=False)  # we return our own error body instead


@dataclass(frozen=True)
class CurrentUser:
    id: int  # users.id (internal, never sent to other students)
    sub: str
    email: str | None
    email_verified: bool


def _401(detail: str) -> HTTPException:
    return HTTPException(status_code=401, detail=detail, headers={"WWW-Authenticate": "Bearer"})


def get_token_claims(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    settings: Settings = Depends(get_settings),
    verifier: TokenVerifier = Depends(get_token_verifier),
) -> TokenClaims:
    if creds is None or not creds.credentials:
        raise _401("not_authenticated")

    if settings.dev_auth_bypass:
        if settings.is_production:
            raise HTTPException(status_code=500, detail="dev_auth_bypass_in_production")
        # Local development only: any token is a verified dev user;
        # "dev-unverified" simulates an unverified email; "dev:<name>" picks a user.
        token = creds.credentials
        if token == "dev-unverified":
            return TokenClaims(sub="dev|unverified", email="new@example.com", email_verified=False)
        name = token.split(":", 1)[1] if token.startswith("dev:") else "local-user"
        return TokenClaims(sub=f"dev|{name}", email=f"{name}@example.com", email_verified=True)

    if not settings.auth0_domain or not settings.auth0_audience:
        raise HTTPException(status_code=503, detail="auth_not_configured")
    try:
        return verifier.verify(creds.credentials)
    except TokenError as exc:
        log.info("Rejected token: %s", exc)  # never log the token itself
        raise _401("invalid_token") from exc
    except AuthUnavailable as exc:
        log.warning("Auth0 JWKS unreachable: %s", exc)
        raise HTTPException(status_code=503, detail="auth_unavailable") from exc


def upsert_user(db: Session, claims: TokenClaims) -> int:
    """Creates the users row on the first valid request (keyed by Auth0 `sub`)."""
    user_id = db.scalar(select(User.id).where(User.auth0_sub == claims.sub))
    if user_id is None:
        # ON CONFLICT DO NOTHING: safe if two first requests arrive at once.
        db.execute(insert(User).values(auth0_sub=claims.sub, email=claims.email).on_conflict_do_nothing())
        db.commit()
        user_id = db.scalar(select(User.id).where(User.auth0_sub == claims.sub))
    assert user_id is not None
    return user_id


def get_current_user(claims: TokenClaims = Depends(get_token_claims), db: Session = Depends(get_db)) -> CurrentUser:
    return CurrentUser(
        id=upsert_user(db, claims), sub=claims.sub, email=claims.email, email_verified=claims.email_verified
    )


def require_verified_email(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if not user.email_verified:
        raise HTTPException(status_code=403, detail="email_not_verified")
    return user


def require_admin_key(
    x_admin_api_key: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> None:
    if not settings.admin_api_key:
        raise HTTPException(status_code=503, detail="admin_not_configured")
    # compare_digest: constant-time comparison (doesn't leak the key via timing).
    if not x_admin_api_key or not secrets.compare_digest(x_admin_api_key, settings.admin_api_key):
        raise HTTPException(status_code=403, detail="forbidden")
