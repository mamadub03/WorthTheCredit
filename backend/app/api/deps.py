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

from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import Auth0Claims, verify_access_token
from app.db.models import User
from app.db.session import get_db

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


# =============================================================================
# COMPONENT: get_current_user
# -----------------------------------------------------------------------------
# What: Validate JWT, then load-or-create the local `users` row by auth0_sub.
# =============================================================================
def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> AuthenticatedUser:
    """Require a valid Auth0 access token and resolve the app user."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    claims = verify_access_token(credentials.credentials)

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
