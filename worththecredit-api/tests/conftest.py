"""Test setup.

- A SEPARATE Postgres database (TEST_DATABASE_URL, default: worththecredit_test).
  At the start of the run it is wiped and built with the real Alembic migrations.
- Every test runs inside a transaction that is rolled back afterwards, so tests
  never see each other's data (endpoints' commits become SAVEPOINT releases).
- Auth: tokens are real RS256 JWTs signed with a test key. We override the
  token-verifier dependency so its "JWKS download" returns our test public key,
  so no real Auth0 is needed and the real validation code still runs.
- Gemini: the get_model dependency is overridden with scripted fakes.
"""

import os
from pathlib import Path

from dotenv import dotenv_values

# TEST_DATABASE_URL from the environment, else from .env, else the local default.
TEST_DB_URL = (
    os.environ.get("TEST_DATABASE_URL")
    or dotenv_values(Path(__file__).resolve().parents[1] / ".env").get("TEST_DATABASE_URL")
    or "postgresql+psycopg://wtc:wtc@localhost:5432/worththecredit_test"
)
if TEST_DB_URL.rstrip("/").rsplit("/", 1)[-1].split("?")[0] == "worththecredit":
    raise RuntimeError("TEST_DATABASE_URL must point to a separate database — tests wipe it!")
os.environ.update(
    {
        "ENVIRONMENT": "test",
        "DATABASE_URL": TEST_DB_URL,
        "AUTH0_DOMAIN": "test-tenant.auth0.local",
        "AUTH0_AUDIENCE": "https://api.worththecredit.test",
        "GEMINI_API_KEY": "",
        "USE_FAKE_GEMINI": "false",
        "DEV_AUTH_BYPASS": "false",
        "ADMIN_API_KEY": "test-admin-key",
        "RECOMMENDATIONS_PER_MINUTE": "1000",
    }
)

import json  # noqa: E402
import time  # noqa: E402
from collections.abc import Iterator  # noqa: E402

import jwt  # noqa: E402
import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from cryptography.hazmat.primitives.asymmetric import rsa  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.auth.tokens import TokenVerifier, get_token_verifier  # noqa: E402
from app.be1_stubs.models import Course  # noqa: E402
from app.config import get_settings  # noqa: E402
from app.db import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.recommendations.gemini import get_model  # noqa: E402
from app.recommendations.router import limiter as rec_limiter  # noqa: E402

SETTINGS = get_settings()
KID = "test-key-1"
PRIVATE_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
OTHER_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
ROOT = Path(__file__).resolve().parents[1]

COURSES = [
    dict(
        code="SWEN-261",
        title="Introduction to Software Engineering",
        department="Software Engineering",
        description="Team-based software development with agile practices, testing and Java.",
        credit_hours=3,
        prerequisites="CSCI-142",
    ),
    dict(
        code="CSCI-420",
        title="Principles of Data Mining",
        department="Computer Science",
        description="Hands-on machine learning: classification and clustering on real data sets.",
        credit_hours=3,
        prerequisites="CSCI-243",
    ),
    dict(
        code="CSCI-335",
        title="Machine Learning",
        department="Computer Science",
        description="Neural networks and model evaluation.",
        credit_hours=3,
        prerequisites="CSCI-331",
    ),
    dict(
        code="IGME-106",
        title="Game Development and Algorithmic Problem Solving II",
        department="Interactive Games and Media",
        description="Object-oriented programming in C# for games.",
        credit_hours=3,
        prerequisites="IGME-105",
    ),
    dict(
        code="PSYC-101",
        title="Introduction to Psychology",
        department="Psychology",
        description="Human behavior and cognition.",
        credit_hours=3,
        prerequisites="",
    ),
    dict(
        code="PSYC-250",
        title="Social Psychology",
        department="Psychology",
        description="How people influence each other.",
        credit_hours=3,
        prerequisites="PSYC-101",
    ),
]


# ---------------------------------------------------------------- database


@pytest.fixture(scope="session")
def engine():
    eng = create_engine(TEST_DB_URL)
    with eng.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
    cfg = Config(str(ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(ROOT / "alembic"))
    cfg.attributes["database_url"] = TEST_DB_URL
    command.upgrade(cfg, "head")  # the real migrations
    with Session(eng) as s:
        s.add_all([Course(**c) for c in COURSES])
        s.commit()
    yield eng
    eng.dispose()


@pytest.fixture
def db(engine) -> Iterator[Session]:
    conn = engine.connect()
    outer = conn.begin()
    session = Session(bind=conn, join_transaction_mode="create_savepoint", expire_on_commit=False)
    try:
        yield session
    finally:
        session.close()
        outer.rollback()  # undo everything the test did
        conn.close()


# ---------------------------------------------------------------- auth


def _jwks() -> dict:
    jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(PRIVATE_KEY.public_key()))
    jwk.update({"kid": KID, "use": "sig", "alg": "RS256"})
    return {"keys": [jwk]}


def make_token(
    sub: str = "auth0|student-1",
    *,
    verified: bool | None = True,
    audience: str | None = None,
    issuer: str | None = None,
    expires_in: int = 3600,
    key=None,
    kid: str = KID,
) -> str:
    now = int(time.time())
    claims = {
        "sub": sub,
        "aud": [audience or SETTINGS.auth0_audience, f"https://{SETTINGS.auth0_domain}/userinfo"],
        "iss": issuer or SETTINGS.auth0_issuer,
        "iat": now,
        "exp": now + expires_in,
    }
    if verified is not None:
        claims[f"{SETTINGS.auth0_claim_namespace}email_verified"] = verified
    claims[f"{SETTINGS.auth0_claim_namespace}email"] = f"{sub.split('|')[-1]}@example.com"
    return jwt.encode(claims, key or PRIVATE_KEY, algorithm="RS256", headers={"kid": kid})


def auth(sub: str = "auth0|student-1", **kw) -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(sub, **kw)}"}


ADMIN = {"X-Admin-Api-Key": "test-admin-key"}


# ---------------------------------------------------------------- app


@pytest.fixture
def model_holder() -> dict:
    """Tests put a fake model in holder["model"]."""
    return {"model": None}


@pytest.fixture
def client(db, model_holder) -> Iterator[TestClient]:
    verifier = TokenVerifier(SETTINGS)
    verifier.jwks_client.fetch_data = _jwks  # no network: serve the test public key

    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_token_verifier] = lambda: verifier
    app.dependency_overrides[get_model] = lambda: model_holder["model"]
    rec_limiter.reset()
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def review_body():
    def make(**overrides) -> dict:
        body = {
            "course_code": "SWEN-261",
            "goals": ["career_preparation"],
            "worth_score": 4,
            "skills": ["Agile", "Java"],
            "difficulty": 3,
            "weekly_hours": "7-9",
            "feedback": "Start the team project early.",
            "professor": "Dr. Rivera",
            "semester": "Fall 2025",
        }
        body.update(overrides)
        return body

    return make


@pytest.fixture
def post_review(client, review_body):
    """post_review("auth0|u1", worth_score=5, ...) → response JSON (asserts 201)."""

    def post(sub: str = "auth0|student-1", **overrides) -> dict:
        r = client.post("/reviews", json=review_body(**overrides), headers=auth(sub))
        assert r.status_code == 201, r.text
        return r.json()

    return post
