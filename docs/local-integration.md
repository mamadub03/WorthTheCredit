# Running the frontend against the real backend locally

This is how to run the React app against the FastAPI backend on your own
machine, with a throwaway Postgres in Docker instead of the team's Tiger Data
database. Nothing here touches Tiger Data or `main`.

## 1. Postgres in Docker

```bash
docker run -d --name wtc-postgres \
  -e POSTGRES_USER=wtc -e POSTGRES_PASSWORD=wtc_local_dev -e POSTGRES_DB=worththecredit \
  -p 5433:5432 postgres:16-alpine
```

Port 5433 avoids clashing with a Postgres you may already run on 5432.
`docker start wtc-postgres` brings it back after a restart, and
`docker rm -f wtc-postgres` throws it away.

## 2. Backend

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
# in backend/.env:
# DATABASE_URL=postgresql+psycopg://wtc:wtc_local_dev@localhost:5433/worththecredit
.venv/bin/alembic upgrade head
.venv/bin/python scripts/seed_db.py        # 50 demo courses, no reviews
.venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Run the backend tests with `.venv/bin/python -m pytest -q`. Plain `pytest -q`
can't import `app` from the venv's script path.

## 3. Frontend

```bash
cd frontend
npm install
VITE_API_MOCKS=none npm run dev
```

Or put `VITE_API_MOCKS=none` in `frontend/.env.local`. With `none`, every call
goes to `VITE_API_BASE_URL` (default `http://localhost:8000`) and the demo
banner only mentions dev sign-in. Vite is pinned to port 5173 because that's
the origin the backend's CORS list allows.

## What works without more setup

| Area | Real backend | Notes |
|---|---|---|
| Home, course search, college filter | Yes | `GET /courses`, `GET /courses/{id}` |
| Course page scores, reviews, workload | Yes | `GET /courses/{id}/reviews`, `GET /courses/{id}/worth-score` |
| Posting a review | Needs Auth0 | The backend answers 503 "Auth0 is not configured" until `AUTH0_DOMAIN` and `AUTH0_API_AUDIENCE` are set, and the frontend has the matching `VITE_AUTH0_*` values. FE2's dev sign-in tokens only work with the mock API. |
| AI matches | Needs Auth0 and Gemini | Also needs `GEMINI_API_KEY` in `backend/.env`. |

Don't mix the real course API with mocked reviews
(`VITE_API_MOCKS=reviews,recommendations`). The mock only knows its own course ids, so it answers
"Course not found" for real ones and the course page's review list shows an
error. The backend now serves reviews, so use `none` against the backend, or
`all` for a fully offline demo. Mocking only `recommendations` is fine.

The seed has no reviews, so every course starts with "No reviews yet" until
students post some.

## Real sign-in

The Auth0 tenant is set up, and its public values are on issue #26:

- `frontend/.env.local`: `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`. Dev sign-in turns off once these are set.
- `backend/.env`: `AUTH0_DOMAIN` and `AUTH0_API_AUDIENCE`, the same domain and audience.

Access tokens don't carry `email_verified` yet, because that needs an Auth0 post-login Action. Until it exists, posting a review or asking for AI matches returns 403. For local work, set `AUTH_SKIP_EMAIL_VERIFICATION=true` with `APP_ENV=development` in `backend/.env`. A valid Auth0 token is still required, and the switch is ignored in any other environment.

## "Sign-in expired" on every request (macOS)

If AI match or posting a review always says your sign-in expired, check the
backend for `CERTIFICATE_VERIFY_FAILED`. Python from python.org on macOS ships
without trusted certificates, so the backend can't fetch Auth0's signing keys
and treats every token as invalid. Either run
`/Applications/Python 3.12/Install Certificates.command`, or start the backend
with the certifi bundle:

```bash
SSL_CERT_FILE="$(.venv/bin/python -m certifi)" .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```
