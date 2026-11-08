# AI-GENERATED (Cursor Agent) — Issue #9: Backend integration testing
# Owned by Backend Developer 1 (mamadub03).
# File-level AI attribution for this module (not per-symbol).
# ---------------------------------------------------------------------------
# FILE PURPOSE
#   Smoke / integration checks for Backend 1 surface area:
#   health, course OpenAPI + schemas, auth 401 behavior, model constraints.
#   Live Tiger Data / Auth0 checks are optional and skip without env vars
#   (wire credentials at end-to-end demo time).
# ---------------------------------------------------------------------------

"""Backend 1 integration and smoke tests."""

from __future__ import annotations

import os
import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

# Ensure `app` imports resolve when pytest is run from backend/.
import sys

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.db.models import Course, Review, User
from app.main import app
from app.schemas.course import CourseDetail, CourseSummary

client = TestClient(app, raise_server_exceptions=False)

HAS_DATABASE_URL = bool(os.getenv("DATABASE_URL", "").strip())
HAS_AUTH0 = bool(
    os.getenv("AUTH0_DOMAIN", "").strip()
    and os.getenv("AUTH0_API_AUDIENCE", "").strip()
)


# =============================================================================
# COMPONENT: always-on smoke tests (no external services required)
# =============================================================================
def test_health_ok() -> None:
    """API process responds on /health without DB/Auth0."""
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"


def test_openapi_includes_backend1_routes() -> None:
    """Course + auth routes are registered for frontend clients."""
    paths = client.get("/openapi.json").json()["paths"]
    for path in ("/health", "/courses", "/courses/{course_id}", "/auth/me", "/auth/verified-check"):
        assert path in paths, f"missing route {path}"


def test_auth_me_without_token_is_401() -> None:
    """Missing Bearer token must not reach protected handlers."""
    response = client.get("/auth/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


def test_auth_verified_check_without_token_is_401() -> None:
    response = client.get("/auth/verified-check")
    assert response.status_code == 401


def test_course_summary_schema_accepts_catalog_shape() -> None:
    """CourseSummary matches the search JSON contract Frontend 1/2 use."""
    summary = CourseSummary(
        id=uuid.uuid4(),
        code="ISTE-240",
        title="Web & Mobile I",
        description="DEMO DATA",
        department="ISTE",
        college="Golisano College of Computing and Information Sciences",
        campus="Henrietta",
        credits=3,
        prerequisites=None,
    )
    dumped = summary.model_dump()
    assert dumped["code"] == "ISTE-240"
    assert dumped["credits"] == 3


def test_course_detail_allows_null_worth_score() -> None:
    """Unreviewed courses expose null aggregates (MVP rule)."""
    detail = CourseDetail(
        id=uuid.uuid4(),
        code="COMM-201",
        title="Public Speaking",
        description="DEMO DATA",
        department="COMM",
        community_worth_score=None,
        review_count=0,
        average_concept_difficulty=None,
    )
    assert detail.review_count == 0
    assert detail.community_worth_score is None


def test_orm_tables_and_review_constraints_exist() -> None:
    """Schema constraints from DATABASE_SCHEMA.md are declared on models."""
    assert Course.__tablename__ == "courses"
    assert User.__tablename__ == "users"
    assert Review.__tablename__ == "reviews"

    table_args = Review.__table_args__
    constraint_names = {
        getattr(arg, "name", None) for arg in table_args if hasattr(arg, "name")
    }
    assert "uq_reviews_user_course" in constraint_names
    assert "ck_reviews_worth_score_range" in constraint_names
    assert "ck_reviews_concept_difficulty_range" in constraint_names
    assert "ck_reviews_weekly_hours_range" in constraint_names


# =============================================================================
# COMPONENT: optional live DB checks (skip until Tiger Data .env is filled)
# =============================================================================
@pytest.mark.skipif(not HAS_DATABASE_URL, reason="DATABASE_URL not set — defer Tiger Data wiring")
def test_database_connectivity() -> None:
    """Smoke: engine can connect and run SELECT 1."""
    from app.db.session import get_engine

    with get_engine().connect() as conn:
        assert conn.execute(text("SELECT 1")).scalar() == 1


@pytest.mark.skipif(not HAS_DATABASE_URL, reason="DATABASE_URL not set — defer Tiger Data wiring")
def test_courses_search_against_database() -> None:
    """Smoke: GET /courses hits Postgres (seed recommended)."""
    response = client.get("/courses", params={"limit": 5})
    assert response.status_code == 200, response.text
    body = response.json()
    assert "results" in body and "total" in body
    assert body["limit"] == 5


@pytest.mark.skipif(not HAS_AUTH0, reason="Auth0 env not set — defer live JWT smoke test")
def test_auth0_env_present_for_later_e2e() -> None:
    """Placeholder gate: env is present for Frontend 2 token smoke tests later."""
    assert HAS_AUTH0
