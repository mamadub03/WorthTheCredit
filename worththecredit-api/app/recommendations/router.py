"""POST /recommendations (auth).

400 "profile_required"       no profile in the body and none saved
429 "rate_limited"           more than RECOMMENDATIONS_PER_MINUTE requests in a minute
502 "recommendation_failed"  Gemini failed, or returned invalid JSON twice
503 "gemini_not_configured"  no GEMINI_API_KEY and USE_FAKE_GEMINI is off
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser, get_current_user
from app.config import Settings, get_settings
from app.db import get_db
from app.profile.router import load_profile
from app.ratelimit import RateLimiter
from app.recommendations.gemini import RecommendationModel, get_model
from app.recommendations.schemas import RecommendationsRequest, RecommendationsResponse
from app.recommendations.service import RecommendationFailed, recommend

router = APIRouter(tags=["recommendations"])

limiter = RateLimiter(max_calls=get_settings().recommendations_per_minute, per_seconds=60)


@router.post("/recommendations", response_model=RecommendationsResponse)
def post_recommendations(
    body: RecommendationsRequest,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    model: RecommendationModel | None = Depends(get_model),
) -> RecommendationsResponse:
    if not limiter.allow(str(user.id)):
        raise HTTPException(status_code=429, detail="rate_limited")
    profile = body.profile or load_profile(db, user.id)
    if profile is None:
        raise HTTPException(status_code=400, detail="profile_required")
    if model is None:
        raise HTTPException(status_code=503, detail="gemini_not_configured")
    try:
        return recommend(db, profile, body.query, model, settings.candidate_limit, settings.min_candidates)
    except RecommendationFailed as exc:
        raise HTTPException(status_code=502, detail="recommendation_failed") from exc
