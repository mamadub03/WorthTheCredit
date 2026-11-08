"""BE2: reviews, review_reports, student_profiles (+ enum types and search index).

Revision ID: 0002_be2
Revises: 0001_be1_stubs   ← change to BE1's latest revision when merging
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0002_be2"
down_revision = "0001_be1_stubs"
branch_labels = None
depends_on = None

GOALS = (
    "career_preparation",
    "skill_development",
    "academic_development",
    "degree_requirement",
    "personal_exploration",
)
HOURS = ("0-3", "4-6", "7-9", "10-12", "13+")
REASONS = ("spam", "fake", "inappropriate", "off_topic", "other")

goal_enum = postgresql.ENUM(*GOALS, name="goal_category", create_type=False)
hours_enum = postgresql.ENUM(*HOURS, name="weekly_hours", create_type=False)
reason_enum = postgresql.ENUM(*REASONS, name="report_reason", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    for e in (goal_enum, hours_enum, reason_enum):
        e.create(bind, checkfirst=True)

    op.create_table(
        "reviews",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("goals", postgresql.ARRAY(goal_enum), nullable=False),
        sa.Column("worth_score", sa.Integer(), nullable=False),
        sa.Column("skills", postgresql.ARRAY(sa.Text()), nullable=False),
        sa.Column("difficulty", sa.Integer(), nullable=False),
        sa.Column("weekly_hours", hours_enum, nullable=False),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column("professor", sa.String(100), nullable=True),
        sa.Column("semester", sa.String(16), nullable=True),
        sa.Column("is_hidden", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_reviews"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_reviews_user_id_users", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], name="fk_reviews_course_id_courses", ondelete="CASCADE"),
        # One review per student per course, regardless of semester — enforced by the DB.
        sa.UniqueConstraint("user_id", "course_id", name="uq_reviews_user_course"),
        sa.CheckConstraint("worth_score BETWEEN 1 AND 5", name="worth_score_range"),
        sa.CheckConstraint("difficulty BETWEEN 1 AND 5", name="difficulty_range"),
        sa.CheckConstraint("cardinality(goals) >= 1", name="has_goal"),
        sa.CheckConstraint("cardinality(skills) >= 1", name="has_skill"),
    )
    op.create_index("ix_reviews_user_id", "reviews", ["user_id"])
    op.create_index("ix_reviews_course_id", "reviews", ["course_id"])
    op.create_index("ix_reviews_is_hidden", "reviews", ["is_hidden"])
    op.create_index("ix_reviews_created_at", "reviews", ["created_at"])

    op.create_table(
        "review_reports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("review_id", sa.Uuid(), nullable=False),
        sa.Column("reporter_user_id", sa.Integer(), nullable=False),
        sa.Column("reason", reason_enum, nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_review_reports"),
        sa.ForeignKeyConstraint(
            ["review_id"], ["reviews.id"], name="fk_review_reports_review_id_reviews", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["reporter_user_id"], ["users.id"], name="fk_review_reports_reporter_user_id_users", ondelete="CASCADE"
        ),
        sa.UniqueConstraint("review_id", "reporter_user_id", name="uq_review_reports_once"),
    )
    op.create_index("ix_review_reports_review_id", "review_reports", ["review_id"])

    op.create_table(
        "student_profiles",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("major", sa.String(100), nullable=False),
        sa.Column("interests", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=False),
        sa.Column("skills", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=False),
        sa.Column("career_goals", sa.Text(), server_default="", nullable=False),
        sa.Column("personal_interests", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=False),
        sa.Column("degree_requirements", sa.Text(), server_default="", nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("user_id", name="pk_student_profiles"),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_student_profiles_user_id_users", ondelete="CASCADE"
        ),
    )

    # Full-text search index over the course catalog, used by recommendations.
    # (Expression index on BE1's table; it doesn't change BE1's columns.)
    op.execute(
        "CREATE INDEX ix_courses_fts ON courses USING gin (to_tsvector('english', "
        "coalesce(title,'') || ' ' || coalesce(department,'') || ' ' || coalesce(description,'')))"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_courses_fts")
    op.drop_table("student_profiles")
    op.drop_table("review_reports")
    op.drop_table("reviews")
    bind = op.get_bind()
    for e in (reason_enum, hours_enum, goal_enum):
        e.drop(bind, checkfirst=True)
