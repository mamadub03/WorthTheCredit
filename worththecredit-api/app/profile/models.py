"""Student profile for AI recommendations: one row per user.

A separate table (instead of a JSONB column on BE1's `users`) keeps BE2 from
editing BE1's model. Resume upload (stretch goal) can later add columns here,
e.g. `resume_text TEXT` and `resume_uploaded_at`, with one new migration.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    major: Mapped[str] = mapped_column(String(100))
    interests: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default="{}")
    skills: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default="{}")
    career_goals: Mapped[str] = mapped_column(Text, server_default="")
    personal_interests: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default="{}")
    degree_requirements: Mapped[str] = mapped_column(Text, server_default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
