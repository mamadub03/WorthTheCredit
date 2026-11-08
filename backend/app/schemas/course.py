# AI-GENERATED (Cursor Agent) — Issues #6–#7: course API schemas
# Owned by Backend Developer 1 (mamadub03).
# File-level AI attribution for this module (not per-symbol).
# Contract for Frontend 1 (discovery/details) and Frontend 2 (links).

"""Course API response models (search, summary, and details)."""

from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field


# =============================================================================
# COMPONENT: CourseSummary
# -----------------------------------------------------------------------------
# What: One course card / list row returned by search.
# =============================================================================
class CourseSummary(BaseModel):
    """Public course fields safe to show in browse/search UIs."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    title: str
    description: str
    department: str
    college: str | None = None
    campus: str | None = None
    credits: int | None = None
    prerequisites: str | None = None


# =============================================================================
# COMPONENT: CourseSearchResponse
# -----------------------------------------------------------------------------
# What: Envelope for GET /courses so frontends get results + paging metadata.
# =============================================================================
class CourseSearchResponse(BaseModel):
    """Search results payload for course discovery."""

    results: list[CourseSummary]
    total: int = Field(description="Total rows matching filters (before limit).")
    limit: int
    offset: int


# =============================================================================
# COMPONENT: CourseDetail
# -----------------------------------------------------------------------------
# What: Full course page payload for GET /courses/{course_id}.
# Aggregates: Community Worth Score = AVG(worth_score); null if no reviews.
# Backend 2 may later own a shared scoring module; this endpoint exposes the
# MVP formula from docs/DATABASE_SCHEMA.md so Frontend can build now.
# =============================================================================
class CourseDetail(CourseSummary):
    """Course metadata plus review aggregates for the details page."""

    community_worth_score: float | None = Field(
        default=None,
        description="Average worth_score (1–5), or null when unreviewed.",
    )
    review_count: int = Field(
        default=0,
        description="Number of student reviews for this course.",
    )
    average_concept_difficulty: float | None = Field(
        default=None,
        description="Average concept_difficulty (1–5), or null when unreviewed.",
    )
