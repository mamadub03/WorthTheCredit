# AI-GENERATED (Cursor Agent) — Issue #5: Generate and seed mock RIT data
# Owned by Backend Developer 1 (mamadub03).
# ---------------------------------------------------------------------------
# FILE PURPOSE
#   CLI entrypoint that writes `app.db.seed_data` fixtures into PostgreSQL
#   (Tiger Data) using the Issue #4 SQLAlchemy models.
#
# HOW TO RUN (from backend/, with DATABASE_URL set in .env)
#   alembic upgrade head
#   python scripts/seed_db.py
#
# IDEMPOTENCY
#   Courses upsert by `code`. Users upsert by `auth0_sub`.
#   Reviews are inserted only when that user+course pair does not exist yet.
#
# AI ATTRIBUTION
#   Whole-file Cursor Agent authorship for Issue #5 (file-level tag only).
# ---------------------------------------------------------------------------

"""Load fictional demo courses, users, and reviews into PostgreSQL."""

from __future__ import annotations

import sys
from pathlib import Path

# -----------------------------------------------------------------------------
# COMPONENT: path bootstrap
# Make `app.*` imports work when this file is run as a script from backend/.
# -----------------------------------------------------------------------------
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import select

from app.db.models import Course, Review, User
from app.db.seed_data import MOCK_COURSES, MOCK_REVIEWS, MOCK_USERS
from app.db.session import get_session_factory


def seed() -> None:
    """Upsert demo courses/users and insert any missing fictional reviews.

    Steps:
      1. Open a DB session (requires DATABASE_URL).
      2. Upsert each mock course by unique course code.
      3. Upsert each mock user by unique auth0_sub.
      4. Insert reviews that are not already present for that user+course.
      5. Commit once at the end (rollback on error).
    """
    session = get_session_factory()()
    try:
        # -----------------------------------------------------------------
        # COMPONENT STEP: upsert courses
        # Create new Course rows or refresh fields on existing codes.
        # -----------------------------------------------------------------
        course_by_code: dict[str, Course] = {}
        for row in MOCK_COURSES:
            course = session.scalar(select(Course).where(Course.code == row["code"]))
            if course is None:
                # First run for this code — insert.
                course = Course(**row)
                session.add(course)
            else:
                # Re-seed — update mutable fields; keep the same primary key.
                for key, value in row.items():
                    if key != "code":
                        setattr(course, key, value)
            course_by_code[row["code"]] = course

        # Flush so course.id values exist before we attach reviews.
        session.flush()

        # -----------------------------------------------------------------
        # COMPONENT STEP: upsert users
        # Create new User rows or refresh profile fields on existing subs.
        # -----------------------------------------------------------------
        user_by_sub: dict[str, User] = {}
        for row in MOCK_USERS:
            user = session.scalar(select(User).where(User.auth0_sub == row["auth0_sub"]))
            if user is None:
                user = User(**row)
                session.add(user)
            else:
                for key, value in row.items():
                    if key != "auth0_sub":
                        setattr(user, key, value)
            user_by_sub[row["auth0_sub"]] = user

        session.flush()

        # -----------------------------------------------------------------
        # COMPONENT STEP: insert missing reviews
        # Skip when (user_id, course_id) already exists (unique constraint).
        # -----------------------------------------------------------------
        reviews_added = 0
        for row in MOCK_REVIEWS:
            user = user_by_sub[row["auth0_sub"]]
            course = course_by_code[row["course_code"]]
            existing = session.scalar(
                select(Review).where(
                    Review.user_id == user.id,
                    Review.course_id == course.id,
                )
            )
            if existing is not None:
                continue
            session.add(
                Review(
                    user_id=user.id,
                    course_id=course.id,
                    goals=row["goals"],
                    worth_score=row["worth_score"],
                    concept_difficulty=row["concept_difficulty"],
                    weekly_hours_range=row["weekly_hours_range"],
                    skills_gained=row["skills_gained"],
                    feedback=row["feedback"],
                    instructor_name=row["instructor_name"],
                    semester=row["semester"],
                )
            )
            reviews_added += 1

        session.commit()
        print(
            "Seed complete (DEMO DATA): "
            f"{len(MOCK_COURSES)} courses, {len(MOCK_USERS)} users, "
            f"{reviews_added} new reviews "
            f"({len(MOCK_REVIEWS) - reviews_added} reviews already present)."
        )
    except Exception:
        # Keep the database unchanged if any step fails.
        session.rollback()
        raise
    finally:
        session.close()


# -----------------------------------------------------------------------------
# COMPONENT: CLI entry
# `python scripts/seed_db.py` → run the full seed once.
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    seed()
