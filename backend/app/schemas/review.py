# AI-GENERATED (Cursor Agent) — Issue #10: Define review and recommendation contracts
# Owned by Backend Developer 2 (as5161).
# File-level AI attribution for this module (not per-symbol).
# Sources used (team-authored, not generated in this file):
# - docs/DATABASE_SCHEMA.md sections 3, 5, and 6 (columns, constraints, Worth Score)
# - .cursor/rules/project.mdc section 2 (review rules and anonymity)
# This module does not change Backend Developer 1 models, migrations, or routes.

"""Review and Community Worth Score JSON contracts.

Agreed shapes for later issues. No routes or queries live here.

Relationships (schema section 4): one user has many reviews; one course
has many reviews. ``user_id`` is resolved from the validated Auth0
``sub`` (``users.auth0_sub``). Clients never send it, and public
responses never include it.

Planned endpoints (not implemented in this issue):

- ``POST /courses/{course_id}/reviews`` — body ``ReviewCreate``,
  response ``ReviewPublic``. Auth required. ``409`` when this student
  already reviewed the course (unique ``user_id, course_id``).
  No update body: the MVP does not edit reviews.
- ``GET /courses/{course_id}/reviews`` — ``ReviewListResponse``.
  Public. ``limit`` default 20, max 100; ``offset`` default 0.
- ``GET /courses/{course_id}/worth-score`` — ``WorthScoreSummary``.
  Public. ``community_worth_score`` is null when there are no reviews.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

GoalCategory = Literal[
    "career_preparation",
    "skill_development",
    "academic_development",
    "degree_requirements",
    "personal_exploration",
]

WeeklyHoursRange = Literal["0-3", "3-6", "6-10", "10+"]


def _blank_to_none(value: object) -> object:
    if isinstance(value, str):
        stripped = value.strip()
        return stripped or None
    return value


class ReviewCreate(BaseModel):
    """Body for one new review. Identity and course id are not fields."""

    model_config = ConfigDict(extra="forbid")

    goals: list[GoalCategory] = Field(min_length=1)
    worth_score: int = Field(ge=1, le=5)
    concept_difficulty: int = Field(ge=1, le=5)
    weekly_hours_range: WeeklyHoursRange
    skills_gained: list[str] = Field(default_factory=list)
    feedback: str | None = None
    instructor_name: str | None = None
    semester: str | None = Field(default=None, max_length=30)

    @field_validator("goals")
    @classmethod
    def goals_are_unique(cls, value: list[str]) -> list[str]:
        if len(value) != len(set(value)):
            raise ValueError("goals must list each category at most once")
        return value

    @field_validator("skills_gained", mode="before")
    @classmethod
    def skills_are_nonblank(cls, value: object) -> object:
        if not isinstance(value, list):
            return value
        cleaned: list[str] = []
        for item in value:
            if not isinstance(item, str):
                return value
            text = item.strip()
            if not text:
                raise ValueError("skills_gained cannot contain blank items")
            cleaned.append(text)
        return cleaned

    @field_validator("feedback", "instructor_name", "semester", mode="before")
    @classmethod
    def empty_text_is_absent(cls, value: object) -> object:
        return _blank_to_none(value)


class ReviewPublic(BaseModel):
    """One review as other students see it. No reviewer identity."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    course_id: uuid.UUID
    goals: list[GoalCategory]
    worth_score: int = Field(ge=1, le=5)
    concept_difficulty: int = Field(ge=1, le=5)
    weekly_hours_range: WeeklyHoursRange
    skills_gained: list[str]
    feedback: str | None = None
    instructor_name: str | None = None
    semester: str | None = None
    created_at: datetime


class ReviewListResponse(BaseModel):
    """Public review page. Same paging envelope as course search."""

    results: list[ReviewPublic]
    total: int = Field(ge=0, description="Matching reviews before limit.")
    limit: int = Field(ge=1, le=100)
    offset: int = Field(ge=0)


class WorkloadCounts(BaseModel):
    """How many reviews reported each weekly hour range.

    These counts are not an input to the Community Worth Score.
    JSON keys are the schema's hour-range values.
    """

    model_config = ConfigDict(populate_by_name=True)

    range_0_3: int = Field(default=0, ge=0, alias="0-3")
    range_3_6: int = Field(default=0, ge=0, alias="3-6")
    range_6_10: int = Field(default=0, ge=0, alias="6-10")
    range_10_plus: int = Field(default=0, ge=0, alias="10+")

    def total(self) -> int:
        return self.range_0_3 + self.range_3_6 + self.range_6_10 + self.range_10_plus


class WorthScoreSummary(BaseModel):
    """Aggregates for one course.

    ``community_worth_score`` is the average of ``worth_score`` only.
    Difficulty and workload stay in their own fields. Unreviewed
    courses use null for both averages.
    """

    model_config = ConfigDict(extra="forbid")

    course_id: uuid.UUID
    community_worth_score: float | None = Field(default=None, ge=1, le=5)
    review_count: int = Field(ge=0)
    average_concept_difficulty: float | None = Field(default=None, ge=1, le=5)
    workload: WorkloadCounts = Field(default_factory=WorkloadCounts)

    @model_validator(mode="after")
    def averages_follow_review_count(self) -> WorthScoreSummary:
        if self.workload.total() != self.review_count:
            raise ValueError("workload counts must add up to review_count")
        if self.review_count == 0:
            if self.community_worth_score is not None:
                raise ValueError("unreviewed courses have no Community Worth Score")
            if self.average_concept_difficulty is not None:
                raise ValueError("unreviewed courses have no difficulty average")
        elif self.community_worth_score is None or self.average_concept_difficulty is None:
            raise ValueError("reviewed courses include both averages")
        return self
