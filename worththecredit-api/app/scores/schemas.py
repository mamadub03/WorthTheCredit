from pydantic import BaseModel


class SkillCount(BaseModel):
    skill: str
    count: int


class GoalBreakdown(BaseModel):
    goal: str
    count: int
    worth_score: float | None  # average Worth Score among reviewers who had this goal


class ProfessorStats(BaseModel):
    professor: str
    review_count: int
    worth_score: float | None
    difficulty_avg: float | None


class CourseStats(BaseModel):
    course_code: str
    review_count: int
    worth_score: float | None  # Community Worth Score; null (not 0) when there are no reviews
    difficulty_avg: float | None
    workload_distribution: dict[str, int]  # every bucket present, e.g. {"0-3": 0, "4-6": 2, ...}
    workload_most_common: str | None  # e.g. "7-9"
    workload_summary: str | None  # e.g. "Most students report 7–9 hrs/week"
    top_skills: list[SkillCount]
    goals: list[GoalBreakdown]
    professors: list[ProfessorStats]
    low_data: bool  # fewer than 3 reviews
