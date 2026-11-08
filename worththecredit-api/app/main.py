"""FastAPI application.

BE1 owns the real app setup. To merge, BE1 adds BE2's routers:

    from app.reviews.router import router as reviews_router
    from app.scores.router import router as stats_router
    from app.profile.router import router as profile_router
    from app.recommendations.router import router as recommendations_router
    for r in (reviews_router, stats_router, profile_router, recommendations_router):
        app.include_router(r)
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.be1_stubs.courses import router as courses_router
from app.config import get_settings
from app.profile.router import router as profile_router
from app.recommendations.router import router as recommendations_router
from app.reviews.router import router as reviews_router
from app.scores.router import router as stats_router

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("worththecredit")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    s = get_settings()
    if s.dev_auth_bypass:
        if s.is_production:
            raise RuntimeError("DEV_AUTH_BYPASS=true is not allowed when ENVIRONMENT=production")
        log.warning("DEV_AUTH_BYPASS is ON — any bearer token is accepted. Local development only!")
    if s.use_fake_gemini:
        log.warning("USE_FAKE_GEMINI is ON — /recommendations returns canned results.")
    elif not s.gemini_api_key:
        log.warning("GEMINI_API_KEY is not set — /recommendations will return 503.")
    yield


def create_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(title="WorthTheCredit API", version="0.2.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=s.cors_origin_list,
        allow_credentials=False,  # Bearer tokens, not cookies
        allow_methods=["GET", "POST", "PUT", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Admin-Api-Key"],
    )

    @app.get("/health", tags=["meta"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(courses_router)  # BE1 stub
    app.include_router(reviews_router)
    app.include_router(stats_router)
    app.include_router(profile_router)
    app.include_router(recommendations_router)
    app.include_router(auth_router)  # optional: resend verification email
    return app


app = create_app()
