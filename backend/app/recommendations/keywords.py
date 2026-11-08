# AI-GENERATED (Cursor Agent) — Issue #15: Implement AI course candidate retrieval
# Owned by Backend Developer 2 (as5161).
# File-level AI attribution for this module (not per-symbol).
# Sources used: docs/DATABASE_SCHEMA.md section 7 (student interests, skills,
# and goals are the retrieval input).

"""Turn a student profile into search words. No database access."""

from __future__ import annotations

import re

_TOKEN = re.compile(r"[a-z0-9]+")
_STOPWORDS = frozenset(
    {
        "a",
        "an",
        "the",
        "and",
        "or",
        "of",
        "to",
        "for",
        "in",
        "on",
        "with",
        "my",
        "at",
        "by",
        "from",
        "into",
        "about",
        "as",
        "is",
        "be",
    }
)
_MAX_KEYWORDS = 24


def keywords_from_profile(
    *,
    major: str | None,
    interests: list[str],
    skills: list[str],
    career_goals: str | None,
    academic_goals: str | None,
    resume_text: str | None = None,
) -> list[str]:
    """Keep distinctive words from the profile fields, in first-seen order."""

    chunks: list[str] = []
    for value in (major, career_goals, academic_goals):
        if value:
            chunks.append(value)
    chunks.extend(interests)
    chunks.extend(skills)
    # Resume last so explicit form fields keep keyword priority.
    if resume_text:
        chunks.append(resume_text)

    found: list[str] = []
    for chunk in chunks:
        for token in _TOKEN.findall(chunk.lower()):
            if len(token) < 2 or token in _STOPWORDS or token in found:
                continue
            found.append(token)
            if len(found) == _MAX_KEYWORDS:
                return found
    return found


def like_pattern(keyword: str) -> str:
    """Bind this word as a literal substring, not a SQL wildcard."""

    escaped = (
        keyword.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    )
    return f"%{escaped}%"
