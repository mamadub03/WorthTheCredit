# AI-GENERATED (Cursor Agent) — Issues #6–#7: course search + details APIs
# Owned by Backend Developer 1 (mamadub03).
# File-level AI attribution for this module (not per-symbol).
#
# FILE PURPOSE
#   Public course discovery + details for Frontend 1 / Frontend 2.
#   No Auth0 required (browse is public in the MVP).
#
# ENDPOINTS
#   GET /courses              — search / filter / paginate
#   GET /courses/{course_id}  — one course + Worth Score aggregates

"""Course search and details routes."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db.models import Course, Review
from app.db.session import get_db
from app.schemas.course import CourseDetail, CourseSearchResponse, CourseSummary

router = APIRouter(prefix="/courses", tags=["courses"])


# =============================================================================
# COMPONENT: GET /courses (search)
# -----------------------------------------------------------------------------
# Query params (all optional; combined with AND when several are set):
#   q            — case-insensitive match on code, title, or description
#   code         — case-insensitive match on course code (substring OK)
#   department   — case-insensitive exact department (e.g. CSCI, SWEN)
#   limit/offset — simple pagination
# =============================================================================
@router.get("", response_model=CourseSearchResponse)
def search_courses(
    q: str | None = Query(
        default=None,
        description="Keyword matched against code, title, and description",
    ),
    code: str | None = Query(
        default=None,
        description="Filter by course code (case-insensitive contains)",
    ),
    department: str | None = Query(
        default=None,
        description="Filter by department code (case-insensitive exact)",
    ),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> CourseSearchResponse:
    """Return courses matching the given discovery filters."""
    filters = []

    if q is not None and q.strip():
        pattern = f"%{q.strip()}%"
        filters.append(
            or_(
                Course.code.ilike(pattern),
                Course.title.ilike(pattern),
                Course.description.ilike(pattern),
            )
        )

    if code is not None and code.strip():
        filters.append(Course.code.ilike(f"%{code.strip()}%"))

    if department is not None and department.strip():
        filters.append(Course.department.ilike(department.strip()))

    base = select(Course)
    count_stmt = select(func.count()).select_from(Course)
    if filters:
        for f in filters:
            base = base.where(f)
            count_stmt = count_stmt.where(f)

    total = db.scalar(count_stmt) or 0
    rows = db.scalars(
        base.order_by(Course.code).limit(limit).offset(offset)
    ).all()

    return CourseSearchResponse(
        results=[CourseSummary.model_validate(row) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


# =============================================================================
# COMPONENT: GET /courses/{course_id} (details)
# -----------------------------------------------------------------------------
# What: Single-course page data after a user clicks a search result.
# Flow: Frontend → this route → course row + AVG/COUNT over reviews.
# 404 when the UUID is not in the catalog.
# =============================================================================
@router.get("/{course_id}", response_model=CourseDetail)
def get_course_detail(
    course_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> CourseDetail:
    """Return one course with Community Worth Score aggregates."""
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    # ---------------------------------------------------------------------
    # COMPONENT STEP: review aggregates (MVP formula from DATABASE_SCHEMA)
    # Community Worth Score = SUM(worth_score) / COUNT(reviews)
    # Unreviewed courses → null score, review_count 0
    # ---------------------------------------------------------------------
    agg = db.execute(
        select(
            func.count(Review.id),
            func.avg(Review.worth_score),
            func.avg(Review.concept_difficulty),
        ).where(Review.course_id == course_id)
    ).one()
    review_count = int(agg[0] or 0)
    worth_avg = float(agg[1]) if agg[1] is not None else None
    difficulty_avg = float(agg[2]) if agg[2] is not None else None

    summary = CourseSummary.model_validate(course)
    return CourseDetail(
        **summary.model_dump(),
        community_worth_score=worth_avg,
        review_count=review_count,
        average_concept_difficulty=difficulty_avg,
    )
