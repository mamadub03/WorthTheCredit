# AI-GENERATED (Cursor Agent) — Issue #11: Implement review validation and policies
# Owned by Backend Developer 2 (as5161).
# File-level AI attribution for this module (not per-symbol).
# Sources used (team-authored, not generated in this file):
# - docs/DATABASE_SCHEMA.md sections 3 and 5 (review columns and constraints)
# - .cursor/rules/project.mdc section 2 (one review per student, no edits)

"""Review policies owned by Backend Developer 2."""

from app.reviews.policy import ReviewPolicyError, prepare_review

__all__ = ["ReviewPolicyError", "prepare_review"]
