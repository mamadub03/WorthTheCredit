# AI-GENERATED (Cursor Agent) — Issue #2: Initialize FastAPI backend
# Owned by Backend Developer 1 (mamadub03). Aggregates route modules so
# main.py stays thin as course/review/auth routers are added later.

"""Top-level API router composition."""

from fastapi import APIRouter

from app.api.routes import health

api_router = APIRouter()
api_router.include_router(health.router)
