# AI-GENERATED (Cursor Agent) — Issue #12: Implement review submission API
# Owned by Backend Developer 2 (as5161).
# File-level AI attribution for this module (not per-symbol).
# Sources used (team-authored, not generated in this file):
# - docs/DATABASE_SCHEMA.md sections 3, 4, and 5 (review columns, relationships,
#   unique user_id + course_id, checks)
# - .cursor/rules/project.mdc section 2 (authenticated submit, no edits, anonymity)
# - backend/app/schemas/review.py ReviewCreate and ReviewPublic (Issue #10)
# - backend/app/reviews/policy.py prepare_review (Issue #11)
# - backend/app/api/deps.py require_verified_email (Backend Developer 1, not edited)
# - backend/app/db/models.py Review (read and inserted; file not edited)
# GET /courses/{course_id}/worth-score was added for Issue #13.
# Its query lives in backend/app/reviews/scoring.py.

"""Authenticated review submission and public Worth Score reads.

``POST /courses/{course_id}/reviews`` stores one review for the verified
student. ``user_id`` is ``users.id`` from the Auth0 token. The response
is ``ReviewPublic`` and does not include the reviewer. There is no
update or delete route in the MVP.

``GET /courses/{course_id}/worth-score`` is public. It returns the
Issue #13 aggregate and does not list reviewers.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import AuthenticatedUser, require_verified_email
from app.db.models import Course, Review
from app.db.session import get_db
from app.reviews.policy import ReviewPolicyError, prepare_review
from app.reviews.scoring import worth_score_summary
from app.schemas.review import ReviewCreate, ReviewPublic, WorthScoreSummary

router = APIRouter(prefix="/courses", tags=["reviews"])

_POLICY_STATUS = {
    "invalid_review": status.HTTP_422_UNPROCESSABLE_CONTENT,
    "unknown_course": status.HTTP_404_NOT_FOUND,
    "duplicate_review": status.HTTP_409_CONFLICT,
}


@router.post(
    "/{course_id}/reviews",
    response_model=ReviewPublic,
    status_code=status.HTTP_201_CREATED,
)
def submit_review(
    course_id: uuid.UUID,
    payload: ReviewCreate,
    auth: AuthenticatedUser = Depends(require_verified_email),
    db: Session = Depends(get_db),
) -> Review:
    """Validate, then store one review for this student and course."""

    try:
        review = prepare_review(
            db,
            user_id=auth.user.id,
            course_id=course_id,
            payload=payload,
        )
    except ReviewPolicyError as exc:
        raise HTTPException(
            status_code=_POLICY_STATUS[exc.code],
            detail=exc.detail,
        ) from exc

    row = Review(
        user_id=auth.user.id,
        course_id=course_id,
        goals=list(review.goals),
        worth_score=review.worth_score,
        concept_difficulty=review.concept_difficulty,
        weekly_hours_range=review.weekly_hours_range,
        skills_gained=list(review.skills_gained),
        feedback=review.feedback,
        instructor_name=review.instructor_name,
        semester=review.semester,
    )
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already submitted a review for this course",
        ) from None
    db.refresh(row)
    return row


@router.get("/{course_id}/worth-score", response_model=WorthScoreSummary)
def get_worth_score(
    course_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> WorthScoreSummary:
    """Return Worth Score, difficulty, and workload counts for one course."""

    if db.get(Course, course_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )
    return worth_score_summary(db, course_id)
