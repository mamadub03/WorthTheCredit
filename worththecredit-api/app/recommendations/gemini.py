"""The model interface, the real Gemini client, and a fake for local dev/tests.

    class RecommendationModel(Protocol):
        def generate(self, system_instruction: str, prompt: str) -> str  # raw JSON text

Anything that implements `generate` can be plugged in: GeminiModel in
production, FakeGeminiModel when USE_FAKE_GEMINI=true, scripted fakes in tests.
"""

import json
import logging
import re
from functools import lru_cache
from typing import Protocol

from app.config import Settings, get_settings
from app.recommendations.schemas import GEMINI_RESPONSE_SCHEMA

log = logging.getLogger(__name__)


class ModelError(Exception):
    """The model call itself failed (network, timeout, quota, bad key)."""


class RecommendationModel(Protocol):
    def generate(self, system_instruction: str, prompt: str) -> str: ...


class GeminiModel:
    """Calls Gemini through the official google-genai SDK with structured JSON output."""

    def __init__(self, settings: Settings):
        from google import genai
        from google.genai import types

        self._types = types
        self._key = settings.gemini_api_key
        self.model = settings.gemini_model
        self.client = genai.Client(
            api_key=settings.gemini_api_key,
            http_options=types.HttpOptions(timeout=settings.gemini_timeout_seconds * 1000),  # milliseconds
        )

    def _safe(self, message: str) -> str:
        # Never let the API key reach logs or error messages.
        return message.replace(self._key, "***") if self._key else message

    def generate(self, system_instruction: str, prompt: str) -> str:
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=self._types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    response_json_schema=GEMINI_RESPONSE_SCHEMA,
                ),
            )
        except Exception as exc:  # SDK raises many types: network, timeout, 4xx/5xx
            raise ModelError(self._safe(f"{type(exc).__name__}: {exc}")) from None
        return response.text or ""


_CODE_IN_PROMPT = re.compile(r'"course_code": "([A-Z]{2,5}-\d{3}[A-Z]?)"')


class FakeGeminiModel:
    """Canned answers for local development (USE_FAKE_GEMINI=true): no API key, instant.

    Picks the first three candidate codes from the prompt so results always
    point at real courses in your database.
    """

    def generate(self, system_instruction: str, prompt: str) -> str:
        codes = list(dict.fromkeys(_CODE_IN_PROMPT.findall(prompt)))[:3]
        levels = ["Strong Match", "Moderate Match", "Limited Match"]
        recs = [
            {
                "course_code": code,
                "match_level": levels[i],
                "why": f"(Fake Gemini) {code} lines up with the interests in your profile.",
                "skills": ["Problem solving"],
                "student_insights": ["(Fake) Students mentioned the projects were useful."],
                "workload_summary": "See reported workload",
                "limitations": ["Fake recommendation for local development"],
            }
            for i, code in enumerate(codes)
        ]
        return json.dumps({"recommendations": recs})


@lru_cache
def _gemini(api_key: str, model: str) -> GeminiModel:
    return GeminiModel(get_settings())


def get_model() -> RecommendationModel | None:
    """FastAPI dependency. None means Gemini isn't configured (→ 503)."""
    s = get_settings()
    if s.use_fake_gemini:
        return FakeGeminiModel()
    if not s.gemini_api_key:
        return None
    return _gemini(s.gemini_api_key, s.gemini_model)
