# AI-GENERATED (Cursor Agent) — Issue #14: Implement review retrieval API
# Owned by Backend Developer 2 (as5161).
# File-level AI attribution for this module (not per-symbol).
# Sources used: docs/DATABASE_SCHEMA.md sections 3 and 5;
# backend/app/reviews/retrieval.py (this issue).

"""Public review list checks. No live database."""

from __future__ import annotations

import unittest
import uuid
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.db.models import Course, Review
from app.db.session import get_db
from app.main import app
from app.reviews.retrieval import list_public_reviews


class ScalarRows:
    def __init__(self, rows: list[Review]) -> None:
        self._rows = rows

    def all(self) -> list[Review]:
        return self._rows


class FakeDb:
    def __init__(
        self,
        *,
        course: Course | None,
        rows: list[Review],
        total: int,
    ) -> None:
        self.course = course
        self.rows = rows
        self.total = total
        self.statements: list[object] = []

    def get(self, model: object, key: object) -> Course | None:
        del model, key
        return self.course

    def scalar(self, statement: object) -> int:
        self.statements.append(statement)
        return self.total

    def scalars(self, statement: object) -> ScalarRows:
        self.statements.append(statement)
        return ScalarRows(self.rows)


def _review(course_id: uuid.UUID, user_id: uuid.UUID) -> Review:
    return Review(
        id=uuid.uuid4(),
        user_id=user_id,
        course_id=course_id,
        goals=["career_preparation", "skill_development"],
        worth_score=4,
        concept_difficulty=3,
        weekly_hours_range="6-10",
        skills_gained=["critique"],
        feedback="Studio critiques were the useful part.",
        instructor_name="A. Rivera",
        semester="2231",
        created_at=datetime(2026, 11, 1, tzinfo=timezone.utc),
    )


class ReviewRetrievalTests(unittest.TestCase):
    def setUp(self) -> None:
        self.course_id = uuid.uuid4()
        self.user_id = uuid.uuid4()

    def test_page_keeps_context_and_drops_the_reviewer(self) -> None:
        row = _review(self.course_id, self.user_id)
        db = FakeDb(course=None, rows=[row], total=3)
        page = list_public_reviews(db, self.course_id, limit=1, offset=1)
        self.assertEqual(page.total, 3)
        self.assertEqual(page.limit, 1)
        self.assertEqual(page.offset, 1)
        public = page.results[0]
        self.assertEqual(public.goals, ["career_preparation", "skill_development"])
        self.assertEqual(public.skills_gained, ["critique"])
        self.assertEqual(public.weekly_hours_range, "6-10")
        self.assertEqual(public.instructor_name, "A. Rivera")
        self.assertEqual(public.semester, "2231")
        dumped = public.model_dump()
        self.assertNotIn("user_id", dumped)
        self.assertNotIn("auth0_sub", dumped)
        listing = str(db.statements[1])
        self.assertIn("reviews.course_id", listing)
        self.assertIn("ORDER BY", listing)
        self.assertIn("LIMIT", listing)
        self.assertIn("OFFSET", listing)
        self.assertNotIn("auth0_sub", listing)


class ReviewListRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.course_id = uuid.uuid4()
        self.client = TestClient(app)
        app.dependency_overrides.clear()

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def test_get_returns_a_public_page(self) -> None:
        user_id = uuid.uuid4()
        course = Course(
            id=self.course_id,
            code="ISTE-260",
            title="Designing the User Experience",
            description="DEMO DATA",
            department="ISTE",
        )
        db = FakeDb(
            course=course,
            rows=[_review(self.course_id, user_id)],
            total=1,
        )

        def override_db():
            yield db

        app.dependency_overrides[get_db] = override_db
        response = self.client.get(f"/courses/{self.course_id}/reviews")
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["total"], 1)
        self.assertEqual(body["limit"], 20)
        self.assertEqual(body["offset"], 0)
        review = body["results"][0]
        self.assertEqual(review["skills_gained"], ["critique"])
        self.assertEqual(review["weekly_hours_range"], "6-10")
        self.assertEqual(review["instructor_name"], "A. Rivera")
        self.assertEqual(review["semester"], "2231")
        self.assertNotIn("user_id", review)
        self.assertNotIn(str(user_id), response.text)

    def test_missing_course_is_404(self) -> None:
        db = FakeDb(course=None, rows=[], total=0)

        def override_db():
            yield db

        app.dependency_overrides[get_db] = override_db
        response = self.client.get(f"/courses/{self.course_id}/reviews")
        self.assertEqual(response.status_code, 404, response.text)
        self.assertEqual(db.statements, [])

    def test_limit_above_100_is_422(self) -> None:
        db = FakeDb(course=None, rows=[], total=0)

        def override_db():
            yield db

        app.dependency_overrides[get_db] = override_db
        response = self.client.get(
            f"/courses/{self.course_id}/reviews",
            params={"limit": 101},
        )
        self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(db.statements, [])


if __name__ == "__main__":
    unittest.main()
