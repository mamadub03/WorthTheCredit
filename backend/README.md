# WorthTheCredit backend

FastAPI REST API for WorthTheCredit.

> **AI note:** Backend files use a **file-level** `# AI-GENERATED (Cursor Agent)`
> header (whole module), not per-function tags. See
> [`docs/ai-contributions.md`](../docs/ai-contributions.md).

## Git workflow (Backend Developer 1)

- Long-lived integration branch: **`backend`** (not `main`).
- One feature branch per issue (e.g. `mamadu-dev-issue3`) branched from `backend`.
- Open PRs **into `backend`**. Merge `backend` → `main` only after backend work is tested.
- Stop and coordinate when a change is a shared contract with Backend Developer 2
  (models, review schema, Worth Score aggregates, API shapes).

## Requirements

- Python 3.11+
- Tiger Data PostgreSQL URL in `.env` as `DATABASE_URL` (for DB/Alembic)

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# set DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/DBNAME
```

## Run API

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Health: http://127.0.0.1:8000/health
- Docs: http://127.0.0.1:8000/docs
- Course search: `GET /courses?q=web&department=ISTE&limit=20`
- Course details: `GET /courses/{course_id}` (includes Worth Score aggregates when reviews exist)
- Auth smoke tests (Bearer token from Frontend 2 Auth0 SPA):
  - `GET /auth/me`
  - `GET /auth/verified-check` (requires `email_verified` claim)

## Auth0 (Issue #8)

Set in `.env` (with Frontend 2):

```bash
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_API_AUDIENCE=https://worththecredit.api
```

Backend validates RS256 access tokens via Auth0 JWKS. Protected dependencies:

- `get_current_user` — valid JWT; provisions `users` row by `auth0_sub`
- `require_verified_email` — same + `email_verified` claim (use on review submit)

Course browse stays public. Backend 2 should `Depends(require_verified_email)` on review writes.

## Alembic

From `backend/` with `DATABASE_URL` set:

```bash
alembic revision --autogenerate -m "message"   # after models exist (Issue #4)
alembic upgrade head
```

Issue #4 adds Course/User/Review models from `docs/DATABASE_SCHEMA.md` and the
initial Alembic revision `d6f2fb02932e_create_courses_users_reviews`.

With `DATABASE_URL` set:

```bash
alembic upgrade head
python scripts/seed_db.py
```

The seed script is **idempotent** (re-run safe) and loads **courses only**
from `app/db/seed_data.py`. Users/reviews are not seeded — Worth Scores come
later from the review submission flow (then Gemini uses those aggregates).
