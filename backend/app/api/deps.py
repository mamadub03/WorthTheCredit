# AI-GENERATED (Cursor Agent) — Issue #8: Integrate Auth0 backend authentication
# Owned by Backend Developer 1 (mamadub03).
# File-level AI attribution for this module (not per-symbol).
# ---------------------------------------------------------------------------
# FILE PURPOSE
#   FastAPI dependencies for protected routes.
#   Backend 2 review/AI routes should Depends(get_current_user) /
#   require_verified_email once those endpoints exist.
# ---------------------------------------------------------------------------

"""Reusable auth dependencies for protected API routes."""

from __future__ import annotations

from collections.abc import Generator
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import Auth0Claims, verify_access_token
from app.core.config import get_settings
from app.db.models import User
from app.db.session import get_session_factory

# =============================================================================
# COMPONENT: bearer scheme
# -----------------------------------------------------------------------------
# What: Extracts `Authorization: Bearer <token>` from the request.
# auto_error=False so we can return a consistent 401 body.
# =============================================================================
_bearer = HTTPBearer(auto_error=False)


@dataclass
class AuthenticatedUser:
    """DB user plus Auth0 claims for the current request."""

    user: User
    claims: Auth0Claims


def _require_bearer(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    """Return the raw JWT or raise 401 (runs before any DB access)."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials


def _db_session() -> Generator[Session, None, None]:
    """Yield a DB session after auth has already succeeded."""
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()


# =============================================================================
# COMPONENT: get_current_user
# -----------------------------------------------------------------------------
# What: Validate JWT first, then load-or-create the local `users` row.
# =============================================================================
def get_current_user(
    token: str = Depends(_require_bearer),
    db: Session = Depends(_db_session),
) -> AuthenticatedUser:
    """Require a valid Auth0 access token and resolve the app user."""
    claims = verify_access_token(token)

    user = db.scalar(select(User).where(User.auth0_sub == claims.sub))
    if user is None:
        # First authenticated request provisions a local profile row.
        user = User(auth0_sub=claims.sub)
        db.add(user)
        db.commit()
        db.refresh(user)

    return AuthenticatedUser(user=user, claims=claims)


# =============================================================================
# COMPONENT: require_verified_email
# -----------------------------------------------------------------------------
# What: Same as get_current_user, but rejects unverified emails (403).
# Use on review submit and other write actions (Backend 2).
# =============================================================================
def require_verified_email(
    auth: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    """Require Auth0 email_verified for protected write actions."""
    # Local testing switch (integration branch only); see Settings.skip_email_verification.
    if get_settings().skip_email_verification:
        return auth
    if not auth.claims.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Email verification required. Confirm your email in Auth0, and "
                "ensure the access token includes an email_verified claim "
                "(coordinate with Frontend 2 / Auth0 Actions)."
            ),
        )
    return auth
