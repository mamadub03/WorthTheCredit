"""Auth0 JWT validation, verified-email rule, user upsert, public vs protected, admin key."""

import jwt
from sqlalchemy import func, select

from app.be1_stubs.models import User
from tests.conftest import ADMIN, OTHER_KEY, SETTINGS, auth, make_token


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_missing_token_is_401(client):
    r = client.get("/profile")
    assert r.status_code == 401
    assert r.json() == {"detail": "not_authenticated"}
    assert r.headers["www-authenticate"] == "Bearer"


def test_valid_token_passes(client):
    assert client.get("/profile", headers=auth()).status_code == 404  # past auth; just no profile yet


def test_wrong_audience_is_401(client):
    r = client.get("/profile", headers=auth(audience="https://some-other-api"))
    assert r.status_code == 401 and r.json() == {"detail": "invalid_token"}


def test_wrong_issuer_is_401(client):
    assert client.get("/profile", headers=auth(issuer="https://evil.auth0.com/")).status_code == 401


def test_expired_token_is_401(client):
    assert client.get("/profile", headers=auth(expires_in=-120)).status_code == 401


def test_bad_signature_and_unknown_kid_are_401(client):
    assert client.get("/profile", headers=bearer(make_token(key=OTHER_KEY))).status_code == 401
    assert client.get("/profile", headers=bearer(make_token(kid="unknown"))).status_code == 401
    assert client.get("/profile", headers=bearer("not-a-jwt")).status_code == 401


def test_hs256_forgery_is_401(client):
    forged = jwt.encode(
        {"sub": "auth0|x", "aud": SETTINGS.auth0_audience, "iss": SETTINGS.auth0_issuer, "iat": 1, "exp": 9999999999},
        "an-attacker-chosen-secret-that-is-long-enough",
        algorithm="HS256",
        headers={"kid": "test-key-1"},
    )
    assert client.get("/profile", headers=bearer(forged)).status_code == 401


def test_unverified_email_gets_403_on_post_reviews(client, review_body):
    r = client.post("/reviews", json=review_body(), headers=auth(verified=False))
    assert r.status_code == 403 and r.json() == {"detail": "email_not_verified"}


def test_missing_email_verified_claim_gets_403(client, review_body):
    r = client.post("/reviews", json=review_body(), headers=auth(verified=None))
    assert r.status_code == 403 and r.json() == {"detail": "email_not_verified"}


def test_unverified_users_can_still_use_other_protected_endpoints(client):
    # Verification is only required for submitting reviews.
    assert client.get("/profile", headers=auth(verified=False)).status_code == 404


def test_user_row_is_upserted_once(client, db):
    for _ in range(3):
        client.get("/profile", headers=auth("auth0|new-person"))
    assert db.scalar(select(func.count()).select_from(User).where(User.auth0_sub == "auth0|new-person")) == 1
    assert db.scalar(select(User.email).where(User.auth0_sub == "auth0|new-person")) == "new-person@example.com"


def test_public_endpoints_need_no_token(client):
    assert client.get("/courses/SWEN-261/reviews").status_code == 200
    assert client.get("/courses/SWEN-261/stats").status_code == 200
    assert client.get("/courses?q=swen").status_code == 200


def test_protected_endpoints_reject_anonymous(client, review_body):
    assert client.post("/reviews", json=review_body()).status_code == 401
    assert client.get("/reviews/me", params={"course_code": "SWEN-261"}).status_code == 401
    assert client.put("/profile", json={"major": "SE"}).status_code == 401
    assert client.post("/recommendations", json={}).status_code == 401


def test_admin_key(client, post_review):
    rid = post_review()["id"]
    assert client.post(f"/admin/reviews/{rid}/hide").status_code == 403
    assert client.post(f"/admin/reviews/{rid}/hide", headers={"X-Admin-Api-Key": "wrong"}).status_code == 403
    r = client.post(f"/admin/reviews/{rid}/hide", headers=ADMIN)
    assert r.status_code == 200 and r.json()["is_hidden"] is True
    assert client.post(f"/admin/reviews/{rid}/unhide", headers=ADMIN).json()["is_hidden"] is False


def test_dependency_override_example(client):
    """How to skip JWTs entirely in a test: override get_token_claims."""
    from app.auth.dependencies import get_token_claims
    from app.auth.tokens import TokenClaims
    from app.main import app

    app.dependency_overrides[get_token_claims] = lambda: TokenClaims("auth0|override", None, True)
    assert client.get("/profile", headers=bearer("anything")).status_code == 404


def test_resend_verification(client):
    from app.auth.router import get_management, resend_limiter
    from app.main import app

    resend_limiter.reset()
    assert client.post("/auth/resend-verification", headers=auth(verified=False)).json() == {"detail": "not_configured"}
    sent: list[str] = []

    class FakeMgmt:
        def send_verification_email(self, sub: str) -> None:
            sent.append(sub)

    app.dependency_overrides[get_management] = lambda: FakeMgmt()
    assert client.post("/auth/resend-verification", headers=auth("auth0|nv", verified=False)).status_code == 204
    assert client.post("/auth/resend-verification", headers=auth("auth0|nv", verified=False)).status_code == 429
    assert client.post("/auth/resend-verification", headers=auth("auth0|ok")).status_code == 204  # already verified
    assert sent == ["auth0|nv"]
