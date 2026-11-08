"""Worth Score and course statistics, computed with SQL aggregates (GROUP BY).

Main entry point (BE1's course detail/search and BE2's recommendations both use it):

    stats = get_course_stats(db, [course_id, ...])   # → {course_id: CourseStats}

Rules:
- Only visible reviews count: every query has `is_hidden = false`.
- Community Worth Score = AVG(worth_score), rounded to 1 decimal in SQL.
  Postgres ROUND(numeric) rounds halves away from zero, so 4.25 → 4.3.
- 0 reviews → worth_score is NULL (None), never 0.
- The Worth Score uses only `worth_score`: difficulty, workload and professor
  never enter that average.

Each statistic is one query that groups by course_id, so asking for 25
courses costs 5 queries total, not 25×5, and no review rows are loaded
into Python.
"""

from collections.abc import Sequence

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.be1_stubs.models import Course
from app.reviews.enums import HOURS_LABEL, HOURS_VALUES
from app.scores.schemas import CourseStats, GoalBreakdown, ProfessorStats, SkillCount

LOW_DATA_THRESHOLD = 3

_VISIBLE = "r.is_hidden = false AND r.course_id = ANY(:ids)"

SQL_TOTALS = text(f"""
    SELECT r.course_id,
           COUNT(*)                                   AS review_count,
           ROUND(AVG(r.worth_score)::numeric, 1)      AS worth_score,
           ROUND(AVG(r.difficulty)::numeric, 1)       AS difficulty_avg
    FROM reviews r
    WHERE {_VISIBLE}
    GROUP BY r.course_id
""")

SQL_HOURS = text(f"""
    SELECT r.course_id, r.weekly_hours::text AS bucket, COUNT(*) AS n
    FROM reviews r
    WHERE {_VISIBLE}
    GROUP BY r.course_id, r.weekly_hours
""")

# unnest() turns each review's skills array into rows; lower() merges "React"/"react";
# mode() picks the most common spelling to display; row_number() keeps the top N per course.
SQL_SKILLS = text(f"""
    SELECT course_id, display, n FROM (
        SELECT r.course_id,
               mode() WITHIN GROUP (ORDER BY s.skill)                         AS display,
               COUNT(*)                                                       AS n,
               ROW_NUMBER() OVER (PARTITION BY r.course_id
                                  ORDER BY COUNT(*) DESC, lower(s.skill))     AS rn
        FROM reviews r CROSS JOIN LATERAL unnest(r.skills) AS s(skill)
        WHERE {_VISIBLE}
        GROUP BY r.course_id, lower(s.skill)
    ) ranked
    WHERE rn <= :top
    ORDER BY course_id, n DESC, display
""")

SQL_GOALS = text(f"""
    SELECT r.course_id, g.goal::text AS goal, COUNT(*) AS n,
           ROUND(AVG(r.worth_score)::numeric, 1) AS worth_score
    FROM reviews r CROSS JOIN LATERAL unnest(r.goals) AS g(goal)
    WHERE {_VISIBLE}
    GROUP BY r.course_id, g.goal
    ORDER BY r.course_id, n DESC, goal
""")

# Professor names are grouped ignoring case, dots and extra spaces ("Dr. Lee" = "dr lee").
SQL_PROFESSORS = text(f"""
    SELECT r.course_id,
           mode() WITHIN GROUP (ORDER BY btrim(r.professor))   AS professor,
           COUNT(*)                                            AS n,
           ROUND(AVG(r.worth_score)::numeric, 1)               AS worth_score,
           ROUND(AVG(r.difficulty)::numeric, 1)                AS difficulty_avg
    FROM reviews r
    WHERE {_VISIBLE} AND r.professor IS NOT NULL AND btrim(r.professor) <> ''
    GROUP BY r.course_id, lower(regexp_replace(replace(btrim(r.professor), '.', ''), '\\s+', ' ', 'g'))
    ORDER BY r.course_id, n DESC, professor
""")

SQL_EXCERPTS = text(f"""
    SELECT course_id, excerpt FROM (
        SELECT r.course_id,
               left(r.feedback, :max_chars) AS excerpt,
               ROW_NUMBER() OVER (PARTITION BY r.course_id ORDER BY r.created_at DESC) AS rn
        FROM reviews r
        WHERE {_VISIBLE} AND r.feedback IS NOT NULL AND btrim(r.feedback) <> ''
    ) recent
    WHERE rn <= :per_course
""")


