# AI-GENERATED (Cursor Agent) — Issue #2: Initialize FastAPI backend
# Owned by Backend Developer 1 (mamadub03). Liveness endpoint for local
# startup checks and later deployment health probes.

"""Health-check route."""

from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict[str, str]:
    """Return a simple OK payload so clients can verify the API is up."""
    settings = get_settings()
    return {
        "status": "ok",
        "service": settings.app_name,
        "environment": settings.app_env,
    }
