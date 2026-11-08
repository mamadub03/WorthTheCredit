"""Step 1–2: build keywords and retrieve candidate courses from Postgres.

Order of attempts (spec: "FastAPI retrieves candidates by keyword matching"):
  a) Postgres full-text search over title (weight A), reviewed skill tags (B),
     department (C) and description (D), ranked with ts_rank_cd.
  b) If fewer than MIN_CANDIDATES matched: ILIKE substring matching, which
     catches things stemming misses ("c#", "ux", partial words).
  c) Still too few: fill with the best-reviewed courses in the student's
     major's department.
Only these candidates are shown to Gemini, and only these may be returned.
"""

import re
from dataclasses import dataclass

from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import Session

from app.be1_stubs.models import Course
from app.profile.schemas import ProfileIn
from app.reviews.models import Review

STOPWORDS = frozenset(
    "a an and are as at be but by can do for from get has have i im in into is it its like me more my not of on "
    "or so some something that the their them then there these this to too very want wants was we what when which "
    "who will with would you your course courses class classes take taking learn learning about also really isnt "
    "dont heavy much good great interested interest stuff thing things need just looking any less lot make".split()
)

# Abbreviations students type → words course catalogs use.
SYNONYMS: dict[str, list[str]] = {
    "ml": ["machine learning"],
    "ai": ["artificial intelligence", "machine learning"],
    "ux": ["user experience", "usability"],
    "ui": ["user interface"],
    "cs": ["computer science"],
    "swe": ["software engineering"],
    "cyber": ["security"],
    "cybersecurity": ["security"],
    "gamedev": ["game"],
    "stats": ["statistics", "probability"],
}


@dataclass(frozen=True)
class TermGroup:
    words: list[str]  # single words, [a-z0-9] only
    phrases: list[list[str]]  # multi-word tags, e.g. [["machine", "learning"]]

    @property
    def empty(self) -> bool:
        return not (self.words or self.phrases)


@dataclass(frozen=True)
class Keywords:
    # primary: the request, interests and career goals (what the student WANTS) — ranked ×2
    primary: TermGroup
    # secondary: major, existing skills, degree requirements (context) — ranked ×1
    secondary: TermGroup
    raw_terms: list[str]  # for ILIKE: original tokens incl. "c#", "c++"

    @property
    def empty(self) -> bool:
        return self.primary.empty and self.secondary.empty


def _tokens(text_: str) -> list[str]:
    return re.findall(r"[a-z0-9][a-z0-9#+]*", text_.lower())


def _uniq(xs):
    return list(dict.fromkeys(xs))


class _Collector:
    def __init__(self) -> None:
        self.words: list[str] = []
        self.phrases: list[tuple[str, ...]] = []
        self.raw: list[str] = []

    def add_tag(self, tag: str) -> None:
        parts = [p for p in (re.sub(r"[^a-z0-9]", "", t) for t in _tokens(tag)) if p]
        if len(parts) > 1:
            self.phrases.append(tuple(parts))
        self.add_text(tag)

    def add_text(self, t: str) -> None:
        for tok in _tokens(t):
            self.raw.append(tok)
            for expansion in SYNONYMS.get(tok, []):
                parts = expansion.split()
                if len(parts) > 1:
                    self.phrases.append(tuple(parts))
                else:
                    self.words.append(parts[0])
            plain = re.sub(r"[^a-z0-9]", "", tok)
            if plain and plain not in STOPWORDS and (len(plain) > 2 or plain in SYNONYMS):
                self.words.append(plain)

    def group(self) -> TermGroup:
        return TermGroup(words=_uniq(self.words), phrases=[list(p) for p in _uniq(self.phrases)])


