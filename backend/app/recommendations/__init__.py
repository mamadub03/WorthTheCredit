# AI-GENERATED (Cursor Agent) — Issue #15: Implement AI course candidate retrieval
# Owned by Backend Developer 2 (as5161).
# File-level AI attribution for this module (not per-symbol).
# Sources used (team-authored, not generated in this file):
# - docs/DATABASE_SCHEMA.md section 7 (FastAPI retrieves candidates)

"""Candidate retrieval for recommendations. Gemini ranking is Issue #16."""

from app.recommendations.candidates import keywords_for_request, retrieve_candidates

__all__ = ["keywords_for_request", "retrieve_candidates"]
