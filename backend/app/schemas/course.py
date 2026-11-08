# AI-GENERATED (Cursor Agent) — Issue #6: Implement course search API
# Owned by Backend Developer 1 (mamadub03).
# File-level AI attribution for this module (not per-symbol).
# Contract for Frontend 1 (discovery) and Frontend 2 (links from reviews/AI).

"""Course API response models (search + shared summary shape)."""

from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field


# =============================================================================
# COMPONENT: CourseSummary
# -----------------------------------------------------------------------------
# What: One course card / list row returned by search (and reused later by
#       details / recommendations once those endpoints exist).
# Note: Worth Score aggregates are NOT included here yet — Backend 2 owns
#       review aggregation; Issue #7 will attach them on the details route.
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
