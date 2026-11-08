# AI-GENERATED (Cursor Agent) — Issue #5: Generate and seed mock RIT data
# Owned by Backend Developer 1 (mamadub03).
# ---------------------------------------------------------------------------
# FILE PURPOSE
#   CLI entrypoint that upserts MOCK_COURSES into PostgreSQL (Tiger Data).
#
# MVP SCOPE
#   Courses only. Users/reviews are NOT seeded here.
#   Later: review forms create Worth Scores; Gemini uses those aggregates.
#
# HOW TO RUN (from backend/, with DATABASE_URL set in .env)
#   alembic upgrade head
#   python scripts/seed_db.py
#
# IDEMPOTENCY
#   Courses upsert by unique `code` (insert or refresh fields).
#
# AI ATTRIBUTION
#   Whole-file Cursor Agent authorship for Issue #5 (file-level tag only).
# ---------------------------------------------------------------------------

"""Load fictional demo courses into PostgreSQL (courses only)."""

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

from app.db.models import Course
from app.db.seed_data import MOCK_COURSES
from app.db.session import get_session_factory


def seed() -> None:
    """Upsert demo courses by unique course code.

    Steps:
      1. Open a DB session (requires DATABASE_URL).
      2. For each mock course: insert if new, else update fields.
      3. Commit once (rollback on error).
    """
    session = get_session_factory()()
    try:
        inserted = 0
        updated = 0

        # -----------------------------------------------------------------
        # COMPONENT STEP: upsert courses
        # -----------------------------------------------------------------
        for row in MOCK_COURSES:
            course = session.scalar(select(Course).where(Course.code == row["code"]))
            if course is None:
                session.add(Course(**row))
                inserted += 1
            else:
                for key, value in row.items():
                    if key != "code":
                        setattr(course, key, value)
                updated += 1

        session.commit()
        print(
            "Seed complete (DEMO COURSES ONLY): "
            f"{len(MOCK_COURSES)} catalog rows "
            f"({inserted} inserted, {updated} updated). "
            "No users/reviews seeded — those come from the review flow later."
        )
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


# -----------------------------------------------------------------------------
# COMPONENT: CLI entry
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    seed()
