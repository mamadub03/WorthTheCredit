# AI-GENERATED (Cursor Agent) — Issue #10: Define review and recommendation contracts
# Owned by Backend Developer 2 (as5161).
# File-level AI attribution for this module (not per-symbol).
# Sources used (team-authored, not generated in this file):
# - docs/DATABASE_SCHEMA.md section 7 (fields Gemini may use, and the eight rules)
# - .cursor/rules/project.mdc section 2 (descriptive match levels, no invented courses)
# - backend/app/schemas/course.py CourseSummary (imported only; file not edited)
# - backend/app/schemas/review.py Worth Score and goal types (this issue)
# This module does not change Backend Developer 1 models, migrations, or routes.

"""Recommendation JSON contracts.

FastAPI retrieves candidates. Gemini only ranks and explains that set.
Gemini does not calculate the Community Worth Score and does not return
a numeric match percentage.

Planned endpoint (not implemented in this issue):

- ``POST /recommendations`` — body ``RecommendationRequest``,
  response ``RecommendationResponse``. Auth required.
  Each item links to an existing course via ``CourseSummary.id``.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.course import CourseSummary
from app.schemas.review import GoalCategory, WorthScoreSummary

MatchLevel = Literal["strong_match", "good_match", "partial_match", "exploratory"]


def _clean_phrases(value: object) -> object:
    if not isinstance(value, list):
        return value
    cleaned: list[str] = []
    for item in value:
        if not isinstance(item, str):
            return value
        text = item.strip()
        if not text:
            raise ValueError("list items cannot be blank")
        cleaned.append(text)
    return cleaned


class RecommendationRequest(BaseModel):
    """Student objectives used to retrieve course candidates.

    These fields mirror profile input from schema section 7.
    ``academic_goals`` is request-only; it is not a ``users`` column.
    This body does not update the users table.
    """

    model_config = ConfigDict(extra="forbid")

    major: str | None = None
    interests: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    career_goals: str | None = None
    academic_goals: str | None = None
    # Optional resume paste for this request only. Never persisted by the API.
    resume_text: str | None = Field(default=None, max_length=8000)

    @field_validator("major", "career_goals", "academic_goals", "resume_text", mode="before")
    @classmethod
    def empty_text_is_absent(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value

    @field_validator("interests", "skills", mode="before")
    @classmethod
    def phrases_are_nonblank(cls, value: object) -> object:
        return _clean_phrases(value)

    @model_validator(mode="after")
    def has_a_preference(self) -> RecommendationRequest:
        has_text = any((self.major, self.career_goals, self.academic_goals, self.resume_text))
        if not has_text and not self.interests and not self.skills:
            raise ValueError(
                "Provide a major, interest, skill, career goal, academic goal, or resume text"
            )
        return self


class CourseCandidate(BaseModel):
    """One database course FastAPI may send to Gemini.

    ``course`` reuses Backend Developer 1's public course card, which
    also includes college and campus. Schema section 7 requires code,
    title, description, department, credits, and prerequisites.
    Review text in ``feedback`` must already exist in the database.
    """

    model_config = ConfigDict(extra="forbid")

    course: CourseSummary
    insights: WorthScoreSummary
    goal_categories: list[GoalCategory] = Field(default_factory=list)
    skills_gained: list[str] = Field(default_factory=list)
    feedback: list[str] = Field(
        default_factory=list,
        description="Existing written review text only.",
    )

    @field_validator("goal_categories")
    @classmethod
    def goals_are_unique(cls, value: list[str]) -> list[str]:
        if len(value) != len(set(value)):
            raise ValueError("goal_categories must not contain duplicates")
        return value

    @field_validator("skills_gained", "feedback", mode="before")
    @classmethod
    def phrases_are_nonblank(cls, value: object) -> object:
        return _clean_phrases(value)

    @model_validator(mode="after")
    def insights_match_course(self) -> CourseCandidate:
        if self.insights.course_id != self.course.id:
            raise ValueError("insights.course_id must match course.id")
        return self


class GeminiRecommendationDraft(BaseModel):
    """One Gemini ranking FastAPI accepts before attaching database facts.

    ``course_id`` must be a member of the candidate set. The Worth Score
    is attached later from PostgreSQL, so this draft has no score field
    and no match percentage.
    """

    model_config = ConfigDict(extra="forbid")

    course_id: uuid.UUID
    match_level: MatchLevel
    explanation: str = Field(min_length=1)

    @field_validator("explanation", mode="before")
    @classmethod
    def explanation_is_text(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


class RecommendationItem(BaseModel):
    """One recommendation returned to the client."""

    model_config = ConfigDict(extra="forbid")

    course: CourseSummary
    match_level: MatchLevel
    explanation: str = Field(min_length=1)
    community_worth_score: float | None = Field(default=None, ge=1, le=5)
    review_count: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def score_follows_reviews(self) -> RecommendationItem:
        if self.review_count == 0 and self.community_worth_score is not None:
            raise ValueError("unreviewed courses have no Community Worth Score")
        if self.review_count > 0 and self.community_worth_score is None:
            raise ValueError("reviewed courses include a Community Worth Score")
        return self


class RecommendationResponse(BaseModel):
    """Ranked recommendations. Every course already exists in the database."""

    model_config = ConfigDict(extra="forbid")

    recommendations: list[RecommendationItem]


def unexpected_course_ids(
    drafts: Sequence[GeminiRecommendationDraft],
    candidates: Sequence[CourseCandidate],
) -> list[uuid.UUID]:
    """IDs Gemini returned that FastAPI did not retrieve.

    Schema section 7: Gemini may only return existing candidate course IDs.
    Callers reject the model output when this list is not empty.
    """

    allowed = {candidate.course.id for candidate in candidates}
    return [draft.course_id for draft in drafts if draft.course_id not in allowed]
