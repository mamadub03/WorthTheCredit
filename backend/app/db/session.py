# AI-GENERATED (Cursor Agent) — Issue #3: Configure Tiger Data PostgreSQL
# Owned by Backend Developer 1 (mamadub03).
# File-level AI attribution for this module (not per-symbol).

"""Engine and session helpers for PostgreSQL (Tiger Data)."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def get_engine() -> Engine:
    """Return a process-wide Engine, creating it on first use."""
    global _engine, _SessionLocal
    if _engine is None:
        settings = get_settings()
        if not settings.database_url:
            raise RuntimeError(
                "DATABASE_URL is not set. Copy backend/.env.example to "
                "backend/.env and set your Tiger Data PostgreSQL URL."
            )
        _engine = create_engine(
            settings.database_url,
            pool_pre_ping=True,
        )
        _SessionLocal = sessionmaker(
            bind=_engine,
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
        )
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    """Return the session factory, ensuring the engine exists."""
    get_engine()
    assert _SessionLocal is not None
    return _SessionLocal


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a DB session and closes it afterward."""
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()
