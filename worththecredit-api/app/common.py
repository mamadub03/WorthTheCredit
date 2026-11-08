"""Small helpers shared by BE2's modules."""

import re

_CODE_RE = re.compile(r"^([A-Z]{2,5})-?(\d{3}[A-Z]?)$")


def normalize_course_code(code: str) -> str:
    """'swen261', 'SWEN 261', 'swen-261' → 'SWEN-261'. Other shapes are just upper-cased."""
    cleaned = re.sub(r"\s+", "", code or "").upper()
    m = _CODE_RE.match(cleaned)
    return f"{m.group(1)}-{m.group(2)}" if m else cleaned


def clean_tags(tags: list[str], max_len: int = 40) -> list[str]:
    """Trim, collapse inner spaces, drop empties, and de-duplicate case-insensitively
    (keeps the first spelling: ["React", "react "] → ["React"])."""
    seen: set[str] = set()
    out: list[str] = []
    for raw in tags:
        tag = re.sub(r"\s+", " ", raw).strip()
        if not tag:
            continue
        if len(tag) > max_len:
            raise ValueError(f"Each tag must be at most {max_len} characters.")
        key = tag.lower()
        if key not in seen:
            seen.add(key)
            out.append(tag)
    return out
