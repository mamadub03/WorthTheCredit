# AI-GENERATED (Cursor Agent) — Issue #16: Integrate Gemini recommendations
# Owned by Backend Developer 2 (as5161).
# File-level AI attribution for this module (not per-symbol).
# Sources used (team-authored, not generated in this file):
# - docs/DATABASE_SCHEMA.md section 7 (send retrieved courses, Worth Scores,
#   and review insights; accept only existing course ids and explanations;
#   do not let Gemini calculate the Worth Score or invent courses)
# - .cursor/rules/project.mdc section 2 (descriptive match levels, no
#   fabricated details, no numeric match percentages)
# - backend/app/schemas/recommendation.py (Issue #10, not edited)
# - backend/app/recommendations/candidates.py (Issue #15, not edited)

"""Ask Gemini to rank courses FastAPI already retrieved.

The API key is ``GEMINI_API_KEY``. ``GEMINI_MODEL`` overrides the model
name and defaults to ``gemini-2.5-flash``. Neither value is hardcoded.
"""

from __future__ import annotations

import json
import os
from collections.abc import Callable, Sequence
from urllib.parse import quote

import httpx

from app.schemas.recommendation import (
    CourseCandidate,
    GeminiRecommendationDraft,
    RecommendationItem,
    RecommendationRequest,
    RecommendationResponse,
    unexpected_course_ids,
)

_DEFAULT_MODEL = "gemini-2.5-flash"
_TIMEOUT_SECONDS = 30.0

Complete = Callable[[str, dict], httpx.Response]


class GeminiError(Exception):
    """Gemini could not produce a ranking we can show."""

    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


def rank_candidates(
    candidates: Sequence[CourseCandidate],
    request: RecommendationRequest,
    *,
    api_key: str | None = None,
    complete: Complete | None = None,
) -> list[GeminiRecommendationDraft]:
    """Rank the retrieved courses. An empty candidate list skips the call."""

    if not candidates:
        return []

    key = (api_key if api_key is not None else os.environ.get("GEMINI_API_KEY", "")).strip()
    if not key:
        raise GeminiError("GEMINI_API_KEY is not set")

    model = os.environ.get("GEMINI_MODEL", _DEFAULT_MODEL).strip() or _DEFAULT_MODEL
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{quote(model, safe='')}:generateContent"
    )
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": _prompt(request, candidates)}],
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }
    sender = complete or _post
    try:
        response = sender(f"{url}?key={key}", payload)
    except httpx.HTTPError as exc:
        raise GeminiError("Gemini request failed") from exc
    if response.status_code != 200:
        raise GeminiError("Gemini request failed")
    try:
        body = response.json()
        text = body["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise GeminiError("Gemini response could not be read") from exc
    return _drafts_from_text(text, candidates)


def build_recommendations(
    drafts: Sequence[GeminiRecommendationDraft],
    candidates: Sequence[CourseCandidate],
) -> RecommendationResponse:
    """Attach database course facts to a validated Gemini ranking."""

    by_id = {candidate.course.id: candidate for candidate in candidates}
    items: list[RecommendationItem] = []
    for draft in drafts:
        candidate = by_id[draft.course_id]
        items.append(
            RecommendationItem(
                course=candidate.course,
                match_level=draft.match_level,
                explanation=draft.explanation,
                community_worth_score=candidate.insights.community_worth_score,
                review_count=candidate.insights.review_count,
            )
        )
    return RecommendationResponse(recommendations=items)


def _post(url: str, payload: dict) -> httpx.Response:
    return httpx.post(url, json=payload, timeout=_TIMEOUT_SECONDS)


def _prompt(
    request: RecommendationRequest,
    candidates: Sequence[CourseCandidate],
) -> str:
    material = {
        "student": request.model_dump(mode="json"),
        "candidates": [
            candidate.model_dump(mode="json", by_alias=True) for candidate in candidates
        ],
    }
    return (
        "Rank these existing WorthTheCredit courses for the student. "
        "Return a JSON object with a recommendations array. Each item has "
        "course_id, match_level, and explanation. match_level must be "
        "strong_match, good_match, partial_match, or exploratory. "
        "Use only course_id values from candidates. Do not invent courses, "
        "reviews, skills, or a Worth Score. Do not use a numeric match "
        "percentage. Do not claim prerequisites are satisfied.\n"
        + json.dumps(material)
    )


def _drafts_from_text(
    text: str,
    candidates: Sequence[CourseCandidate],
) -> list[GeminiRecommendationDraft]:
    try:
        data = json.loads(text)
        items = data["recommendations"]
    except (json.JSONDecodeError, KeyError, TypeError) as exc:
        raise GeminiError("Gemini response was not a recommendation list") from exc
    if not isinstance(items, list):
        raise GeminiError("Gemini response was not a recommendation list")

    drafts: list[GeminiRecommendationDraft] = []
    seen: set = set()
    for item in items:
        try:
            draft = GeminiRecommendationDraft.model_validate(item)
        except ValueError as exc:
            raise GeminiError("Gemini explanation or match level was not valid") from exc
        if draft.course_id in seen:
            raise GeminiError("Gemini repeated a course")
        seen.add(draft.course_id)
        drafts.append(draft)

    if unexpected_course_ids(drafts, candidates):
        raise GeminiError("Gemini returned a course that was not retrieved")
    return drafts
