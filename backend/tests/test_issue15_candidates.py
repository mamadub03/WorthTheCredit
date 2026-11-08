# AI-GENERATED (Cursor Agent) — Issue #15: Implement AI course candidate retrieval
# Owned by Backend Developer 2 (as5161).
# File-level AI attribution for this module (not per-symbol).
# Sources used: docs/DATABASE_SCHEMA.md section 7;
# backend/app/recommendations/candidates.py (this issue).

"""Candidate retrieval checks. No live database and no Gemini call."""

from __future__ import annotations

import unittest
import uuid
from datetime import datetime, timezone

from app.db.models import Course, Review
from app.recommendations.candidates import keywords_for_request, retrieve_candidates
from app.schemas.recommendation import RecommendationRequest


class Rows:
    def __init__(self, items: list) -> None:
        self._items = items

    def all(self) -> list:
        return self._items


class Result:
    def __init__(self, row: tuple) -> None:
        self._row = row

    def one(self) -> tuple:
        return self._row


class FakeDb:
    def __init__(self, courses: list[Course], reviews: list[Review], aggregate: tuple) -> None:
        self.courses = courses
        self.reviews = reviews
        self.aggregate = aggregate
        self.statements: list[object] = []

    def scalars(self, statement: object) -> Rows:
        self.statements.append(statement)
        sql = str(statement).lower()
        if "from courses" in sql:
            return Rows(self.courses)
        return Rows(self.reviews)

    def execute(self, statement: object) -> Result:
        self.statements.append(statement)
        return Result(self.aggregate)


def _request() -> RecommendationRequest:
    return RecommendationRequest(
        major="Human-Centered Computing",
        interests=["accessibility"],
        skills=["Figma"],
        career_goals="UX design",
        academic_goals="the HCI concentration",
    )


def _course() -> Course:
    return Course(
        id=uuid.uuid4(),
        code="ISTE-260",
        title="Designing the User Experience",
        description="Interaction design and accessibility for web products. DEMO DATA.",
        department="ISTE",
        credits=3,
        prerequisites="ISTE-140",
    )


class CandidateRetrievalTests(unittest.TestCase):
    def test_keywords_come_from_interests_skills_and_goals(self) -> None:
        words = keywords_for_request(_request())
        self.assertIn("accessibility", words)
        self.assertIn("figma", words)
        self.assertIn("design", words)
        self.assertIn("hci", words)
        self.assertNotIn("the", words)

    def test_unreviewed_course_can_still_be_a_candidate(self) -> None:
        course = _course()
        db = FakeDb([course], [], (0, None, None, 0, 0, 0, 0))
        candidates = retrieve_candidates(db, _request())
        self.assertEqual(len(candidates), 1)
        candidate = candidates[0]
        self.assertEqual(candidate.course.id, course.id)
        self.assertIsNone(candidate.insights.community_worth_score)
        self.assertEqual(candidate.insights.review_count, 0)
        self.assertEqual(candidate.feedback, [])
        course_sql = str(db.statements[0]).lower()
        self.assertIn("like lower", course_sql)
        self.assertIn("courses.title", course_sql)
        self.assertIn("courses.description", course_sql)
        self.assertIn("skills_gained", course_sql)
        params = " ".join(str(value) for value in db.statements[0].compile().params.values())
        self.assertIn("figma", params.lower())

    def test_review_text_is_copied_not_invented(self) -> None:
        course = _course()
        review = Review(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            course_id=course.id,
            goals=["career_preparation", "not_a_goal"],
            worth_score=5,
            concept_difficulty=2,
            weekly_hours_range="3-6",
            skills_gained=["prototyping"],
            feedback="Studio critiques were the useful part.",
            created_at=datetime(2026, 11, 1, tzinfo=timezone.utc),
        )
        db = FakeDb([course], [review], (1, 4.2, 2.0, 0, 1, 0, 0))
        candidate = retrieve_candidates(db, _request())[0]
        self.assertEqual(candidate.insights.community_worth_score, 4.2)
        self.assertEqual(candidate.insights.average_concept_difficulty, 2.0)
        self.assertEqual(candidate.goal_categories, ["career_preparation"])
        self.assertEqual(candidate.skills_gained, ["prototyping"])
        self.assertEqual(
            candidate.feedback,
            ["Studio critiques were the useful part."],
        )
        dumped = candidate.model_dump()
        self.assertNotIn("user_id", dumped)
        self.assertNotIn(str(review.user_id), str(dumped))

    def test_stopwords_only_do_not_return_the_catalog(self) -> None:
        db = FakeDb([_course()], [], (0, None, None, 0, 0, 0, 0))
        request = RecommendationRequest(major="a to the")
        self.assertEqual(retrieve_candidates(db, request), [])
        self.assertEqual(db.statements, [])


if __name__ == "__main__":
    unittest.main()
