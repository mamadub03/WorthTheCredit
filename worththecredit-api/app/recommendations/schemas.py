"""Shapes for POST /recommendations and for Gemini's structured output."""

from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.profile.schemas import ProfileIn

MatchLevel = Literal["Strong Match", "Moderate Match", "Limited Match"]
MATCH_LEVELS: tuple[str, ...] = ("Strong Match", "Moderate Match", "Limited Match")


class RecommendationsRequest(BaseModel):
    profile: ProfileIn | None = None  # omitted → use the saved profile
    query: str | None = Field(default=None, max_length=500)

    @field_validator("query")
    @classmethod
    def _blank(cls, v: str | None) -> str | None:
        return (v or "").strip() or None


class Recommendation(BaseModel):
    course_code: str
    title: str  # from our DB
    match_level: MatchLevel  # words only — never a percentage
    why: str
    skills: list[str]
    student_insights: list[str]
    difficulty_avg: float | None  # from our DB
    workload_summary: str | None
    worth_score: float | None  # from our DB (Community Worth Score)
    review_count: int  # from our DB
    limitations: list[str]


class RecommendationsResponse(BaseModel):
    recommendations: list[Recommendation]


# ---- What Gemini must return -------------------------------------------------


class ModelRecommendation(BaseModel):
    course_code: str
    match_level: MatchLevel
    why: str
    skills: list[str] = Field(default_factory=list)
    student_insights: list[str] = Field(default_factory=list)
    workload_summary: str | None = None
    limitations: list[str] = Field(default_factory=list)


class ModelOutput(BaseModel):
    recommendations: list[ModelRecommendation]


# Plain JSON Schema (no $ref), passed to Gemini as response_json_schema.
GEMINI_RESPONSE_SCHEMA: dict = {
    "type": "object",
    "properties": {
        "recommendations": {
            "type": "array",
            "maxItems": 6,
            "items": {
                "type": "object",
                "properties": {
                    "course_code": {"type": "string", "description": "Exact code of one candidate course."},
                    "match_level": {"type": "string", "enum": list(MATCH_LEVELS)},
                    "why": {"type": "string", "description": "1-3 sentences tying the course to this student's goals."},
                    "skills": {"type": "array", "items": {"type": "string"}, "description": "Up to 6 short tags."},
                    "student_insights": {"type": "array", "items": {"type": "string"}},
                    "workload_summary": {"type": "string"},
                    "limitations": {"type": "array", "items": {"type": "string"}},
                },
                "required": [
                    "course_code",
                    "match_level",
                    "why",
                    "skills",
                    "student_insights",
                    "workload_summary",
                    "limitations",
                ],
            },
        }
    },
    "required": ["recommendations"],
}
