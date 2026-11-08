"""STUB: course lookups BE2 needs. Replace with BE1's equivalents when merging."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.be1_stubs.models import Course
from app.common import normalize_course_code


def get_course_by_code(db: Session, code: str) -> Course | None:
    return db.scalar(select(Course).where(Course.code == normalize_course_code(code)))
