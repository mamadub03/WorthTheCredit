"""`reviews` and `review_reports` tables.

The database itself enforces the important rules, so they hold even if a bug
or a race slips past the Python checks:
- UNIQUE (user_id, course_id): one review per student per course, any semester
- CHECK 1 ≤ worth_score ≤ 5 and 1 ≤ difficulty ≤ 5, at least one goal and skill
- Postgres ENUM types for goals, weekly_hours and report reasons
- UNIQUE (review_id, reporter_user_id): one report per user per review
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, ENUM
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.reviews.enums import GOAL_VALUES, HOURS_VALUES, REPORT_VALUES

goal_category_enum = ENUM(*GOAL_VALUES, name="goal_category", create_type=False)
weekly_hours_enum = ENUM(*HOURS_VALUES, name="weekly_hours", create_type=False)
report_reason_enum = ENUM(*REPORT_VALUES, name="report_reason", create_type=False)


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="uq_reviews_user_course"),
        CheckConstraint("worth_score BETWEEN 1 AND 5", name="worth_score_range"),
        CheckConstraint("difficulty BETWEEN 1 AND 5", name="difficulty_range"),
        CheckConstraint("cardinality(goals) >= 1", name="has_goal"),
        CheckConstraint("cardinality(skills) >= 1", name="has_skill"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), index=True)

    goals: Mapped[list[str]] = mapped_column(ARRAY(goal_category_enum))
    worth_score: Mapped[int] = mapped_column(Integer)
    skills: Mapped[list[str]] = mapped_column(ARRAY(Text))
    difficulty: Mapped[int] = mapped_column(Integer)
    weekly_hours: Mapped[str] = mapped_column(weekly_hours_enum)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    professor: Mapped[str | None] = mapped_column(String(100), nullable=True)
    semester: Mapped[str | None] = mapped_column(String(16), nullable=True)

    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", index=True)
    # Python-side default: Postgres now() is the *transaction* start time, which
    # would give several inserts in one transaction identical timestamps.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), server_default=func.now(), index=True
    )


class ReviewReport(Base):
    __tablename__ = "review_reports"
    __table_args__ = (UniqueConstraint("review_id", "reporter_user_id", name="uq_review_reports_once"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    review_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("reviews.id", ondelete="CASCADE"), index=True)
    reporter_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    reason: Mapped[str] = mapped_column(report_reason_enum)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
