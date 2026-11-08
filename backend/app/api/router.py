# AI-GENERATED (Cursor Agent) — Issues #2 / #6: API router composition
# Owned by Backend Developer 1 (mamadub03).
# File-level AI attribution for this module (not per-symbol).

"""Top-level API router composition."""

from fastapi import APIRouter

from app.api.routes import auth_routes, courses, health
from app.api.routes.reviews import router as review_router

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(courses.router)
api_router.include_router(auth_routes.router)
api_router.include_router(review_router)
