# AI-GENERATED (Cursor Agent) — Issue #10: Define review and recommendation contracts
# Owned by Backend Developer 2 (as5161).
# File-level AI attribution for this module (not per-symbol).
# Sources used: docs/DATABASE_SCHEMA.md sections 3, 6, and 7;
# backend/app/schemas/review.py and recommendation.py (this issue).

"""Contract checks for review and recommendation schemas. No database."""

from __future__ import annotations

import unittest
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace

from pydantic import ValidationError

from app.schemas.recommendation import (
    CourseCandidate,
    GeminiRecommendationDraft,
    RecommendationItem,
    RecommendationRequest,
    RecommendationResponse,
    unexpected_course_ids,
)
from app.schemas.review import ReviewCreate, ReviewPublic, WorthScoreSummary


def _course_id() -> uuid.UUID:
    return uuid.UUID("11111111-1111-1111-1111-111111111111")


def _course_payload(course_id: uuid.UUID | None = None) -> dict:
    return {
        "id": course_id or _course_id(),
        "code": "ISTE-260",
        "title": "Designing the User Experience",
        "description": "Introduces interaction design for web and mobile products.",
        "department": "ISTE",
        "credits": 3,
        "prerequisites": "ISTE-140",
    }


def _insights(course_id: uuid.UUID, *, reviewed: bool = True) -> dict:
    if not reviewed:
        return {
            "course_id": course_id,
            "community_worth_score": None,
            "review_count": 0,
            "average_concept_difficulty": None,
            "workload": {},
        }
    return {
        "course_id": course_id,
        "community_worth_score": 4.2,
        "review_count": 5,
        "average_concept_difficulty": 3.4,
        "workload": {"0-3": 1, "3-6": 2, "6-10": 2, "10+": 0},
    }


class ReviewContractTests(unittest.TestCase):
    def test_accepts_schema_example(self) -> None:
        review = ReviewCreate(
            goals=["career_preparation", "skill_development"],
            worth_score=4,
            concept_difficulty=3,
            weekly_hours_range="3-6",
            skills_gained=[" wireframing "],
            feedback="  Useful projects  ",
            semester="2231",
        )
        self.assertEqual(review.skills_gained, ["wireframing"])
        self.assertEqual(review.feedback, "Useful projects")

    def test_rejects_scores_outside_one_to_five(self) -> None:
        with self.assertRaises(ValidationError):
            ReviewCreate(
                goals=["academic_development"],
                worth_score=0,
                concept_difficulty=3,
                weekly_hours_range="0-3",
            )
        with self.assertRaises(ValidationError):
            ReviewCreate(
                goals=["academic_development"],
                worth_score=3,
                concept_difficulty=6,
                weekly_hours_range="0-3",
            )

    def test_rejects_unknown_goal_hours_and_duplicate_goals(self) -> None:
        with self.assertRaises(ValidationError):
            ReviewCreate(
                goals=[],
                worth_score=3,
                concept_difficulty=3,
                weekly_hours_range="0-3",
            )
        with self.assertRaises(ValidationError):
            ReviewCreate(
                goals=["easy_a"],
                worth_score=3,
                concept_difficulty=3,
                weekly_hours_range="0-3",
            )
        with self.assertRaises(ValidationError):
            ReviewCreate(
                goals=["personal_exploration"],
                worth_score=3,
                concept_difficulty=3,
                weekly_hours_range="5-7",
            )
        with self.assertRaises(ValidationError):
            ReviewCreate(
                goals=["degree_requirements", "degree_requirements"],
                worth_score=3,
                concept_difficulty=3,
                weekly_hours_range="10+",
            )

    def test_rejects_identity_and_professor_rating(self) -> None:
        payload = {
            "goals": ["career_preparation"],
            "worth_score": 5,
            "concept_difficulty": 2,
            "weekly_hours_range": "6-10",
            "user_id": str(uuid.uuid4()),
        }
        with self.assertRaises(ValidationError):
            ReviewCreate.model_validate(payload)
        payload.pop("user_id")
        payload["professor_rating"] = 5
        with self.assertRaises(ValidationError):
            ReviewCreate.model_validate(payload)

    def test_public_review_hides_reviewer(self) -> None:
        course_id = uuid.uuid4()
        row = SimpleNamespace(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            auth0_sub="auth0|student",
            course_id=course_id,
            goals=["skill_development"],
            worth_score=5,
            concept_difficulty=2,
            weekly_hours_range="0-3",
            skills_gained=["prototyping"],
            feedback=None,
            instructor_name=None,
            semester=None,
            created_at=datetime.now(timezone.utc),
        )
        public = ReviewPublic.model_validate(row)
        dumped = public.model_dump()
        self.assertNotIn("user_id", dumped)
        self.assertNotIn("auth0_sub", dumped)
        self.assertEqual(public.course_id, course_id)

    def test_worth_score_is_null_without_reviews(self) -> None:
        summary = WorthScoreSummary.model_validate(_insights(_course_id(), reviewed=False))
        self.assertIsNone(summary.community_worth_score)
        self.assertEqual(summary.review_count, 0)

    def test_worth_score_excludes_difficulty_from_its_field(self) -> None:
        summary = WorthScoreSummary.model_validate(_insights(_course_id()))
        self.assertEqual(summary.community_worth_score, 4.2)
        self.assertEqual(summary.average_concept_difficulty, 3.4)
        self.assertEqual(summary.workload.model_dump(by_alias=True)["3-6"], 2)

    def test_worth_score_rejects_mixed_empty_and_rated_courses(self) -> None:
        payload = _insights(_course_id(), reviewed=False)
        payload["community_worth_score"] = 4
        with self.assertRaises(ValidationError):
            WorthScoreSummary.model_validate(payload)
        rated = _insights(_course_id())
        rated["workload"] = {"0-3": 1, "3-6": 0, "6-10": 0, "10+": 0}
        with self.assertRaises(ValidationError):
            WorthScoreSummary.model_validate(rated)


