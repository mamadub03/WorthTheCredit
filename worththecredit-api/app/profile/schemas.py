"""Student profile shapes.

Spec field names: major, interests, skills, career_goals, personal_interests,
degree_requirements. The FE2 frontend calls two of them `academic_interests`
and `existing_skills`, so both spellings are accepted on input and both are
returned on output.
"""

from datetime import datetime

from pydantic import AliasChoices, BaseModel, Field, computed_field, field_validator

from app.common import clean_tags

LIMITS = {"major": 100, "tags": 10, "tag_len": 40, "career_goals": 1000, "degree_requirements": 500}


class ProfileIn(BaseModel):
    major: str = Field(min_length=1, max_length=LIMITS["major"])
    interests: list[str] = Field(
        default_factory=list,
        max_length=LIMITS["tags"],
        validation_alias=AliasChoices("interests", "academic_interests"),
    )
    skills: list[str] = Field(
        default_factory=list, max_length=LIMITS["tags"], validation_alias=AliasChoices("skills", "existing_skills")
    )
    career_goals: str = Field(default="", max_length=LIMITS["career_goals"])
    personal_interests: list[str] = Field(default_factory=list, max_length=LIMITS["tags"])
    degree_requirements: str = Field(default="", max_length=LIMITS["degree_requirements"])

    @field_validator("major", "career_goals", "degree_requirements")
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()

    @field_validator("major")
    @classmethod
    def _major_required(cls, v: str) -> str:
        if not v:
            raise ValueError('Enter your major (or "Undeclared").')
        return v

    @field_validator("interests", "skills", "personal_interests")
    @classmethod
    def _tags(cls, v: list[str]) -> list[str]:
        return clean_tags(v, LIMITS["tag_len"])


class ProfileOut(ProfileIn):
    updated_at: datetime | None = None

    # Same data under the frontend's names (read-only aliases).
    @computed_field
    @property
    def academic_interests(self) -> list[str]:
        return self.interests

    @computed_field
    @property
    def existing_skills(self) -> list[str]:
        return self.skills
