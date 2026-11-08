# AI-GENERATED (Cursor Agent) — Issue #4: Implement database models
# Owned by Backend Developer 1 (mamadub03).
# File-level AI attribution for this module (not per-symbol).
# Source of truth: docs/DATABASE_SCHEMA.md

"""SQLAlchemy ORM models for courses, users, and reviews."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Course(Base):
    """RIT-style course record used for discovery and recommendations."""

    __tablename__ = "courses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    department: Mapped[str] = mapped_column(String(20), nullable=False)
    college: Mapped[str | None] = mapped_column(Text, nullable=True)
    campus: Mapped[str | None] = mapped_column(Text, nullable=True)
    credits: Mapped[int | None] = mapped_column(nullable=True)
    prerequisites: Mapped[str | None] = mapped_column(Text, nullable=True)

    reviews: Mapped[list[Review]] = relationship(back_populates="course")


class User(Base):
    """Student profile linked to an Auth0 subject (no passwords stored)."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    auth0_sub: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    major: Mapped[str | None] = mapped_column(Text, nullable=True)
    interests: Mapped[list] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'[]'::jsonb"),
    )
    skills: Mapped[list] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'[]'::jsonb"),
    )
    career_goals: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    reviews: Mapped[list[Review]] = relationship(back_populates="user")


class Review(Base):
    """One student experience for one course (unique per user+course)."""

    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="uq_reviews_user_course"),
        CheckConstraint(
            "worth_score BETWEEN 1 AND 5",
            name="ck_reviews_worth_score_range",
        ),
        CheckConstraint(
            "concept_difficulty BETWEEN 1 AND 5",
            name="ck_reviews_concept_difficulty_range",
        ),
        CheckConstraint(
            "weekly_hours_range IN ('0-3', '3-6', '6-10', '10+')",
            name="ck_reviews_weekly_hours_range",
        ),
        Index("ix_reviews_user_id", "user_id"),
        Index("ix_reviews_course_id", "course_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
    )
    goals: Mapped[list] = mapped_column(JSONB, nullable=False)
    worth_score: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    concept_difficulty: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    weekly_hours_range: Mapped[str] = mapped_column(String(20), nullable=False)
    skills_gained: Mapped[list] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'[]'::jsonb"),
    )
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    instructor_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    semester: Mapped[str | None] = mapped_column(String(30), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    user: Mapped[User] = relationship(back_populates="reviews")
    course: Mapped[Course] = relationship(back_populates="reviews")
