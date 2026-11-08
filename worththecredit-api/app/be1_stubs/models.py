"""STUBS for Backend Dev 1's models: `users` and `courses`.

BE1 owns these tables. BE2 relies only on:
  users.id (PK), users.auth0_sub (unique), users.email
  courses.id (PK), courses.code (unique, e.g. "SWEN-261"), title, description,
  department, credit_hours, prerequisites
When BE1's models exist, delete this file, import theirs in BE2's modules,
and delete migration 0001 (point 0002's down_revision at BE1's latest).
"""

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    auth0_sub: Mapped[str] = mapped_column(String(128), unique=True)  # "auth0|65f1..."
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(16), unique=True)  # "SWEN-261"
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, server_default="")
    department: Mapped[str] = mapped_column(String(120), server_default="")
    credit_hours: Mapped[int | None] = mapped_column(Integer, nullable=True)
    prerequisites: Mapped[str] = mapped_column(Text, server_default="")
