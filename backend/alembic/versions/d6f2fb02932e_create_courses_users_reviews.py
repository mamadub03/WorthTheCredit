# AI-GENERATED (Cursor Agent) — Issue #4: Implement database models
# Owned by Backend Developer 1 (mamadub03).
# File-level AI attribution for this module (not per-symbol).
# Matches docs/DATABASE_SCHEMA.md

"""create courses users reviews

Revision ID: d6f2fb02932e
Revises:
Create Date: 2026-11-07

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "d6f2fb02932e"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create courses, users, and reviews tables with schema constraints."""
    op.create_table(
        "courses",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("code", sa.String(length=20), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("department", sa.String(length=20), nullable=False),
        sa.Column("college", sa.Text(), nullable=True),
        sa.Column("campus", sa.Text(), nullable=True),
        sa.Column("credits", sa.Integer(), nullable=True),
        sa.Column("prerequisites", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("auth0_sub", sa.Text(), nullable=False),
        sa.Column("major", sa.Text(), nullable=True),
        sa.Column(
            "interests",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "skills",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column("career_goals", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("auth0_sub"),
    )

    op.create_table(
        "reviews",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("course_id", sa.UUID(), nullable=False),
        sa.Column("goals", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("worth_score", sa.SmallInteger(), nullable=False),
        sa.Column("concept_difficulty", sa.SmallInteger(), nullable=False),
        sa.Column("weekly_hours_range", sa.String(length=20), nullable=False),
        sa.Column(
            "skills_gained",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column("instructor_name", sa.Text(), nullable=True),
        sa.Column("semester", sa.String(length=30), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "worth_score BETWEEN 1 AND 5",
            name="ck_reviews_worth_score_range",
        ),
        sa.CheckConstraint(
            "concept_difficulty BETWEEN 1 AND 5",
            name="ck_reviews_concept_difficulty_range",
        ),
        sa.CheckConstraint(
            "weekly_hours_range IN ('0-3', '3-6', '6-10', '10+')",
            name="ck_reviews_weekly_hours_range",
        ),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "course_id", name="uq_reviews_user_course"),
    )
    op.create_index("ix_reviews_user_id", "reviews", ["user_id"], unique=False)
    op.create_index("ix_reviews_course_id", "reviews", ["course_id"], unique=False)


def downgrade() -> None:
    """Drop reviews, users, and courses."""
    op.drop_index("ix_reviews_course_id", table_name="reviews")
    op.drop_index("ix_reviews_user_id", table_name="reviews")
    op.drop_table("reviews")
    op.drop_table("users")
    op.drop_table("courses")
