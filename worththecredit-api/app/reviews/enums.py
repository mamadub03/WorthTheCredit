"""Fixed vocabularies, shared by Pydantic validation and the Postgres ENUM types."""

from typing import Literal, get_args

GoalCategory = Literal[
    "career_preparation",
    "skill_development",
    "academic_development",
    "degree_requirement",
    "personal_exploration",
]
WeeklyHours = Literal["0-3", "4-6", "7-9", "10-12", "13+"]
ReportReason = Literal["spam", "fake", "inappropriate", "off_topic", "other"]

GOAL_VALUES: tuple[str, ...] = get_args(GoalCategory)
HOURS_VALUES: tuple[str, ...] = get_args(WeeklyHours)  # in order, lightest → heaviest
REPORT_VALUES: tuple[str, ...] = get_args(ReportReason)

HOURS_LABEL = {"0-3": "0–3", "4-6": "4–6", "7-9": "7–9", "10-12": "10–12", "13+": "13+"}

# The FE2 frontend's report picker uses a few different words; accept them.
REPORT_ALIASES = {
    "offensive": "inappropriate",
    "personal_info": "inappropriate",
    "not_about_course": "off_topic",
}
