# AI-GENERATED (Cursor Agent) — Issue #12: Implement review submission API
# Owned by Backend Developer 2 (as5161).
# File-level AI attribution for this module (not per-symbol).
# Sources used: docs/DATABASE_SCHEMA.md sections 3 and 5;
# backend/app/api/routes/reviews.py (this issue).

"""Submit-review route checks. No live database or Auth0."""

from __future__ import annotations

import unittest
import uuid
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from app.api.deps import AuthenticatedUser, require_verified_email
from app.core.auth import Auth0Claims
from app.db.models import Review, User
from app.db.session import get_db
from app.main import app


def _body() -> dict:
    return {
        "goals": ["career_preparation", "skill_development"],
        "worth_score": 4,
        "concept_difficulty": 3,
        "weekly_hours_range": "3-6",
        "skills_gained": [" wireframing "],
        "feedback": " Useful projects ",
        "semester": "2231",
    }


class FakeDb:
    def __init__(self, results: list[object], *, fail_commit: bool = False) -> None:
        self._results = list(results)
        self.fail_commit = fail_commit
        self.added: list[Review] = []
        self.committed = False
        self.rolled_back = False

    def scalar(self, statement: object) -> object:
        del statement
        if not self._results:
            raise AssertionError("unexpected query")
        return self._results.pop(0)

    def add(self, row: Review) -> None:
        self.added.append(row)

    def commit(self) -> None:
        if self.fail_commit:
            raise IntegrityError("INSERT", {}, Exception("unique violation"))
        for row in self.added:
            if row.id is None:
                row.id = uuid.uuid4()
            if row.created_at is None:
                row.created_at = datetime.now(timezone.utc)
        self.committed = True

    def rollback(self) -> None:
        self.rolled_back = True

    def refresh(self, row: Review) -> None:
        if row.created_at is None:
            row.created_at = datetime.now(timezone.utc)


class SubmitReviewTests(unittest.TestCase):
    def setUp(self) -> None:
        self.user_id = uuid.uuid4()
        self.course_id = uuid.uuid4()
        self.client = TestClient(app)
        app.dependency_overrides.clear()

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def _sign_in(self, db: FakeDb) -> None:
        user = User(id=self.user_id, auth0_sub="auth0|student")
        claims = Auth0Claims(sub="auth0|student", email_verified=True, raw={})

        def override_auth() -> AuthenticatedUser:
            return AuthenticatedUser(user=user, claims=claims)

        def override_db():
            yield db

        app.dependency_overrides[require_verified_email] = override_auth
        app.dependency_overrides[get_db] = override_db

    def test_stores_one_review_and_hides_the_reviewer(self) -> None:
        db = FakeDb([self.course_id, None])
        self._sign_in(db)
        response = self.client.post(
            f"/courses/{self.course_id}/reviews",
            json=_body(),
        )
        self.assertEqual(response.status_code, 201, response.text)
        stored = db.added[0]
        self.assertTrue(db.committed)
        self.assertEqual(stored.user_id, self.user_id)
        self.assertEqual(stored.course_id, self.course_id)
        self.assertEqual(stored.worth_score, 4)
        self.assertEqual(stored.concept_difficulty, 3)
        self.assertEqual(stored.weekly_hours_range, "3-6")
        self.assertEqual(stored.goals, ["career_preparation", "skill_development"])
        self.assertEqual(stored.skills_gained, ["wireframing"])
        self.assertEqual(stored.feedback, "Useful projects")
        body = response.json()
        self.assertNotIn("user_id", body)
        self.assertNotIn("auth0_sub", body)
        self.assertEqual(body["course_id"], str(self.course_id))
        self.assertEqual(body["worth_score"], 4)

    def test_rejects_invalid_fields_before_lookup(self) -> None:
        db = FakeDb([])
        self._sign_in(db)
        payload = _body()
        payload["worth_score"] = 0
        response = self.client.post(
            f"/courses/{self.course_id}/reviews",
            json=payload,
        )
        self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(db.added, [])
        self.assertFalse(db.committed)

    def test_missing_course_is_404(self) -> None:
        db = FakeDb([None])
        self._sign_in(db)
        response = self.client.post(
            f"/courses/{self.course_id}/reviews",
            json=_body(),
        )
        self.assertEqual(response.status_code, 404, response.text)
        self.assertEqual(response.json()["detail"], "Course not found")
        self.assertEqual(db.added, [])

    def test_second_review_is_409(self) -> None:
        db = FakeDb([self.course_id, uuid.uuid4()])
        self._sign_in(db)
        response = self.client.post(
            f"/courses/{self.course_id}/reviews",
            json=_body(),
        )
        self.assertEqual(response.status_code, 409, response.text)
        self.assertNotIn(str(self.user_id), response.json()["detail"])
        self.assertEqual(db.added, [])

    def test_database_unique_constraint_is_409(self) -> None:
        db = FakeDb([self.course_id, None], fail_commit=True)
        self._sign_in(db)
        response = self.client.post(
            f"/courses/{self.course_id}/reviews",
            json=_body(),
        )
        self.assertEqual(response.status_code, 409, response.text)
        self.assertTrue(db.rolled_back)
        self.assertFalse(db.committed)

    def test_missing_token_is_401(self) -> None:
        response = self.client.post(
            f"/courses/{self.course_id}/reviews",
            json=_body(),
        )
        self.assertEqual(response.status_code, 401, response.text)


if __name__ == "__main__":
    unittest.main()
