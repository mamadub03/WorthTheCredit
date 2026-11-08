"""Review endpoints.

POST /reviews                          auth + verified email → 201 | 403 | 404 | 409 | 422
GET  /reviews/me?course_code=          auth → { course_code, has_reviewed, review }
GET  /courses/{course_code}/reviews    PUBLIC, anonymous, newest first, ?professor=&limit=&offset=
POST /reviews/{review_id}/report       auth → 201 | 404 | 409 | 422
POST /admin/reviews/{review_id}/hide   X-Admin-Api-Key → hide (and /unhide to restore)

There is intentionally no PUT/PATCH/DELETE for reviews (no editing in the MVP).
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser, get_current_user, require_admin_key, require_verified_email
from app.be1_stubs.models import Course
from app.be1_stubs.queries import get_course_by_code
from app.db import get_db
from app.reviews.models import Review, ReviewReport
from app.reviews.schemas import (
    HiddenOut,
    MyReviewStatus,
    ReportCreate,
    ReportOut,
    ReviewCreate,
    ReviewOut,
    ReviewPage,
)

router = APIRouter(tags=["reviews"])


def to_out(review: Review, course_code: str) -> ReviewOut:
    """The ONLY way reviews leave the API: whitelist of non-identifying fields."""
    return ReviewOut(
        id=review.id,
        course_code=course_code,
        goals=list(review.goals),
        worth_score=review.worth_score,
        skills=list(review.skills),
        difficulty=review.difficulty,
        weekly_hours=review.weekly_hours,
        feedback=review.feedback,
        professor=review.professor,
        semester=review.semester,
        created_at=review.created_at,
    )


def _course_or_404(db: Session, code: str) -> Course:
    course = get_course_by_code(db, code)
    if course is None:
        raise HTTPException(status_code=404, detail="course_not_found")
    return course


@router.post("/reviews", response_model=ReviewOut, status_code=201)
def create_review(
    body: ReviewCreate,
    user: CurrentUser = Depends(require_verified_email),
    db: Session = Depends(get_db),
) -> ReviewOut:
    course = _course_or_404(db, body.course_code)

    # Friendly early check; the database UNIQUE constraint is the real guarantee.
    if db.scalar(select(Review.id).where(Review.user_id == user.id, Review.course_id == course.id)):
        raise HTTPException(status_code=409, detail="already_reviewed")

    review = Review(
        user_id=user.id,
        course_id=course.id,
        goals=list(body.goals),
        worth_score=body.worth_score,
        skills=body.skills,
        difficulty=body.difficulty,
        weekly_hours=body.weekly_hours,
        feedback=body.feedback,
        professor=body.professor,
        semester=body.semester,
    )
    db.add(review)
    try:
        db.commit()
    except IntegrityError as exc:  # two simultaneous submits: the DB rejects the second
        db.rollback()
        if "uq_reviews_user_course" in str(exc.orig):
            raise HTTPException(status_code=409, detail="already_reviewed") from exc
        raise
    db.refresh(review)
    return to_out(review, course.code)


@router.get("/reviews/me", response_model=MyReviewStatus)
def my_review(
    course_code: str = Query(min_length=3, max_length=16),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MyReviewStatus:
    course = _course_or_404(db, course_code)
    review = db.scalar(select(Review).where(Review.user_id == user.id, Review.course_id == course.id))
    return MyReviewStatus(
        course_code=course.code,
        has_reviewed=review is not None,
        review=to_out(review, course.code) if review else None,
    )


@router.get("/courses/{course_code}/reviews", response_model=ReviewPage)
def list_course_reviews(
    course_code: str,
    professor: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> ReviewPage:
    course = _course_or_404(db, course_code)
    where = [Review.course_id == course.id, Review.is_hidden.is_(False)]
    if professor and professor.strip():
        where.append(func.lower(func.trim(Review.professor)) == professor.strip().lower())
    total = db.scalar(select(func.count()).select_from(Review).where(*where)) or 0
    rows = db.scalars(
        select(Review).where(*where).order_by(Review.created_at.desc(), Review.id).limit(limit).offset(offset)
    ).all()
    return ReviewPage(items=[to_out(r, course.code) for r in rows], total=total, limit=limit, offset=offset)


@router.post("/reviews/{review_id}/report", response_model=ReportOut, status_code=201)
def report_review(
    review_id: uuid.UUID,
    body: ReportCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReportOut:
    review = db.get(Review, review_id)
    if review is None or review.is_hidden:
        raise HTTPException(status_code=404, detail="review_not_found")
    db.add(ReviewReport(review_id=review.id, reporter_user_id=user.id, reason=body.reason, note=body.note))
    try:
        db.commit()
    except IntegrityError as exc:  # UNIQUE (review_id, reporter_user_id)
        db.rollback()
        raise HTTPException(status_code=409, detail="already_reported") from exc
    return ReportOut()


def _set_hidden(db: Session, review_id: uuid.UUID, hidden: bool) -> HiddenOut:
    review = db.get(Review, review_id)
    if review is None:
        raise HTTPException(status_code=404, detail="review_not_found")
    review.is_hidden = hidden
    db.commit()
    return HiddenOut(id=review.id, is_hidden=review.is_hidden)


@router.post("/admin/reviews/{review_id}/hide", response_model=HiddenOut, tags=["admin"])
def hide_review(review_id: uuid.UUID, _: None = Depends(require_admin_key), db: Session = Depends(get_db)):
    return _set_hidden(db, review_id, True)


@router.post("/admin/reviews/{review_id}/unhide", response_model=HiddenOut, tags=["admin"])
def unhide_review(review_id: uuid.UUID, _: None = Depends(require_admin_key), db: Session = Depends(get_db)):
    return _set_hidden(db, review_id, False)
