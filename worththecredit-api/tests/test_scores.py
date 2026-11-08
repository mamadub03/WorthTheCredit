"""Worth Score SQL math."""

from app.be1_stubs.models import Course
from app.scores.service import get_course_stats, get_worth_scores, workload_summary
from tests.conftest import ADMIN


def _course_id(db, code: str) -> int:
    return db.query(Course.id).filter(Course.code == code).scalar()


def test_zero_reviews_gives_null_not_zero(client):
    s = client.get("/courses/PSYC-101/stats").json()
    assert s["worth_score"] is None and s["difficulty_avg"] is None
    assert s["review_count"] == 0 and s["low_data"] is True
    assert s["workload_distribution"] == {"0-3": 0, "4-6": 0, "7-9": 0, "10-12": 0, "13+": 0}
    assert s["workload_most_common"] is None and s["top_skills"] == [] and s["professors"] == []


def test_average_and_rounding(client, post_review):
    for i, score in enumerate([4, 5, 4, 4]):  # mean 4.25 → 4.3 (half away from zero)
        post_review(f"auth0|u{i}", worth_score=score)
    s = client.get("/courses/SWEN-261/stats").json()
    assert s["worth_score"] == 4.3 and s["review_count"] == 4 and s["low_data"] is False


def test_rounding_down(client, post_review):
    for i, score in enumerate([5, 4, 4]):  # 4.333… → 4.3
        post_review(f"auth0|d{i}", worth_score=score)
    assert client.get("/courses/SWEN-261/stats").json()["worth_score"] == 4.3


def test_hidden_reviews_excluded_from_stats(client, post_review):
    keep = post_review("auth0|keep", worth_score=2, difficulty=2)
    gone = post_review("auth0|gone", worth_score=5, difficulty=5, skills=["Secret"])
    client.post(f"/admin/reviews/{gone['id']}/hide", headers=ADMIN)
    s = client.get("/courses/SWEN-261/stats").json()
    assert s["worth_score"] == 2.0 and s["difficulty_avg"] == 2.0 and s["review_count"] == 1
    assert "Secret" not in [k["skill"] for k in s["top_skills"]]
    assert keep["id"]


def test_worth_score_independent_of_difficulty_and_workload(client, post_review):
    post_review("auth0|a", worth_score=3, difficulty=1, weekly_hours="0-3")
    post_review("auth0|b", worth_score=3, difficulty=5, weekly_hours="13+")
    s = client.get("/courses/SWEN-261/stats").json()
    assert s["worth_score"] == 3.0 and s["difficulty_avg"] == 3.0


def test_workload_skills_goals_professors(client, post_review):
    post_review("auth0|1", weekly_hours="7-9", skills=["React", "SQL"], goals=["career_preparation"],
                professor="Dr. Lee", worth_score=5, difficulty=4)  # fmt: skip
    post_review("auth0|2", weekly_hours="7-9", skills=["react"], goals=["career_preparation", "skill_development"],
                professor="dr lee", worth_score=3, difficulty=2)  # fmt: skip
    post_review("auth0|3", weekly_hours="13+", skills=["Teamwork"], goals=["personal_exploration"],
                professor=None, worth_score=4, difficulty=3)  # fmt: skip
    s = client.get("/courses/SWEN-261/stats").json()
    assert s["workload_distribution"]["7-9"] == 2 and s["workload_distribution"]["13+"] == 1
    assert s["workload_most_common"] == "7-9"
    assert s["workload_summary"] == "Most students report 7–9 hrs/week"
    assert s["top_skills"][0] == {"skill": "React", "count": 2}  # merged case-insensitively
    career = next(g for g in s["goals"] if g["goal"] == "career_preparation")
    assert career == {"goal": "career_preparation", "count": 2, "worth_score": 4.0}
    assert s["professors"] == [{"professor": "Dr. Lee", "review_count": 2, "worth_score": 4.0, "difficulty_avg": 3.0}]


def test_workload_summary_tie_and_minority():
    dist = {"0-3": 1, "4-6": 1, "7-9": 1, "10-12": 0, "13+": 0}
    assert workload_summary(dist) == ("0-3", "Most common: 0–3 hrs/week (1 of 3 reviews)")
    assert workload_summary(dict.fromkeys(dist, 0)) == (None, None)


def test_get_course_stats_many_courses_one_call(db, client, post_review):
    post_review("auth0|x", course_code="CSCI-420", worth_score=5)
    ids = [_course_id(db, "CSCI-420"), _course_id(db, "PSYC-101")]
    stats = get_course_stats(db, ids)
    assert stats[ids[0]].worth_score == 5.0 and stats[ids[0]].course_code == "CSCI-420"
    assert stats[ids[1]].worth_score is None and stats[ids[1]].review_count == 0
    assert get_worth_scores(db, ids) == {ids[0]: (5.0, 1), ids[1]: (None, 0)}
    assert get_course_stats(db, []) == {}


def test_stats_unknown_course_404(client):
    assert client.get("/courses/NOPE-000/stats").status_code == 404
