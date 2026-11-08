# AI-GENERATED (Cursor Agent) — Issue #2: Initialize FastAPI backend
# Owned by Backend Developer 1 (mamadub03). Application entry point:
# creates the FastAPI app, configures CORS, and mounts API routes.
# Database, Auth0, and Gemini wiring belong in later issues.

"""FastAPI application factory and ASGI entrypoint."""

from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings

# Load .env into os.environ so modules that read os.environ directly
# (e.g. Gemini GEMINI_API_KEY) see the same values as Settings.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def create_app() -> FastAPI:
    """Build and configure the WorthTheCredit FastAPI application."""
    settings = get_settings()

    application = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description=(
            "WorthTheCredit REST API — crowdsourced RIT course discovery "
            "and AI-powered elective recommendations."
        ),
        debug=settings.debug,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(api_router)
    return application


# Uvicorn target: `uvicorn app.main:app --reload`
app = create_app()
