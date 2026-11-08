# AI-GENERATED (Cursor Agent) — Issue #11: Implement review validation and policies
# Owned by Backend Developer 2 (as5161).
# File-level AI attribution for this module (not per-symbol).
# Sources used (team-authored, not generated in this file):
# - docs/DATABASE_SCHEMA.md sections 3 and 5 (columns, goal categories,
#   hour ranges, non-empty goals, unique user_id + course_id)
# - .cursor/rules/project.mdc section 2 (validation and one review per course)
# - backend/app/schemas/review.py ReviewCreate (Issue #10 contract, not edited)
# - backend/app/db/models.py Course and Review (read only; file not edited)
# This module does not add routes or write reviews.

"""Validation and duplicate rules for a new review.

Issue #12 will call ``prepare_review`` from the authenticated submit
route. ``user_id`` is ``users.id`` from Backend Developer 1's
``require_verified_email`` dependency, never a field in the body.

Suggested HTTP mapping for that later route:

- ``invalid_review`` -> 422
- ``unknown_course`` -> 404
- ``duplicate_review`` -> 409

There is no update path. The MVP does not edit reviews.
"""

from __future__ import annotations

import uuid

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Course, Review
from app.schemas.review import ReviewCreate


class ReviewPolicyError(Exception):
    """A review the API should refuse before insert."""

    def __init__(
        self,
        code: str,
        detail: str,
        errors: list[dict] | None = None,
    ) -> None:
        self.code = code
        self.detail = detail
        self.errors = errors or []
        super().__init__(detail)


def prepare_review(
    db: Session,
    *,
    user_id: uuid.UUID,
    course_id: uuid.UUID,
    payload: object,
) -> ReviewCreate:
    """Validate one new review and require that this pair is unused.

    Reads ``courses`` and ``reviews``. Does not insert.
    """

    try:
        review = ReviewCreate.model_validate(payload)
    except ValidationError as exc:
        raise ReviewPolicyError(
            "invalid_review",
            "Review fields are not valid",
            errors=list(exc.errors()),
        ) from exc

    course_exists = db.scalar(select(Course.id).where(Course.id == course_id))
    if course_exists is None:
        raise ReviewPolicyError("unknown_course", "Course not found")

    already_reviewed = db.scalar(
        select(Review.id).where(
            Review.user_id == user_id,
            Review.course_id == course_id,
        )
    )
    if already_reviewed is not None:
        raise ReviewPolicyError(
            "duplicate_review",
            "You already submitted a review for this course",
        )
    return review
