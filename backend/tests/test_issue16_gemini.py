# AI-GENERATED (Cursor Agent) — Issue #16: Integrate Gemini recommendations
# Owned by Backend Developer 2 (as5161).
# File-level AI attribution for this module (not per-symbol).
# Sources used: docs/DATABASE_SCHEMA.md section 7;
# backend/app/recommendations/gemini.py (this issue).

"""Gemini ranking checks. No live Gemini call."""

from __future__ import annotations

import json
import unittest
import uuid
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.api.deps import AuthenticatedUser, require_verified_email
from app.core.auth import Auth0Claims
from app.db.models import User
from app.db.session import get_db
from app.main import app
from app.recommendations.gemini import GeminiError, build_recommendations, rank_candidates
from app.schemas.recommendation import CourseCandidate, RecommendationRequest
from app.schemas.review import WorthScoreSummary


class FakeResponse:
    def __init__(self, status_code: int, payload: dict) -> None:
        self.status_code = status_code
        self._payload = payload

    def json(self) -> dict:
        return self._payload


def _request() -> RecommendationRequest:
    return RecommendationRequest(
        interests=["accessibility"],
        skills=["Figma"],
        career_goals="UX design",
    )


def _candidate(course_id: uuid.UUID, *, reviewed: bool) -> CourseCandidate:
    insights = {
        "course_id": course_id,
        "community_worth_score": 4.2 if reviewed else None,
        "review_count": 1 if reviewed else 0,
        "average_concept_difficulty": 3.0 if reviewed else None,
        "workload": {"0-3": 0, "3-6": 1, "6-10": 0, "10+": 0} if reviewed else {},
    }
    return CourseCandidate.model_validate(
        {
            "course": {
                "id": course_id,
                "code": "ISTE-260",
                "title": "Designing the User Experience",
                "description": "Accessibility and interaction design. DEMO DATA.",
                "department": "ISTE",
                "credits": 3,
                "prerequisites": "ISTE-140",
            },
            "insights": insights,
            "goal_categories": ["career_preparation"] if reviewed else [],
            "skills_gained": ["prototyping"] if reviewed else [],
            "feedback": ["Studio critiques were the useful part."] if reviewed else [],
        }
    )


def _gemini_body(items: list[dict]) -> dict:
    return {
        "candidates": [
            {
                "content": {
                    "parts": [{"text": json.dumps({"recommendations": items})}]
                }
            }
        ]
    }


class GeminiRankingTests(unittest.TestCase):
    def test_ranking_keeps_the_database_worth_score(self) -> None:
        course_id = uuid.uuid4()
        candidate = _candidate(course_id, reviewed=True)
        seen: dict = {}

        def complete(url: str, payload: dict) -> FakeResponse:
            seen["url"] = url
            seen["payload"] = payload
            return FakeResponse(
                200,
                _gemini_body(
                    [
                        {
                            "course_id": str(course_id),
                            "match_level": "strong_match",
                            "explanation": "Overlaps the stated UX goal.",
                        }
                    ]
                ),
            )

        drafts = rank_candidates(
            [candidate],
            _request(),
            api_key="test-key-should-not-leak",
            complete=complete,
        )
        response = build_recommendations(drafts, [candidate])
        item = response.recommendations[0]
        self.assertEqual(item.course.id, course_id)
        self.assertEqual(item.match_level, "strong_match")
        self.assertEqual(item.explanation, "Overlaps the stated UX goal.")
        self.assertEqual(item.community_worth_score, 4.2)
        self.assertEqual(item.review_count, 1)
        prompt = seen["payload"]["contents"][0]["parts"][0]["text"]
        self.assertIn("4.2", prompt)
        self.assertIn("prototyping", prompt)
        self.assertNotIn("test-key-should-not-leak", prompt)
        self.assertIn("key=test-key-should-not-leak", seen["url"])

    def test_unknown_course_id_is_rejected(self) -> None:
        candidate = _candidate(uuid.uuid4(), reviewed=False)

        def complete(url: str, payload: dict) -> FakeResponse:
            del url, payload
            return FakeResponse(
                200,
                _gemini_body(
                    [
                        {
                            "course_id": str(uuid.uuid4()),
                            "match_level": "exploratory",
                            "explanation": "This course was not retrieved.",
                        }
                    ]
                ),
            )

        with self.assertRaises(GeminiError) as caught:
            rank_candidates([candidate], _request(), api_key="test-key", complete=complete)
        self.assertIn("not retrieved", caught.exception.detail)

    def test_numeric_match_level_is_rejected(self) -> None:
        course_id = uuid.uuid4()

        def complete(url: str, payload: dict) -> FakeResponse:
            del url, payload
            return FakeResponse(
                200,
                _gemini_body(
                    [
                        {
                            "course_id": str(course_id),
                            "match_level": "92%",
                            "explanation": "Numeric match levels are not allowed.",
                        }
                    ]
                ),
            )

        with self.assertRaises(GeminiError):
            rank_candidates(
                [_candidate(course_id, reviewed=False)],
                _request(),
                api_key="test-key",
                complete=complete,
            )

    def test_failed_request_does_not_invent_courses(self) -> None:
        def complete(url: str, payload: dict) -> FakeResponse:
            del url, payload
            return FakeResponse(500, {})

        with self.assertRaises(GeminiError):
            rank_candidates(
                [_candidate(uuid.uuid4(), reviewed=False)],
                _request(),
                api_key="test-key",
                complete=complete,
            )

    def test_no_candidates_skips_gemini(self) -> None:
        def complete(url: str, payload: dict) -> FakeResponse:
            raise AssertionError("Gemini should not be called")

        self.assertEqual(
            rank_candidates([], _request(), api_key="", complete=complete),
            [],
        )


class RecommendationRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)
        app.dependency_overrides.clear()

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def test_missing_token_is_401(self) -> None:
        response = self.client.post(
            "/recommendations",
            json={"interests": ["accessibility"]},
        )
        self.assertEqual(response.status_code, 401, response.text)

    def test_gemini_failure_is_502(self) -> None:
        user = User(id=uuid.uuid4(), auth0_sub="auth0|student")
        claims = Auth0Claims(sub="auth0|student", email_verified=True, raw={})

        def override_auth() -> AuthenticatedUser:
            return AuthenticatedUser(user=user, claims=claims)

        def override_db():
            yield object()

        app.dependency_overrides[require_verified_email] = override_auth
        app.dependency_overrides[get_db] = override_db
        with (
            patch(
                "app.api.routes.recommendations.retrieve_candidates",
                return_value=[_candidate(uuid.uuid4(), reviewed=False)],
            ),
            patch(
                "app.api.routes.recommendations.rank_candidates",
                side_effect=GeminiError("Gemini request failed"),
            ),
        ):
            response = self.client.post(
                "/recommendations",
                json={"interests": ["accessibility"]},
            )
        self.assertEqual(response.status_code, 502, response.text)
        self.assertEqual(response.json()["detail"], "Gemini request failed")
        self.assertNotIn("recommendations", response.json())


if __name__ == "__main__":
    unittest.main()
