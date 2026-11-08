"""Pydantic request/response models for reviews.

If a request doesn't match, FastAPI automatically answers 422 with a list of
{loc, msg, type} entries, e.g. loc = ["body", "worth_score"].
Public response models contain NO identifying fields (no user_id/sub/email).
"""

import re
import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, Field, field_validator

from app.common import clean_tags
from app.reviews.enums import REPORT_ALIASES, GoalCategory, ReportReason, WeeklyHours

_SEMESTER_RE = re.compile(r"^(Fall|Spring|Summer) (\d{4})$")

LIMITS = {"feedback": 1000, "professor": 100, "skills": 10, "skill_len": 40, "report_note": 500}


def _blank_to_none(v: object) -> object:
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v


OptionalText = Annotated[str | None, BeforeValidator(_blank_to_none)]


class ReviewCreate(BaseModel):
    course_code: str = Field(min_length=3, max_length=16, examples=["SWEN-261"])
    goals: list[GoalCategory] = Field(min_length=1, max_length=5)
    worth_score: int = Field(ge=1, le=5, description="How well the course helped you meet YOUR goals")
    skills: list[str] = Field(min_length=1, max_length=LIMITS["skills"])
    difficulty: int = Field(ge=1, le=5, description="How hard the CONCEPTS were (not professor/workload)")
    weekly_hours: WeeklyHours
    feedback: OptionalText = Field(default=None, max_length=LIMITS["feedback"])
    professor: OptionalText = Field(default=None, max_length=LIMITS["professor"])
    semester: OptionalText = Field(default=None, examples=["Fall 2025"])

    @field_validator("goals")
    @classmethod
    def _dedupe_goals(cls, v: list[str]) -> list[str]:
        return list(dict.fromkeys(v))

    @field_validator("skills")
    @classmethod
    def _clean_skills(cls, v: list[str]) -> list[str]:
        cleaned = clean_tags(v, LIMITS["skill_len"])
        if not cleaned:
            raise ValueError("Add at least one skill.")
        return cleaned

    @field_validator("semester")
    @classmethod
    def _semester(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = re.sub(r"\s+", " ", v).title()  # "fall  2025" → "Fall 2025"
        m = _SEMESTER_RE.match(v)
        if not m or not 2000 <= int(m.group(2)) <= 2100:
            raise ValueError('Use the format "Fall 2025" (Fall, Spring or Summer, then the year).')
        return v


class ReviewOut(BaseModel):
    """A review as anyone may see it. Deliberately has no user fields."""

    id: uuid.UUID
    course_code: str
    goals: list[str]
    worth_score: int
    skills: list[str]
    difficulty: int
    weekly_hours: str
    feedback: str | None
    professor: str | None
    semester: str | None
    created_at: datetime


class ReviewPage(BaseModel):
    items: list[ReviewOut]
    total: int
    limit: int
    offset: int


class MyReviewStatus(BaseModel):
    course_code: str
    has_reviewed: bool
    review: ReviewOut | None = None


def _report_alias(v: object) -> object:
    return REPORT_ALIASES.get(v, v) if isinstance(v, str) else v


class ReportCreate(BaseModel):
    reason: Annotated[ReportReason, BeforeValidator(_report_alias)]
    note: OptionalText = Field(default=None, max_length=LIMITS["report_note"])


class ReportOut(BaseModel):
    status: str = "received"


class HiddenOut(BaseModel):
    id: uuid.UUID
    is_hidden: bool
