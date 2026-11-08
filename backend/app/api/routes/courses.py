# AI-GENERATED (Cursor Agent) — Issue #6: Implement course search API
# Owned by Backend Developer 1 (mamadub03).
# File-level AI attribution for this module (not per-symbol).
#
# FILE PURPOSE
#   Public course discovery endpoints for Frontend 1 / Frontend 2.
#   Search does not require Auth0 (browse is public in the MVP).
#
# ENDPOINTS
#   GET /courses — filter by q (keyword), code, department; paginate.

"""Course search routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db.models import Course
from app.db.session import get_db
from app.schemas.course import CourseSearchResponse, CourseSummary

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
