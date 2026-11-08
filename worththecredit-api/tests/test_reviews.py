"""Review endpoints."""

import uuid

import pytest
from sqlalchemy.exc import IntegrityError

from app.be1_stubs.models import Course, User
from app.reviews.models import Review
from tests.conftest import ADMIN, auth

PUBLIC_FIELDS = {
    "id",
    "course_code",
    "goals",
    "worth_score",
    "skills",
    "difficulty",
    "weekly_hours",
    "feedback",
    "professor",
    "semester",
    "created_at",
}


def test_create_review_201_and_normalization(client, review_body):
    r = client.post(
        "/reviews",
        json=review_body(
            course_code="swen261",
            goals=["skill_development", "skill_development"],
            skills=["  React ", "react", "Unit   testing"],
            semester="fall 2025",
            professor="   ",
        ),
        headers=auth(),
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert set(data) == PUBLIC_FIELDS
    assert data["course_code"] == "SWEN-261"
    assert data["goals"] == ["skill_development"]
    assert data["skills"] == ["React", "Unit testing"]  # trimmed, collapsed, deduped case-insensitively
    assert data["semester"] == "Fall 2025"
    assert data["professor"] is None


def test_second_review_same_course_is_409_regardless_of_semester(client, review_body, post_review):
    post_review(semester="Fall 2024")
    r = client.post("/reviews", json=review_body(semester="Spring 2026", worth_score=1), headers=auth())
    assert r.status_code == 409 and r.json() == {"detail": "already_reviewed"}
    post_review("auth0|someone-else")  # other students can still review it


def test_unique_constraint_is_in_the_database(db):
    """Even bypassing the API, Postgres refuses a second row for the same (user, course)."""
    user = User(auth0_sub="auth0|race")
    db.add(user)
    db.flush()
    course_id = db.query(Course.id).filter(Course.code == "SWEN-261").scalar()
    row = dict(
        user_id=user.id, course_id=course_id, goals=["career_preparation"], worth_score=3, skills=["x"], difficulty=3
    )
    db.add(Review(**row, weekly_hours="0-3"))
    db.flush()
    db.add(Review(**row, weekly_hours="4-6"))
    with pytest.raises(IntegrityError, match="uq_reviews_user_course"):
        db.flush()


def test_database_check_constraints(db):
    user = User(auth0_sub="auth0|check")
    db.add(user)
    db.flush()
    course_id = db.query(Course.id).filter(Course.code == "SWEN-261").scalar()
    db.add(
        Review(
            user_id=user.id,
            course_id=course_id,
            goals=["career_preparation"],
            worth_score=9,
            skills=["x"],
            difficulty=3,
            weekly_hours="0-3",
        )
    )
    with pytest.raises(IntegrityError, match="worth_score_range"):
        db.flush()


def test_unknown_course_is_404(client, review_body):
    r = client.post("/reviews", json=review_body(course_code="FAKE-999"), headers=auth())
    assert r.status_code == 404 and r.json() == {"detail": "course_not_found"}


@pytest.mark.parametrize(
    ("override", "field"),
    [
        ({"worth_score": 0}, "worth_score"),
        ({"worth_score": 6}, "worth_score"),
        ({"worth_score": "five"}, "worth_score"),
        ({"difficulty": 7}, "difficulty"),
        ({"goals": []}, "goals"),
        ({"goals": ["having_fun"]}, "goals"),
        ({"skills": []}, "skills"),
        ({"skills": ["   ", ""]}, "skills"),
        ({"skills": ["x" * 41]}, "skills"),
        ({"skills": [f"s{i}" for i in range(11)]}, "skills"),
        ({"weekly_hours": "20+"}, "weekly_hours"),
        ({"feedback": "a" * 1001}, "feedback"),
        ({"professor": "p" * 101}, "professor"),
        ({"semester": "Winter 2025"}, "semester"),
        ({"semester": "2025"}, "semester"),
        ({"course_code": ""}, "course_code"),
    ],
)
def test_validation_422(client, review_body, override, field):
    r = client.post("/reviews", json=review_body(**override), headers=auth())
    assert r.status_code == 422, r.text
    assert any(e["loc"][:2] == ["body", field] for e in r.json()["detail"])


def test_missing_required_field_422(client, review_body):
    body = review_body()
    del body["weekly_hours"]
    assert client.post("/reviews", json=body, headers=auth()).status_code == 422


def test_reviews_me(client, post_review):
    r = client.get("/reviews/me", params={"course_code": "swen-261"}, headers=auth())
    assert r.json() == {"course_code": "SWEN-261", "has_reviewed": False, "review": None}
    created = post_review()
    r = client.get("/reviews/me", params={"course_code": "SWEN-261"}, headers=auth())
    assert r.json()["has_reviewed"] is True
    assert r.json()["review"]["id"] == created["id"]
    assert client.get("/reviews/me", params={"course_code": "NOPE-000"}, headers=auth()).status_code == 404


def test_public_list_is_anonymous_paginated_newest_first(client, post_review):
    first = post_review("auth0|alice", professor="Dr. Rivera")
    second = post_review("auth0|bob", professor="Prof. Chen")
    r = client.get("/courses/SWEN-261/reviews", params={"limit": 1})
    body = r.json()
    assert r.status_code == 200 and body["total"] == 2 and body["limit"] == 1
    assert body["items"][0]["id"] == second["id"]  # newest first
    assert (
        client.get("/courses/SWEN-261/reviews", params={"limit": 1, "offset": 1}).json()["items"][0]["id"]
        == (first["id"])
    )
    for item in body["items"]:
        assert set(item) == PUBLIC_FIELDS
    text = client.get("/courses/SWEN-261/reviews").text
    for secret in ("alice", "bob", "auth0|", "user_id", "@example.com", "sub"):
        assert secret not in text
    filtered = client.get("/courses/SWEN-261/reviews", params={"professor": "  prof. CHEN "}).json()
    assert filtered["total"] == 1 and filtered["items"][0]["professor"] == "Prof. Chen"
    assert client.get("/courses/NOPE-000/reviews").status_code == 404


def test_report_flow(client, post_review):
    rid = post_review("auth0|author")["id"]
    r = client.post(f"/reviews/{rid}/report", json={"reason": "spam", "note": "ad"}, headers=auth("auth0|r1"))
    assert r.status_code == 201 and r.json() == {"status": "received"}
    r = client.post(f"/reviews/{rid}/report", json={"reason": "fake"}, headers=auth("auth0|r1"))
    assert r.status_code == 409 and r.json() == {"detail": "already_reported"}
    # Frontend alias "offensive" → "inappropriate"
    r = client.post(f"/reviews/{rid}/report", json={"reason": "offensive"}, headers=auth("auth0|r2"))
    assert r.status_code == 201
    assert client.post(f"/reviews/{rid}/report", json={"reason": "boring"}, headers=auth("auth0|r3")).status_code == 422
    missing = uuid.uuid4()
    assert client.post(f"/reviews/{missing}/report", json={"reason": "spam"}, headers=auth()).status_code == 404


def test_hidden_reviews_excluded_everywhere(client, post_review):
    bad = post_review("auth0|troll", worth_score=1)["id"]
    post_review("auth0|good", worth_score=5)
    assert client.post(f"/admin/reviews/{bad}/hide", headers=ADMIN).status_code == 200
    assert client.get("/courses/SWEN-261/reviews").json()["total"] == 1
    stats = client.get("/courses/SWEN-261/stats").json()
    assert stats["worth_score"] == 5.0 and stats["review_count"] == 1
    # Hidden reviews can't be reported, and still block a second review by the author.
    assert client.post(f"/reviews/{bad}/report", json={"reason": "spam"}, headers=auth()).status_code == 404
    assert client.post("/reviews", json={"course_code": "SWEN-261"}, headers=auth("auth0|troll")).status_code == 422


def test_no_edit_or_delete_endpoints(client, post_review):
    rid = post_review()["id"]
    for method in ("put", "patch", "delete"):
        r = getattr(client, method)(f"/reviews/{rid}", headers=auth())
        assert r.status_code in (404, 405), method
