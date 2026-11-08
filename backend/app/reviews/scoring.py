# AI-GENERATED (Cursor Agent) — Issue #13: Implement the Worth Score engine
# Owned by Backend Developer 2 (as5161).
# File-level AI attribution for this module (not per-symbol).
# Sources used (team-authored, not generated in this file):
# - docs/DATABASE_SCHEMA.md section 6 (SUM(worth_score) / COUNT, null when
#   unreviewed, difficulty and workload kept separate)
# - .cursor/rules/project.mdc section 2 (Worth Score is not difficulty,
#   workload, professor ratings, or grades)
# - backend/app/schemas/review.py WorthScoreSummary (Issue #10, not edited)
# - backend/app/db/models.py Review (read only; file not edited)

"""Community Worth Score aggregates for one course.

The score is the average of ``worth_score`` only. PostgreSQL ``AVG``
is that sum divided by the review count. Concept difficulty is averaged
on its own. Weekly hours are counts per allowed range.
"""

from __future__ import annotations

import uuid

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.db.models import Review
from app.schemas.review import WorkloadCounts, WorthScoreSummary

_HOUR_RANGES = ("0-3", "3-6", "6-10", "10+")


def _hour_count(hours: str):
    matched = case((Review.weekly_hours_range == hours, 1), else_=0)
    return func.coalesce(func.sum(matched), 0)


def worth_score_summary(db: Session, course_id: uuid.UUID) -> WorthScoreSummary:
    """Aggregate reviews for one course. Does not check that the course exists."""

    statement = select(
        func.count(Review.id),
        func.avg(Review.worth_score),
        func.avg(Review.concept_difficulty),
        *(_hour_count(hours) for hours in _HOUR_RANGES),
    ).where(Review.course_id == course_id)
    row = db.execute(statement).one()

    review_count = int(row[0] or 0)
    worth_avg = float(row[1]) if review_count and row[1] is not None else None
    difficulty_avg = float(row[2]) if review_count and row[2] is not None else None
    workload = WorkloadCounts(
        range_0_3=int(row[3] or 0),
        range_3_6=int(row[4] or 0),
        range_6_10=int(row[5] or 0),
        range_10_plus=int(row[6] or 0),
    )
    return WorthScoreSummary(
        course_id=course_id,
        community_worth_score=worth_avg,
        review_count=review_count,
        average_concept_difficulty=difficulty_avg,
        workload=workload,
    )
