# WorthTheCredit backend

FastAPI REST API for WorthTheCredit (Issue #2 scaffold).

> **AI note:** This backend package was generated with **Cursor Agent** for
> GitHub Issue #2. See [`docs/ai-contributions.md`](../docs/ai-contributions.md).

## Requirements

- Python 3.11+ (developed/tested against the local Python 3.x toolchain)
- A virtual environment (recommended)

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

## Run locally

From the `backend/` directory (so `app` imports resolve):

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Health: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- Interactive docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

## Scope of Issue #2

Included now:

- Python project layout under `backend/app`
- Dependencies (`requirements.txt`)
- Settings via `.env` / `.env.example`
- CORS for the Vite frontend origins
- `/health` endpoint
- OpenAPI docs at `/docs`

Deferred to later issues:

- Tiger Data / SQLAlchemy / Alembic (Issue #3–#4)
- Mock data seeding (Issue #5)
- Course APIs (Issues #6–#7)
- Auth0 JWT validation (Issue #8)
