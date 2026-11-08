# AI contributions

WorthTheCredit allows AI assistance when it is cited. This file is the running log of AI-produced work in this repository. Add an entry each time an AI tool writes or substantially edits project code or docs.

## 2026-11-07 — Initialize FastAPI backend (Issue #2)

- **Requested by:** Backend Developer 1 (`mamadub03`), on branch `mamadu-dev-issue2`.
- **Stack specified by the project rules:** Python, FastAPI, Pydantic.
- **Tool:** Cursor Agent (Composer).
- **Scope:** Issue #2 only — project layout, dependencies, env-based settings, CORS, `/health`, and OpenAPI docs. No database, Auth0, or Gemini wiring yet.

### Files the agent added or substantially edited

- `backend/requirements.txt`
- `backend/.env.example`
- `backend/README.md`
- `backend/app/__init__.py`
- `backend/app/main.py`
- `backend/app/core/__init__.py`
- `backend/app/core/config.py`
- `backend/app/api/__init__.py`
- `backend/app/api/router.py`
- `backend/app/api/routes/__init__.py`
- `backend/app/api/routes/health.py`
- `README.md`
- `docs/ai-contributions.md` (this file)

### In-code delineation

**File-level only:** Python modules get a single top-of-file `# AI-GENERATED (Cursor Agent) — Issue #N` header for the whole module. Do **not** tag individual functions/components.

### Suggested citation

FastAPI backend initialization (project layout, settings, CORS, and `/health`) was generated with Cursor Agent on 7 November 2026 for GitHub Issue #2. See `docs/ai-contributions.md`.

## 2026-11-07 — Configure Tiger Data PostgreSQL (Issue #3)

- **Requested by:** Backend Developer 1 (`mamadub03`), on branch `mamadu-dev-issue3` (bases on integration branch `backend`).
- **Tool:** Cursor Agent (Composer).
- **Scope:** `DATABASE_URL` settings, SQLAlchemy engine/session, empty `Base`, Alembic init. **No ORM models** (deferred to Issue #4 for Backend Dev 2 cross-check).

### Files the agent added or substantially edited

- `backend/requirements.txt`
- `backend/.env.example`
- `backend/README.md`
- `backend/app/core/config.py`
- `backend/app/db/__init__.py`
- `backend/app/db/base.py`
- `backend/app/db/session.py`
- `backend/alembic.ini`
- `backend/alembic/env.py`
- `backend/alembic/script.py.mako`
- `backend/alembic/versions/.gitkeep`
- `docs/ai-contributions.md` (this file)

### Suggested citation

Tiger Data / SQLAlchemy / Alembic wiring was generated with Cursor Agent on 7 November 2026 for GitHub Issue #3. See `docs/ai-contributions.md`.

## 2026-11-07 — Implement database models (Issue #4)

- **Requested by:** Backend Developer 1 (`mamadub03`), on branch `mamadu-dev-issue4` (bases on `backend`).
- **Tool:** Cursor Agent (Composer).
- **Scope:** Course, User, Review ORM models + initial Alembic migration from `docs/DATABASE_SCHEMA.md`.

### Files the agent added or substantially edited

- `backend/app/db/models.py`
- `backend/app/db/__init__.py`
- `backend/app/db/base.py`
- `backend/alembic/env.py`
- `backend/alembic/versions/d6f2fb02932e_create_courses_users_reviews.py`
- `docs/ai-contributions.md` (this file)

### Suggested citation

Course/User/Review SQLAlchemy models and initial migration were generated with Cursor Agent on 7 November 2026 for GitHub Issue #4 from `docs/DATABASE_SCHEMA.md`.

## 2026-11-07 — Generate and seed mock RIT data (Issue #5)

- **Requested by:** Backend Developer 1 (`mamadub03`), on branch `mamadu-dev-issue5`.
- **Tool:** Cursor Agent (Composer).
- **Scope:** Idempotent seed script + fictional course/user/review fixtures marked as DEMO / FICTIONAL.

### Files the agent added or substantially edited

- `backend/app/db/seed_data.py`
- `backend/scripts/seed_db.py`
- `backend/README.md`
- `docs/ai-contributions.md` (this file)
