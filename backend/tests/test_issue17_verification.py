# AI-GENERATED (Cursor Agent) — Issue #17: Test reviews, scoring, and AI
# Owned by Backend Developer 2 (as5161).
# File-level AI attribution for this module (not per-symbol).
# Sources used (team-authored, not generated in this file):
# - docs/DATABASE_SCHEMA.md sections 3, 5, 6, and 7 (validation ranges,
#   one review per student and course, Worth Score example 4.2, Gemini
#   may only rank retrieved courses)
# - .cursor/rules/project.mdc section 2
# Existing review, scoring, and Gemini modules are exercised, not edited.

"""Verification for duplicate reviews, scoring, validation, and Gemini."""

from __future__ import annotations

import json
import unittest
import uuid
from decimal import Decimal

import httpx

from app.recommendations.gemini import GeminiError, build_recommendations, rank_candidates
from app.reviews.policy import ReviewPolicyError, prepare_review
from app.reviews.scoring import worth_score_summary
from app.schemas.recommendation import CourseCandidate, RecommendationRequest


class Rows:
    def one(self) -> tuple:
        raise NotImplementedError


class AggregateDb:
    def __init__(self, row: tuple) -> None:
        self.row = row

    def execute(self, statement: object) -> Rows:
        del statement
        row = self.row

        class Result(Rows):
            def one(self) -> tuple:
                return row

        return Result()


class PolicyDb:
    def __init__(self, results: list[object]) -> None:
        self._results = list(results)
        self.statements: list[object] = []

    def scalar(self, statement: object) -> object:
        self.statements.append(statement)
        return self._results.pop(0)


class FakeResponse:
    def __init__(self, status_code: int, payload: dict) -> None:
        self.status_code = status_code
        self._payload = payload

    def json(self) -> dict:
        return self._payload


def _profile() -> RecommendationRequest:
    return RecommendationRequest(
        interests=["accessibility"],
        skills=["Figma"],
        career_goals="UX design",
    )


def _review_body(**overrides: object) -> dict:
    body = {
        "goals": ["career_preparation"],
        "worth_score": 4,
        "concept_difficulty": 3,
        "weekly_hours_range": "3-6",
        "skills_gained": ["critique"],
    }
    body.update(overrides)
    return body


def _candidate(
    course_id: uuid.UUID,
    *,
    code: str,
    score: float | None,
    review_count: int,
) -> CourseCandidate:
    workload = {"0-3": 0, "3-6": review_count, "6-10": 0, "10+": 0}
    return CourseCandidate.model_validate(
        {
            "course": {
                "id": course_id,
                "code": code,
                "title": f"{code} title",
                "description": "DEMO DATA",
                "department": "ISTE",
                "credits": 3,
            },
            "insights": {
                "course_id": course_id,
                "community_worth_score": score,
                "review_count": review_count,
                "average_concept_difficulty": 2.0 if review_count else None,
                "workload": workload if review_count else {},
            },
            "feedback": ["Stored review text."] if review_count else [],
        }
    )


def _gemini(items: list[dict]) -> dict:
    return {
        "candidates": [
            {"content": {"parts": [{"text": json.dumps({"recommendations": items})}]}}
        ]
    }


