# AI-GENERATED (Cursor Agent) — Issue #13: Implement the Worth Score engine
# Owned by Backend Developer 2 (as5161).
# File-level AI attribution for this module (not per-symbol).
# Sources used: docs/DATABASE_SCHEMA.md section 6;
# backend/app/reviews/scoring.py (this issue).

"""Worth Score aggregate checks. No live database."""

from __future__ import annotations

import unittest
import uuid

from fastapi.testclient import TestClient

from app.db.models import Course
from app.db.session import get_db
from app.main import app
from app.reviews.scoring import worth_score_summary


class FakeExecute:
    def __init__(self, row: tuple) -> None:
        self._row = row

    def one(self) -> tuple:
        return self._row


class FakeDb:
    def __init__(self, row: tuple, *, course: Course | None) -> None:
        self.row = row
        self.course = course
        self.statements: list[object] = []
        self.lookups = 0

    def execute(self, statement: object) -> FakeExecute:
        self.statements.append(statement)
        return FakeExecute(self.row)

    def get(self, model: object, key: object) -> Course | None:
        del model, key
        self.lookups += 1
        return self.course


class WorthScoreEngineTests(unittest.TestCase):
    def setUp(self) -> None:
        self.course_id = uuid.uuid4()

    def test_score_is_the_worth_average_and_workload_is_separate(self) -> None:
        db = FakeDb((5, 4.2, 3.4, 1, 2, 2, 0), course=None)
        summary = worth_score_summary(db, self.course_id)
        self.assertEqual(summary.community_worth_score, 4.2)
        self.assertEqual(summary.average_concept_difficulty, 3.4)
        self.assertEqual(summary.review_count, 5)
        self.assertEqual(summary.workload.total(), 5)
        sql = str(db.statements[0])
        self.assertIn("avg(reviews.worth_score)", sql)
        self.assertIn("avg(reviews.concept_difficulty)", sql)
        self.assertNotIn("professor", sql)

    def test_unreviewed_course_has_null_score(self) -> None:
        db = FakeDb((0, None, None, 0, 0, 0, 0), course=None)
        summary = worth_score_summary(db, self.course_id)
        self.assertIsNone(summary.community_worth_score)
        self.assertIsNone(summary.average_concept_difficulty)
        self.assertEqual(summary.review_count, 0)
        self.assertEqual(summary.workload.total(), 0)


class WorthScoreRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.course_id = uuid.uuid4()
        self.client = TestClient(app)
        app.dependency_overrides.clear()

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def _use(self, db: FakeDb) -> None:
        def override_db():
            yield db

        app.dependency_overrides[get_db] = override_db

    def test_public_payload_has_hour_counts_and_no_reviewer(self) -> None:
        course = Course(
            id=self.course_id,
            code="ISTE-260",
            title="Designing the User Experience",
            description="DEMO DATA",
            department="ISTE",
        )
        db = FakeDb((5, 4.2, 3.4, 1, 2, 2, 0), course=course)
        self._use(db)
        response = self.client.get(f"/courses/{self.course_id}/worth-score")
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["community_worth_score"], 4.2)
        self.assertEqual(body["average_concept_difficulty"], 3.4)
        self.assertEqual(body["review_count"], 5)
        self.assertEqual(body["workload"]["3-6"], 2)
        self.assertNotIn("user_id", body)
        self.assertNotIn("reviews", body)

    def test_missing_course_is_404(self) -> None:
        db = FakeDb((0, None, None, 0, 0, 0, 0), course=None)
        self._use(db)
        response = self.client.get(f"/courses/{self.course_id}/worth-score")
        self.assertEqual(response.status_code, 404, response.text)
        self.assertEqual(db.statements, [])


if __name__ == "__main__":
    unittest.main()
