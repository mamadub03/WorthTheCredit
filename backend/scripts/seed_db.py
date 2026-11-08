# AI-GENERATED (Cursor Agent) — Issue #5 + demo review fixtures
# Owned by Backend Developer 1 (mamadub03).
# ---------------------------------------------------------------------------
# FILE PURPOSE
#   CLI entrypoint that upserts MOCK_COURSES and optional demo reviews into
#   PostgreSQL (Tiger Data).
#
# MVP / DEMO
#   Courses always seeded. Demo users + reviews seeded for Worth Scores and
#   Gemini recommender testing (seed|* auth0 subjects only).
#
# HOW TO RUN (from backend/, with DATABASE_URL set in .env)
#   alembic upgrade head
#   python scripts/seed_db.py
#
# IDEMPOTENCY
#   Courses upsert by unique `code`.
#   Users upsert by unique `auth0_sub`.
#   Reviews upsert by unique (user_id, course_id).
#
# AI ATTRIBUTION
#   Whole-file Cursor Agent authorship (file-level tag only).
# ---------------------------------------------------------------------------

"""Load fictional demo courses, seed users, and demo reviews."""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import select

from app.db.models import Course, Review, User
from app.db.seed_data import MOCK_COURSES
from app.db.seed_reviews import MOCK_REVIEWS, MOCK_SEED_USERS
from app.db.session import get_session_factory


def seed() -> None:
    """Upsert demo courses, seed users, and demo reviews."""
    session = get_session_factory()()
    try:
        courses_inserted = 0
        courses_updated = 0
        for row in MOCK_COURSES:
            course = session.scalar(select(Course).where(Course.code == row["code"]))
            if course is None:
                session.add(Course(**row))
                courses_inserted += 1
            else:
                for key, value in row.items():
                    if key != "code":
                        setattr(course, key, value)
                courses_updated += 1
        session.flush()

        users_inserted = 0
        users_updated = 0
        users_by_sub: dict[str, User] = {}
        for row in MOCK_SEED_USERS:
            user = session.scalar(select(User).where(User.auth0_sub == row["auth0_sub"]))
            if user is None:
                user = User(**row)
                session.add(user)
                users_inserted += 1
            else:
                for key, value in row.items():
                    if key != "auth0_sub":
                        setattr(user, key, value)
                users_updated += 1
            users_by_sub[row["auth0_sub"]] = user
        session.flush()

        courses_by_code = {
            c.code: c
            for c in session.scalars(select(Course)).all()
        }

        reviews_inserted = 0
        reviews_updated = 0
        reviews_skipped = 0
        for row in MOCK_REVIEWS:
            user = users_by_sub.get(row["auth0_sub"])
            course = courses_by_code.get(row["course_code"])
            if user is None or course is None:
                reviews_skipped += 1
                continue
            existing = session.scalar(
                select(Review).where(
                    Review.user_id == user.id,
                    Review.course_id == course.id,
                )
            )
            payload = {
                "goals": row["goals"],
                "worth_score": row["worth_score"],
                "concept_difficulty": row["concept_difficulty"],
                "weekly_hours_range": row["weekly_hours_range"],
                "skills_gained": row["skills_gained"],
                "feedback": row.get("feedback"),
                "instructor_name": row.get("instructor_name"),
                "semester": row.get("semester"),
            }
            if existing is None:
                session.add(
                    Review(user_id=user.id, course_id=course.id, **payload)
                )
                reviews_inserted += 1
            else:
                for key, value in payload.items():
                    setattr(existing, key, value)
                reviews_updated += 1

        session.commit()
        print(
            "Seed complete: "
            f"courses={len(MOCK_COURSES)} ({courses_inserted} inserted, {courses_updated} updated); "
            f"users={len(MOCK_SEED_USERS)} ({users_inserted} inserted, {users_updated} updated); "
            f"reviews={len(MOCK_REVIEWS)} ({reviews_inserted} inserted, {reviews_updated} updated"
            + (f", {reviews_skipped} skipped" if reviews_skipped else "")
            + ")."
        )
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed()
