"""STUB of BE1's course search/detail so the API runs end to end. Delete when BE1's lands.

Shows how BE1 should attach scores:
  - search lists → get_worth_scores(db, ids)      (1 query for all results)
  - detail page  → get_course_stats(db, [id])     (full stats)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.be1_stubs.models import Course
from app.be1_stubs.queries import get_course_by_code
from app.db import get_db
from app.scores.schemas import CourseStats
from app.scores.service import get_course_stats, get_worth_scores

router = APIRouter(prefix="/courses", tags=["courses (BE1 stub)"])


class CourseSummary(BaseModel):
    course_code: str
    title: str
    department: str | None
    credit_hours: int | None
    worth_score: float | None
    review_count: int


class CourseDetail(CourseSummary):
    description: str
    prerequisites: str
    stats: CourseStats


@router.get("", response_model=list[CourseSummary])
def search_courses(q: str = Query(default="", max_length=100), db: Session = Depends(get_db)):
    stmt = select(Course).order_by(Course.code).limit(25)
    q = q.strip()
    if q:
        compact = f"%{q.replace(' ', '').replace('-', '')}%"
        stmt = stmt.where(
            or_(
                func.replace(Course.code, "-", "").ilike(compact),
                Course.title.ilike(f"%{q}%"),
                Course.department.ilike(f"%{q}%"),
            )
        )
    courses = db.scalars(stmt).all()
    scores = get_worth_scores(db, [c.id for c in courses])
    return [
        CourseSummary(
            course_code=c.code,
            title=c.title,
            department=c.department or None,
            credit_hours=c.credit_hours,
            worth_score=scores[c.id][0],
            review_count=scores[c.id][1],
        )
        for c in courses
    ]


@router.get("/{course_code}", response_model=CourseDetail)
def course_detail(course_code: str, db: Session = Depends(get_db)):
    c = get_course_by_code(db, course_code)
    if c is None:
        raise HTTPException(status_code=404, detail="course_not_found")
    stats = get_course_stats(db, [c.id])[c.id]
    return CourseDetail(
        course_code=c.code,
        title=c.title,
        department=c.department or None,
        credit_hours=c.credit_hours,
        worth_score=stats.worth_score,
        review_count=stats.review_count,
        description=c.description,
        prerequisites=c.prerequisites,
        stats=stats,
    )
