"""The recommendation pipeline: candidates → Gemini → validate → enrich.

We do NOT trust the model. Whatever it returns:
- Its JSON must parse and match ModelOutput (Pydantic). Invalid → retry once → 502.
- Course codes not in the candidate set are DROPPED (hallucination guard).
- title, worth_score, review_count, difficulty_avg are OVERWRITTEN from our DB.
- workload_summary comes from our DB whenever reviews exist.
- Sentences with percentages or "prerequisites/requirements are met" claims are removed.
- "What past students said" is emptied for courses with no reviews.
- Limitations always include thin-data and "prerequisites not verified" notes.
"""

import logging
import re

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.be1_stubs.models import Course
from app.profile.schemas import ProfileIn
from app.recommendations.candidates import retrieve_candidates
from app.recommendations.gemini import ModelError, RecommendationModel
from app.recommendations.prompt import SYSTEM_INSTRUCTION, build_prompt
from app.recommendations.schemas import (
    MATCH_LEVELS,
    ModelOutput,
    ModelRecommendation,
    Recommendation,
    RecommendationsResponse,
)
from app.scores.schemas import CourseStats
from app.scores.service import get_course_stats, get_review_excerpts

log = logging.getLogger(__name__)

MAX_RESULTS = 6
PREREQ_NOTE = "Prerequisites not verified — check the RIT catalog and your advisor"


class RecommendationFailed(Exception):
    """Model failed or returned invalid output twice → 502 "recommendation_failed"."""


_PERCENT = re.compile(r"\d+(\.\d+)?\s*(%|percent\b)|\bpercent(age)?\b", re.IGNORECASE)
_REQ_CLAIM = re.compile(
    r"\b(prereq\w*|pre-req\w*|requirements?)\b[^.!?]*\b(met|meet|meets|satisf\w*|fulfil\w*|eligible)\b"
    r"|\b(satisf\w*|fulfil\w*|meets?|eligible)\b[^.!?]*\b(prereq\w*|pre-req\w*|requirements?)\b",
    re.IGNORECASE,
)
_SENTENCES = re.compile(r"(?<=[.!?])\s+")
_FENCE = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$", re.IGNORECASE)


def clean_text(text: str) -> str:
    """Remove whole sentences containing percentages or requirement-satisfied claims."""
    kept = [
        s for s in _SENTENCES.split((text or "").strip()) if s and not _PERCENT.search(s) and not _REQ_CLAIM.search(s)
    ]
    return " ".join(kept).strip()


def clean_list(items: list[str], limit: int, max_len: int = 240) -> list[str]:
    out: list[str] = []
    for item in items:
        t = clean_text(item)[:max_len].strip()
        if t and t.lower() not in {o.lower() for o in out}:
            out.append(t)
        if len(out) >= limit:
            break
    return out


def parse_model_output(raw: str) -> ModelOutput:
    """Raises ValidationError (→ retry) on anything that isn't our schema."""
    return ModelOutput.model_validate_json(_FENCE.sub("", raw or ""))


def _limitations(model_limits: list[str], s: CourseStats) -> list[str]:
    out: list[str] = []
    if s.review_count == 0:
        out.append("No student reviews yet")
    elif s.review_count < 3:
        out.append(f"Only {s.review_count} review{'s' if s.review_count != 1 else ''} so far")
    for item in clean_list(model_limits, 4):
        # Our own review-count and prerequisite notes replace the model's versions.
        if not re.search(r"\b(only|few|no|limited|thin)\b[^.]*\breviews?\b|prereq", item, re.IGNORECASE):
            out.append(item)
    out.append(PREREQ_NOTE)
    return out


def finalize(rec: ModelRecommendation, course: Course, s: CourseStats) -> Recommendation:
    return Recommendation(
        course_code=course.code,
        title=course.title,  # DB, not model
        match_level=rec.match_level,
        why=clean_text(rec.why) or f"Related to your interests: {course.title}.",
        skills=clean_list(rec.skills, 6, 40) or [k.skill for k in s.top_skills[:5]],
        student_insights=clean_list(rec.student_insights, 3) if s.review_count > 0 else [],
        difficulty_avg=s.difficulty_avg,  # DB
        workload_summary=s.workload_summary if s.review_count > 0 else "No workload reports yet",
        worth_score=s.worth_score,  # DB
        review_count=s.review_count,  # DB
        limitations=_limitations(rec.limitations, s),
    )


def postprocess(output: ModelOutput, courses: list[Course], stats: dict[int, CourseStats]) -> list[Recommendation]:
    by_code = {c.code: c for c in courses}
    results: list[Recommendation] = []
    seen: set[str] = set()
    for rec in output.recommendations:
        code = rec.course_code.strip().upper()
        course = by_code.get(code)
        if course is None:
            log.warning("Dropped hallucinated/unknown course from model output: %r", rec.course_code)
            continue
        if code in seen:
            continue
        seen.add(code)
        results.append(finalize(rec, course, stats[course.id]))
    # Stable sort: strongest first, keeping the model's order within a level.
    results.sort(key=lambda r: MATCH_LEVELS.index(r.match_level))
    return results[:MAX_RESULTS]


def recommend(
    db: Session,
    profile: ProfileIn,
    query: str | None,
    model: RecommendationModel,
    candidate_limit: int = 25,
    min_candidates: int = 8,
) -> RecommendationsResponse:
    found = retrieve_candidates(db, profile, query, candidate_limit, min_candidates)
    if not found:
        return RecommendationsResponse(recommendations=[])
    courses = [c for c, _ in found]
    ids = [c.id for c in courses]
    stats = get_course_stats(db, ids)
    excerpts = get_review_excerpts(db, ids)
    prompt = build_prompt(profile, query, courses, stats, excerpts)

    output: ModelOutput | None = None
    for attempt in (1, 2):  # retry once on invalid JSON
        try:
            raw = model.generate(SYSTEM_INSTRUCTION, prompt)
        except ModelError as exc:
            log.error("Gemini call failed (attempt %d): %s", attempt, exc)
            raise RecommendationFailed from exc
        try:
            output = parse_model_output(raw)
            break
        except ValidationError as exc:
            log.warning("Invalid model JSON (attempt %d): %s", attempt, exc.errors()[:3])
    if output is None:
        raise RecommendationFailed("invalid model output twice")
    return RecommendationsResponse(recommendations=postprocess(output, courses, stats))