class RecommendationContractTests(unittest.TestCase):
    def test_accepts_profile_fields_from_the_schema(self) -> None:
        request = RecommendationRequest(
            major=" Human-Centered Computing ",
            interests=[" accessibility "],
            skills=["Figma"],
            career_goals="UX design",
            academic_goals="Finish the HCI concentration",
        )
        self.assertEqual(request.major, "Human-Centered Computing")
        self.assertEqual(request.interests, ["accessibility"])

    def test_rejects_empty_profile_and_match_percentage(self) -> None:
        with self.assertRaises(ValidationError):
            RecommendationRequest()
        with self.assertRaises(ValidationError):
            RecommendationRequest.model_validate(
                {"major": "Computing", "match_percent": 87}
            )

    def test_gemini_draft_cannot_carry_a_worth_score(self) -> None:
        GeminiRecommendationDraft(
            course_id=_course_id(),
            match_level="strong_match",
            explanation="Overlaps the stated UX goal.",
        )
        with self.assertRaises(ValidationError):
            GeminiRecommendationDraft.model_validate(
                {
                    "course_id": str(_course_id()),
                    "match_level": "strong_match",
                    "explanation": "Overlaps the stated UX goal.",
                    "community_worth_score": 4.2,
                }
            )
        with self.assertRaises(ValidationError):
            GeminiRecommendationDraft(
                course_id=_course_id(),
                match_level="92%",
                explanation="Numeric match levels are not allowed.",
            )

    def test_unexpected_ids_are_the_ones_outside_the_candidate_set(self) -> None:
        known = _course_id()
        other = uuid.uuid4()
        candidate = CourseCandidate.model_validate(
            {
                "course": _course_payload(known),
                "insights": _insights(known),
                "goal_categories": ["career_preparation"],
                "skills_gained": ["critique"],
                "feedback": ["Studio critiques were the useful part."],
            }
        )
        drafts = [
            GeminiRecommendationDraft(
                course_id=known,
                match_level="good_match",
                explanation="Shares the student's design interest.",
            ),
            GeminiRecommendationDraft(
                course_id=other,
                match_level="exploratory",
                explanation="This id was not retrieved.",
            ),
        ]
        self.assertEqual(unexpected_course_ids(drafts, [candidate]), [other])
        self.assertEqual(unexpected_course_ids(drafts[:1], [candidate]), [])

    def test_candidate_course_and_insights_must_be_the_same_row(self) -> None:
        with self.assertRaises(ValidationError):
            CourseCandidate.model_validate(
                {
                    "course": _course_payload(),
                    "insights": _insights(uuid.uuid4()),
                }
            )

    def test_response_keeps_score_null_when_unreviewed(self) -> None:
        item = RecommendationItem.model_validate(
            {
                "course": _course_payload(),
                "match_level": "partial_match",
                "explanation": "Topic overlap, and nobody has reviewed it yet.",
                "community_worth_score": None,
                "review_count": 0,
            }
        )
        response = RecommendationResponse(recommendations=[item])
        self.assertIsNone(response.recommendations[0].community_worth_score)
        with self.assertRaises(ValidationError):
            RecommendationItem.model_validate(
                {
                    "course": _course_payload(),
                    "match_level": "partial_match",
                    "explanation": "Cannot invent a score.",
                    "community_worth_score": 5,
                    "review_count": 0,
                }
            )


if __name__ == "__main__":
    unittest.main()