def _f(value) -> float | None:
    return float(value) if value is not None else None


def workload_summary(distribution: dict[str, int]) -> tuple[str | None, str | None]:
    """(most common bucket, human sentence). Ties go to the lighter bucket."""
    total = sum(distribution.values())
    if total == 0:
        return None, None
    bucket = max(HOURS_VALUES, key=lambda b: (distribution.get(b, 0), -HOURS_VALUES.index(b)))
    n = distribution[bucket]
    label = HOURS_LABEL[bucket]
    if n / total >= 0.5:
        return bucket, f"Most students report {label} hrs/week"
    return bucket, f"Most common: {label} hrs/week ({n} of {total} reviews)"


def get_course_stats(db: Session, course_ids: Sequence[int], top_skills: int = 8) -> dict[int, CourseStats]:
    """Statistics for many courses at once. Courses with no reviews are included (null scores)."""
    ids = list(dict.fromkeys(course_ids))
    if not ids:
        return {}
    codes = dict(db.execute(select(Course.id, Course.code).where(Course.id.in_(ids))).all())
    params = {"ids": ids}

    totals = {row.course_id: row for row in db.execute(SQL_TOTALS, params)}
    hours: dict[int, dict[str, int]] = {cid: dict.fromkeys(HOURS_VALUES, 0) for cid in codes}
    for row in db.execute(SQL_HOURS, params):
        hours[row.course_id][row.bucket] = row.n
    skills: dict[int, list[SkillCount]] = {cid: [] for cid in codes}
    for row in db.execute(SQL_SKILLS, {**params, "top": top_skills}):
        skills[row.course_id].append(SkillCount(skill=row.display, count=row.n))
    goals: dict[int, list[GoalBreakdown]] = {cid: [] for cid in codes}
    for row in db.execute(SQL_GOALS, params):
        goals[row.course_id].append(GoalBreakdown(goal=row.goal, count=row.n, worth_score=_f(row.worth_score)))
    profs: dict[int, list[ProfessorStats]] = {cid: [] for cid in codes}
    for row in db.execute(SQL_PROFESSORS, params):
        profs[row.course_id].append(
            ProfessorStats(
                professor=row.professor,
                review_count=row.n,
                worth_score=_f(row.worth_score),
                difficulty_avg=_f(row.difficulty_avg),
            )
        )

    out: dict[int, CourseStats] = {}
    for cid, code in codes.items():
        t = totals.get(cid)
        count = t.review_count if t else 0
        common, summary = workload_summary(hours[cid])
        out[cid] = CourseStats(
            course_code=code,
            review_count=count,
            worth_score=_f(t.worth_score) if t else None,
            difficulty_avg=_f(t.difficulty_avg) if t else None,
            workload_distribution=hours[cid],
            workload_most_common=common,
            workload_summary=summary,
            top_skills=skills[cid],
            goals=goals[cid],
            professors=profs[cid],
            low_data=count < LOW_DATA_THRESHOLD,
        )
    return out


def get_worth_scores(db: Session, course_ids: Sequence[int]) -> dict[int, tuple[float | None, int]]:
    """Lightweight (worth_score, review_count) per course — one query, for search result lists."""
    ids = list(dict.fromkeys(course_ids))
    out: dict[int, tuple[float | None, int]] = dict.fromkeys(ids, (None, 0))
    if ids:
        for row in db.execute(SQL_TOTALS, {"ids": ids}):
            out[row.course_id] = (_f(row.worth_score), row.review_count)
    return out


def get_review_excerpts(
    db: Session, course_ids: Sequence[int], per_course: int = 3, max_chars: int = 200
) -> dict[int, list[str]]:
    """Most recent written feedback per course, truncated (used in the Gemini prompt)."""
    ids = list(dict.fromkeys(course_ids))
    out: dict[int, list[str]] = {cid: [] for cid in ids}
    if ids:
        rows = db.execute(SQL_EXCERPTS, {"ids": ids, "per_course": per_course, "max_chars": max_chars})
        for row in rows:
            out[row.course_id].append(row.excerpt)
    return out
