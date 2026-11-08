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

## Alembic

From `backend/` with `DATABASE_URL` set:

```bash
alembic revision --autogenerate -m "message"   # after models exist (Issue #4)
alembic upgrade head
```

Issue #3 ships the engine/session + Alembic wiring only. **No Course/User/Review
models yet** — that is Issue #4 and needs a Backend Dev 2 cross-check.
