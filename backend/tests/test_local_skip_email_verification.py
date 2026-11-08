# AI-GENERATED (Claude Code, Claude Opus 5.5): local testing switch on the integration branch.
"""AUTH_SKIP_EMAIL_VERIFICATION only relaxes the email check in development."""

from __future__ import annotations

import uuid

import pytest
from fastapi import HTTPException

from app.api import deps
from app.api.deps import AuthenticatedUser, require_verified_email
from app.core.auth import Auth0Claims
from app.core.config import Settings
from app.db.models import User


def _unverified() -> AuthenticatedUser:
    user = User(id=uuid.uuid4(), auth0_sub="auth0|student")
    return AuthenticatedUser(user=user, claims=Auth0Claims(sub="auth0|student", email_verified=False, raw={}))


def _settings(**values: str) -> Settings:
    return Settings(_env_file=None, **values)


def test_unverified_is_rejected_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(deps, "get_settings", lambda: _settings(APP_ENV="development"))
    with pytest.raises(HTTPException) as exc:
        require_verified_email(_unverified())
    assert exc.value.status_code == 403


def test_switch_allows_unverified_in_development(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        deps,
        "get_settings",
        lambda: _settings(APP_ENV="development", AUTH_SKIP_EMAIL_VERIFICATION="true"),
    )
    auth = _unverified()
    assert require_verified_email(auth) is auth


def test_switch_is_ignored_outside_development(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        deps,
        "get_settings",
        lambda: _settings(APP_ENV="production", AUTH_SKIP_EMAIL_VERIFICATION="true"),
    )
    with pytest.raises(HTTPException) as exc:
        require_verified_email(_unverified())
    assert exc.value.status_code == 403
