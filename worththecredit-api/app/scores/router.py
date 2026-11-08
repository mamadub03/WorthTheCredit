"""GET /courses/{course_code}/stats — public Worth Score and aggregates for one course."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.be1_stubs.queries import get_course_by_code
from app.db import get_db
from app.scores.schemas import CourseStats
from app.scores.service import get_course_stats

router = APIRouter(tags=["stats"])


@router.get("/courses/{course_code}/stats", response_model=CourseStats)
def course_stats(course_code: str, db: Session = Depends(get_db)) -> CourseStats:
    course = get_course_by_code(db, course_code)
    if course is None:
        raise HTTPException(status_code=404, detail="course_not_found")
    return get_course_stats(db, [course.id])[course.id]
