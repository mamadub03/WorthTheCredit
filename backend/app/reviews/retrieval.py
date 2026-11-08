# AI-GENERATED (Cursor Agent) — Issue #14: Implement review retrieval API
# Owned by Backend Developer 2 (as5161).
# File-level AI attribution for this module (not per-symbol).
# Sources used (team-authored, not generated in this file):
# - docs/DATABASE_SCHEMA.md sections 3 and 5 (public review fields,
#   goals, skills, weekly hours, instructor and semester context)
# - .cursor/rules/project.mdc section 2 (reviews are anonymous to other students)
# - backend/app/schemas/review.py ReviewPublic and ReviewListResponse
#   (Issue #10, not edited)
# - backend/app/db/models.py Review (read only; file not edited)

"""Public review pages for one course.

Rows are newest first. ``ReviewPublic`` drops ``user_id``, so the page
includes goals, skills, weekly hours, and optional instructor or
semester context without the reviewer.
"""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Review
from app.schemas.review import ReviewListResponse, ReviewPublic


def list_public_reviews(
    db: Session,
    course_id: uuid.UUID,
    *,
    limit: int,
    offset: int,
) -> ReviewListResponse:
    """Return one page of anonymous reviews. Does not check the course row."""

    total = (
        db.scalar(
            select(func.count())
            .select_from(Review)
            .where(Review.course_id == course_id)
        )
        or 0
    )
    rows = db.scalars(
        select(Review)
        .where(Review.course_id == course_id)
        .order_by(Review.created_at.desc(), Review.id.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    return ReviewListResponse(
        results=[ReviewPublic.model_validate(row) for row in rows],
        total=int(total),
        limit=limit,
        offset=offset,
    )