class ReviewVerificationTests(unittest.TestCase):
    def test_invalid_score_goal_hours_and_skill_are_rejected(self) -> None:
        user_id = uuid.uuid4()
        course_id = uuid.uuid4()
        cases = [
            _review_body(worth_score=0),
            _review_body(concept_difficulty=6),
            _review_body(goals=["easy_a"]),
            _review_body(weekly_hours_range="5-7"),
            _review_body(skills_gained=[" "]),
        ]
        for body in cases:
            db = PolicyDb([])
            with self.assertRaises(ReviewPolicyError) as caught:
                prepare_review(
                    db,
                    user_id=user_id,
                    course_id=course_id,
                    payload=body,
                )
            self.assertEqual(caught.exception.code, "invalid_review")
            self.assertEqual(db.statements, [])

    def test_second_review_does_not_replace_the_first(self) -> None:
        user_id = uuid.uuid4()
        course_id = uuid.uuid4()
        db = PolicyDb([course_id, uuid.uuid4()])
        with self.assertRaises(ReviewPolicyError) as caught:
            prepare_review(
                db,
                user_id=user_id,
                course_id=course_id,
                payload=_review_body(worth_score=1),
            )
        self.assertEqual(caught.exception.code, "duplicate_review")
        self.assertNotIn(str(user_id), caught.exception.detail)

    def test_schema_example_average_stays_separate_from_difficulty(self) -> None:
        scores = [5, 4, 5, 3, 4]
        expected = sum(scores) / len(scores)
        self.assertAlmostEqual(expected, 4.2)
        course_id = uuid.uuid4()
        summary = worth_score_summary(
            AggregateDb((5, Decimal("4.2"), Decimal("2.6"), 1, 2, 1, 1)),
            course_id,
        )
        self.assertAlmostEqual(summary.community_worth_score or 0, 4.2)
        self.assertAlmostEqual(summary.average_concept_difficulty or 0, 2.6)
        self.assertNotAlmostEqual(
            summary.community_worth_score or 0,
            (4.2 + 2.6) / 2,
        )
        self.assertEqual(summary.review_count, 5)
        self.assertEqual(summary.workload.total(), 5)


class GeminiVerificationTests(unittest.TestCase):
    def test_each_course_keeps_its_own_score_and_explanation(self) -> None:
        reviewed_id = uuid.uuid4()
        unreviewed_id = uuid.uuid4()
        reviewed = _candidate(reviewed_id, code="ISTE-260", score=4.2, review_count=1)
        unreviewed = _candidate(unreviewed_id, code="ISTE-262", score=None, review_count=0)

        def complete(url: str, payload: dict) -> FakeResponse:
            del url, payload
            return FakeResponse(
                200,
                _gemini(
                    [
                        {
                            "course_id": str(unreviewed_id),
                            "match_level": "exploratory",
                            "explanation": "Related topic, with no reviews yet.",
                        },
                        {
                            "course_id": str(reviewed_id),
                            "match_level": "strong_match",
                            "explanation": "Overlaps the stated UX goal.",
                        },
                    ]
                ),
            )

        drafts = rank_candidates(
            [reviewed, unreviewed],
            _profile(),
            api_key="test-key",
            complete=complete,
        )
        ranked = build_recommendations(drafts, [reviewed, unreviewed]).recommendations
        self.assertEqual(
            [item.course.id for item in ranked],
            [unreviewed_id, reviewed_id],
        )
        self.assertIsNone(ranked[0].community_worth_score)
        self.assertEqual(ranked[0].explanation, "Related topic, with no reviews yet.")
        self.assertAlmostEqual(ranked[1].community_worth_score or 0, 4.2)
        self.assertEqual(ranked[1].explanation, "Overlaps the stated UX goal.")

    def test_gemini_supplied_worth_score_is_rejected(self) -> None:
        course_id = uuid.uuid4()

        def complete(url: str, payload: dict) -> FakeResponse:
            del url, payload
            return FakeResponse(
                200,
                _gemini(
                    [
                        {
                            "course_id": str(course_id),
                            "match_level": "good_match",
                            "explanation": "Fits the goal.",
                            "community_worth_score": 1,
                        }
                    ]
                ),
            )

        with self.assertRaises(GeminiError) as caught:
            rank_candidates(
                [_candidate(course_id, code="ISTE-260", score=4.2, review_count=1)],
                _profile(),
                api_key="test-key",
                complete=complete,
            )
        self.assertIn("not valid", caught.exception.detail)

    def test_malformed_json_and_timeout_return_no_courses(self) -> None:
        course_id = uuid.uuid4()
        candidate = _candidate(course_id, code="ISTE-260", score=None, review_count=0)

        def malformed(url: str, payload: dict) -> FakeResponse:
            del url, payload
            return FakeResponse(
                200,
                {"candidates": [{"content": {"parts": [{"text": "not-json"}]}}]},
            )

        def timed_out(url: str, payload: dict) -> FakeResponse:
            del url, payload
            raise httpx.TimeoutException("timed out")

        for complete in (malformed, timed_out):
            with self.assertRaises(GeminiError):
                rank_candidates(
                    [candidate],
                    _profile(),
                    api_key="test-key",
                    complete=complete,
                )


if __name__ == "__main__":
    unittest.main()
