# AI-GENERATED (Cursor Agent) — Issue #5: Generate and seed mock RIT data
# Owned by Backend Developer 1 (mamadub03).
# File-level AI attribution for this module (not per-symbol).
# Idempotent: safe to re-run; courses/users upserted; reviews skip duplicates.

"""Load fictional demo courses, users, and reviews into PostgreSQL."""

from __future__ import annotations

import sys
from pathlib import Path

# Allow `python scripts/seed_db.py` from backend/ without installing a package.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import select

from app.db.models import Course, Review, User
from app.db.seed_data import MOCK_COURSES, MOCK_REVIEWS, MOCK_USERS
from app.db.session import get_session_factory


def seed() -> None:
    """Upsert demo courses/users and insert missing fictional reviews."""
    session = get_session_factory()()
    try:
        course_by_code: dict[str, Course] = {}
        for row in MOCK_COURSES:
            course = session.scalar(select(Course).where(Course.code == row["code"]))
            if course is None:
                course = Course(**row)
                session.add(course)
            else:
                for key, value in row.items():
                    if key != "code":
                        setattr(course, key, value)
            course_by_code[row["code"]] = course

        session.flush()

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
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed()
