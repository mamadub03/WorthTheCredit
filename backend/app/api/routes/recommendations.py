# AI-GENERATED (Cursor Agent) — Issue #16: Integrate Gemini recommendations
# Owned by Backend Developer 2 (as5161).
# File-level AI attribution for this module (not per-symbol).
# Sources used (team-authored, not generated in this file):
# - docs/DATABASE_SCHEMA.md section 7
# - .cursor/rules/project.mdc section 2
# - backend/app/recommendations/candidates.py (Issue #15, not edited)
# - backend/app/recommendations/gemini.py (this issue)
# - backend/app/api/deps.py require_verified_email (Backend Developer 1, not edited)

"""Authenticated recommendation endpoint.

``POST /recommendations`` retrieves database courses, asks Gemini to
rank that set, and returns explanations plus the stored Worth Score.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import AuthenticatedUser, require_verified_email
from app.db.session import get_db
from app.recommendations.candidates import retrieve_candidates
from app.recommendations.gemini import GeminiError, build_recommendations, rank_candidates
from app.schemas.recommendation import RecommendationRequest, RecommendationResponse

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.post("", response_model=RecommendationResponse)
def create_recommendations(
    payload: RecommendationRequest,
    auth: AuthenticatedUser = Depends(require_verified_email),
    db: Session = Depends(get_db),
) -> RecommendationResponse:
    """Rank retrieved courses for the verified student."""

    del auth
    candidates = retrieve_candidates(db, payload)
    try:
        drafts = rank_candidates(candidates, payload)
    except GeminiError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=exc.detail,
        ) from exc
    return build_recommendations(drafts, candidates)