def build_keywords(profile: ProfileIn, query: str | None) -> Keywords:
    primary, secondary = _Collector(), _Collector()
    for tag in [*profile.interests, *profile.personal_interests]:
        primary.add_tag(tag)
    primary.add_text(profile.career_goals)
    primary.add_text(query or "")
    for tag in [*profile.skills, profile.major]:
        secondary.add_tag(tag)
    secondary.add_text(profile.degree_requirements)
    # ILIKE is a substring match, so skip very short terms ("ml" would match "HTML");
    # keep short ones with symbols like "c#" / "c++" that full-text search can't see.
    raw = _uniq(t for t in primary.raw + secondary.raw if t not in STOPWORDS and (len(t) >= 3 or re.search(r"[#+]", t)))
    return Keywords(primary=primary.group(), secondary=secondary.group(), raw_terms=raw)


def to_tsquery(group: TermGroup) -> str:
    """OR of words and phrases: "data | (machine <-> learning)". Safe: tokens are [a-z0-9] only.
    An empty group becomes a query that matches nothing."""
    parts = list(group.words) + [f"({' <-> '.join(p)})" for p in group.phrases]
    return " | ".join(parts) if parts else "zzznomatchzzz"


_DOC = """
    setweight(to_tsvector('english', coalesce(c.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(st.skills, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(c.department, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(c.description, '')), 'D')
"""

SQL_FTS = text(f"""
    WITH skill_text AS (
        SELECT r.course_id, string_agg(s.skill, ' ') AS skills
        FROM reviews r CROSS JOIN LATERAL unnest(r.skills) AS s(skill)
        WHERE r.is_hidden = false
        GROUP BY r.course_id
    )
    SELECT c.id, 2 * ts_rank_cd({_DOC}, q1) + ts_rank_cd({_DOC}, q2) AS rank
    FROM courses c
    LEFT JOIN skill_text st ON st.course_id = c.id
    CROSS JOIN to_tsquery('english', :primary) AS q1
    CROSS JOIN to_tsquery('english', :secondary) AS q2
    WHERE ({_DOC}) @@ (q1 || q2)
    ORDER BY rank DESC, c.code
    LIMIT :lim
""")


def _escape_like(s: str) -> str:
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _review_count_subq():
    return (
        select(func.count(Review.id))
        .where(Review.course_id == Course.id, Review.is_hidden.is_(False))
        .correlate(Course)
        .scalar_subquery()
    )


def retrieve_candidates(
    db: Session, profile: ProfileIn, query: str | None, limit: int = 25, min_candidates: int = 8
) -> list[tuple[Course, str]]:
    """Returns [(course, how_it_was_found)], best first. how ∈ {"fts", "ilike", "department"}."""
    kw = build_keywords(profile, query)
    found: list[int] = []
    source: dict[int, str] = {}

    def take(ids: list[int], how: str) -> None:
        for cid in ids:
            if cid not in source and len(found) < limit:
                found.append(cid)
                source[cid] = how

    if not kw.empty:
        params = {"primary": to_tsquery(kw.primary), "secondary": to_tsquery(kw.secondary), "lim": limit}
        take([row.id for row in db.execute(SQL_FTS, params)], "fts")

    if len(found) < min_candidates and kw.raw_terms:
        conds = []
        for term in kw.raw_terms[:20]:
            pat = f"%{_escape_like(term)}%"
            conds += [Course.title.ilike(pat), Course.description.ilike(pat), Course.department.ilike(pat)]
        stmt = (
            select(Course.id)
            .where(or_(*conds), Course.id.not_in(found or [-1]))
            .order_by(_review_count_subq().desc(), Course.code)
            .limit(limit)
        )
        take(list(db.scalars(stmt)), "ilike")

    if len(found) < min_candidates and profile.major.strip():
        major = profile.major.strip()
        dept_conds = [Course.department.ilike(f"%{_escape_like(major)}%")]
        dept_conds += [Course.department.ilike(f"%{_escape_like(w)}%") for w in major.split() if len(w) > 3]
        stmt = (
            select(Course.id)
            .where(or_(*dept_conds), Course.id.not_in(found or [-1]))
            .order_by(_review_count_subq().desc(), Course.code)
            .limit(min_candidates - len(found))
        )
        take(list(db.scalars(stmt)), "department")

    if not found:
        return []
    by_id = {c.id: c for c in db.scalars(select(Course).where(Course.id.in_(found)))}
    return [(by_id[cid], source[cid]) for cid in found]
