# AI-GENERATED (Cursor Agent) — Issue #8: Integrate Auth0 backend authentication
# Owned by Backend Developer 1 (mamadub03).
# File-level AI attribution for this module (not per-symbol).
# ---------------------------------------------------------------------------
# FILE PURPOSE
#   Smoke-test routes so Frontend 2 can verify Bearer tokens against FastAPI
#   before review/AI write endpoints exist.
# ---------------------------------------------------------------------------

"""Auth-related HTTP routes."""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict

from app.api.deps import AuthenticatedUser, get_current_user, require_verified_email

router = APIRouter(prefix="/auth", tags=["auth"])


# =============================================================================
# COMPONENT: response schemas (local to auth smoke routes)
# =============================================================================
class AuthMeResponse(BaseModel):
    """Current user profile visible after a successful JWT check."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    auth0_sub: str
    major: str | None
    interests: list
    skills: list
    career_goals: str | None
    created_at: datetime
    email_verified: bool


# =============================================================================
# COMPONENT: GET /auth/me
# -----------------------------------------------------------------------------
# What: Proves JWT validation + user provisioning works for Frontend 2.
# Auth: valid Bearer token required (email verification NOT required here).
# =============================================================================
@router.get("/me", response_model=AuthMeResponse)
def read_me(auth: AuthenticatedUser = Depends(get_current_user)) -> AuthMeResponse:
    """Return the authenticated local user (creates the row on first call)."""
    user = auth.user
    return AuthMeResponse(
        id=user.id,
        auth0_sub=user.auth0_sub,
        major=user.major,
        interests=list(user.interests or []),
        skills=list(user.skills or []),
        career_goals=user.career_goals,
        created_at=user.created_at,
        email_verified=auth.claims.email_verified,
    )


# =============================================================================
# COMPONENT: GET /auth/verified-check
# -----------------------------------------------------------------------------
# What: Smoke endpoint that enforces email_verified (same gate as review submit).
# =============================================================================
@router.get("/verified-check")
def verified_check(
    auth: AuthenticatedUser = Depends(require_verified_email),
) -> dict[str, str]:
    """Return OK only when the token carries a verified email claim."""
    return {
        "status": "ok",
        "auth0_sub": auth.user.auth0_sub,
        "detail": "Email verified claim present — write actions may proceed.",
    }
