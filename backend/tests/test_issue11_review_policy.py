# AI-GENERATED (Cursor Agent) — Issue #11: Implement review validation and policies
# Owned by Backend Developer 2 (as5161).
# File-level AI attribution for this module (not per-symbol).
# Sources used: docs/DATABASE_SCHEMA.md sections 3 and 5;
# backend/app/reviews/policy.py (this issue).

"""Policy checks for a new review. No database connection."""

from __future__ import annotations

import unittest
import uuid

from app.reviews.policy import ReviewPolicyError, prepare_review


def _payload(**overrides: object) -> dict:
    body = {
        "goals": ["career_preparation", "skill_development"],
        "worth_score": 4,
        "concept_difficulty": 3,
        "weekly_hours_range": "3-6",
        "skills_gained": [" wireframing "],
    }
    body.update(overrides)
    return body


class FakeDb:
    """Returns queued scalar results and records the statements."""

    def __init__(self, results: list[object]) -> None:
        self._results = list(results)
        self.statements: list[object] = []

    def scalar(self, statement: object) -> object:
        self.statements.append(statement)
        if not self._results:
            raise AssertionError("unexpected query")
        return self._results.pop(0)


class ReviewPolicyTests(unittest.TestCase):
    def setUp(self) -> None:
        self.user_id = uuid.uuid4()
        self.course_id = uuid.uuid4()

    def test_accepts_the_schema_fields_when_the_pair_is_new(self) -> None:
        db = FakeDb([self.course_id, None])
        review = prepare_review(
            db,
            user_id=self.user_id,
            course_id=self.course_id,
            payload=_payload(),
        )
        self.assertEqual(review.worth_score, 4)
        self.assertEqual(review.concept_difficulty, 3)
        self.assertEqual(review.weekly_hours_range, "3-6")
        self.assertEqual(review.skills_gained, ["wireframing"])
        self.assertEqual(review.goals, ["career_preparation", "skill_development"])
        course_sql = str(db.statements[0])
        review_sql = str(db.statements[1])
        self.assertIn("courses.id", course_sql)
        self.assertIn("reviews.user_id", review_sql)
        self.assertIn("reviews.course_id", review_sql)

    def test_rejects_scores_goals_skills_and_workload(self) -> None:
        cases = [
            _payload(worth_score=0),
            _payload(worth_score=6),
            _payload(concept_difficulty=0),
            _payload(goals=[]),
            _payload(goals=["easy_a"]),
            _payload(goals=["degree_requirements", "degree_requirements"]),
            _payload(skills_gained=["prototyping", "  "]),
            _payload(weekly_hours_range="5-7"),
            _payload(user_id=str(self.user_id)),
            _payload(professor_rating=5),
        ]
        for body in cases:
            db = FakeDb([])
            with self.assertRaises(ReviewPolicyError) as caught:
                prepare_review(
                    db,
                    user_id=self.user_id,
                    course_id=self.course_id,
                    payload=body,
                )
            self.assertEqual(caught.exception.code, "invalid_review")
            self.assertEqual(db.statements, [])

    def test_rejects_a_missing_course_before_the_duplicate_check(self) -> None:
        db = FakeDb([None])
        with self.assertRaises(ReviewPolicyError) as caught:
            prepare_review(
                db,
                user_id=self.user_id,
                course_id=self.course_id,
                payload=_payload(),
            )
        self.assertEqual(caught.exception.code, "unknown_course")
        self.assertEqual(len(db.statements), 1)
        self.assertNotIn(str(self.user_id), caught.exception.detail)

    def test_rejects_a_second_review_for_the_same_student_and_course(self) -> None:
        existing_review_id = uuid.uuid4()
        db = FakeDb([self.course_id, existing_review_id])
        with self.assertRaises(ReviewPolicyError) as caught:
            prepare_review(
                db,
                user_id=self.user_id,
                course_id=self.course_id,
                payload=_payload(worth_score=1, weekly_hours_range="10+"),
            )
        self.assertEqual(caught.exception.code, "duplicate_review")
        self.assertNotIn(str(self.user_id), caught.exception.detail)
        self.assertNotIn(str(existing_review_id), caught.exception.detail)


if __name__ == "__main__":
    unittest.main()
