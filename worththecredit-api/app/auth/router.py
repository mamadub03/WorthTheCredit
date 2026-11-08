"""POST /auth/resend-verification (auth) — OPTIONAL extra, used by the FE2 "Resend email" button.

A browser app can't call Auth0's Management API (it needs a client secret), so
the backend does it with a Machine-to-Machine app that has `update:users`.
204 on success · 503 "not_configured" if the M2M env vars are empty · 429 within 60 s.
"""

import threading
import time
from functools import lru_cache

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response

from app.auth.dependencies import CurrentUser, get_current_user
from app.config import Settings, get_settings
from app.ratelimit import RateLimiter

router = APIRouter(prefix="/auth", tags=["auth"])
resend_limiter = RateLimiter(max_calls=1, per_seconds=60)


class Auth0Management:
    def __init__(self, domain: str, client_id: str, client_secret: str):
        self.domain, self.client_id, self.client_secret = domain, client_id, client_secret
        self._token: str | None = None
        self._expires = 0.0
        self._lock = threading.Lock()

    def _token_value(self) -> str:
        with self._lock:
            if self._token and time.monotonic() < self._expires - 60:
                return self._token
            r = httpx.post(
                f"https://{self.domain}/oauth/token",
                json={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "audience": f"https://{self.domain}/api/v2/",
                },
                timeout=10,
            )
            r.raise_for_status()
            data = r.json()
            self._token, self._expires = data["access_token"], time.monotonic() + int(data.get("expires_in", 3600))
            return self._token

    def send_verification_email(self, user_sub: str) -> None:
        r = httpx.post(
            f"https://{self.domain}/api/v2/jobs/verification-email",
            headers={"Authorization": f"Bearer {self._token_value()}"},
            json={"user_id": user_sub},
            timeout=10,
        )
        r.raise_for_status()


@lru_cache
def _mgmt(domain: str, cid: str, secret: str) -> Auth0Management:
    return Auth0Management(domain, cid, secret)


def get_management(settings: Settings = Depends(get_settings)) -> Auth0Management | None:
    if not (settings.auth0_domain and settings.auth0_m2m_client_id and settings.auth0_m2m_client_secret):
        return None
    return _mgmt(settings.auth0_domain, settings.auth0_m2m_client_id, settings.auth0_m2m_client_secret)


@router.post("/resend-verification", status_code=204)
def resend_verification(
    user: CurrentUser = Depends(get_current_user),
    mgmt: Auth0Management | None = Depends(get_management),
) -> Response:
    if user.email_verified:
        return Response(status_code=204)
    if mgmt is None:
        raise HTTPException(status_code=503, detail="not_configured")
    if not resend_limiter.allow(user.sub):
        raise HTTPException(status_code=429, detail="rate_limited")
    try:
        mgmt.send_verification_email(user.sub)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="auth0_error") from exc
    return Response(status_code=204)
