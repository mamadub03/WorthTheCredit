# AI-GENERATED (Cursor Agent) — Issues #2 / #6: API router composition
# Owned by Backend Developer 1 (mamadub03).
# File-level AI attribution for this module (not per-symbol).

"""Top-level API router composition."""

from fastapi import APIRouter

from app.api.routes import courses, health

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(courses.router)
