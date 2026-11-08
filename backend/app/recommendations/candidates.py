# AI-GENERATED (Cursor Agent) — Issue #15: Implement AI course candidate retrieval
# Owned by Backend Developer 2 (as5161).
# File-level AI attribution for this module (not per-symbol).
# Sources used (team-authored, not generated in this file):
# - docs/DATABASE_SCHEMA.md section 7 (course fields, review insights,
#   student major/interests/skills/goals; FastAPI retrieves candidates;
#   courses without reviews may still be retrieved)
# - .cursor/rules/project.mdc section 2 (Gemini only sees retrieved courses;
#   do not fabricate feedback)
# - backend/app/schemas/recommendation.py CourseCandidate (Issue #10, not edited)
# - backend/app/reviews/scoring.py worth_score_summary (Issue #13, not edited)
# - backend/app/db/models.py Course and Review (read only; files not edited)

"""Pull existing courses that match a student's own words.

Keywords come from major, interests, skills, career goals, and academic
goals. A course matches when a keyword appears in its code, title,
description, department, prerequisites, review skills, or written
feedback. Unreviewed courses can still match on the catalog text.
This module does not call Gemini.
"""

from __future__ import annotations

import re

from sqlalchemy import String, cast, or_, select
from sqlalchemy.orm import Session

from app.db.models import Course, Review
from app.recommendations.keywords import keywords_from_profile, like_pattern
from app.reviews.scoring import worth_score_summary
from app.schemas.recommendation import CourseCandidate, RecommendationRequest
from app.schemas.review import GoalCategory

_GOAL_CATEGORIES = frozenset(
    {
        "career_preparation",
        "skill_development",
        "academic_development",
        "degree_requirements",
        "personal_exploration",
    }
)
_CANDIDATE_LIMIT = 20
_REVIEW_SAMPLE = 50
_FEEDBACK_LIMIT = 5


def keywords_for_request(request: RecommendationRequest) -> list[str]:
    """Return the search words for this profile, in first-seen order."""

    return keywords_from_profile(
        major=request.major,
        interests=request.interests,
        skills=request.skills,
        career_goals=request.career_goals,
        academic_goals=request.academic_goals,
    )


def retrieve_candidates(
    db: Session,
    request: RecommendationRequest,
    *,
    limit: int = _CANDIDATE_LIMIT,
) -> list[CourseCandidate]:
    """Return up to ``limit`` database courses for a later Gemini ranking."""

    keywords = keywords_for_request(request)
    if not keywords or limit < 1:
        return []

    match = _course_match(keywords)
    courses = db.scalars(
        select(Course).where(match).order_by(Course.code).limit(limit)
    ).all()

    candidates: list[CourseCandidate] = []
    for course in courses:
        insights = worth_score_summary(db, course.id)
        reviews = db.scalars(
            select(Review)
            .where(Review.course_id == course.id)
            .order_by(Review.created_at.desc())
            .limit(_REVIEW_SAMPLE)
        ).all()
        candidates.append(
            CourseCandidate(
                course=course,
                insights=insights,
                goal_categories=_goal_categories(reviews),
                skills_gained=_skills(reviews),
                feedback=_feedback(reviews),
            )
        )
    return candidates


def _course_match(keywords: list[str]):
    clauses = []
    for keyword in keywords:
        pattern = like_pattern(keyword)
        clauses.extend(
            (
                Course.code.ilike(pattern, escape="\\"),
                Course.title.ilike(pattern, escape="\\"),
                Course.description.ilike(pattern, escape="\\"),
                Course.department.ilike(pattern, escape="\\"),
                Course.prerequisites.ilike(pattern, escape="\\"),
                Course.id.in_(
                    select(Review.course_id).where(
                        or_(
                            Review.feedback.ilike(pattern, escape="\\"),
                            cast(Review.skills_gained, String).ilike(
                                pattern, escape="\\"
                            ),
                        )
                    )
                ),
            )
        )
    return or_(*clauses)


def _goal_categories(reviews: list[Review]) -> list[GoalCategory]:
    found: list[GoalCategory] = []
    for review in reviews:
        for goal in review.goals or []:
            if goal in _GOAL_CATEGORIES and goal not in found:
                found.append(goal)
    return found


def _skills(reviews: list[Review]) -> list[str]:
    found: list[str] = []
    for review in reviews:
        for skill in review.skills_gained or []:
            if not isinstance(skill, str):
                continue
            text = skill.strip()
            if text and text not in found:
                found.append(text)
    return found


def _feedback(reviews: list[Review]) -> list[str]:
    excerpts: list[str] = []
    for review in reviews:
        if not review.feedback:
            continue
        text = review.feedback.strip()
        if not text:
            continue
        excerpts.append(text)
        if len(excerpts) == _FEEDBACK_LIMIT:
            break
    return excerpts
