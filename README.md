# WorthTheCredit

Crowdsourced RIT course discovery with **Community Worth Scores** and **Gemini-ranked elective recommendations**.

Students browse a course catalog, leave structured reviews (goals, worth score, difficulty, workload, skills), and get personalized matches. Gemini only ranks courses that already exist in our database — it does not invent classes or calculate Worth Scores.

**HACK.COMS 2026** prize tracks we built for: SpaceXSI (Cursor), Gemini API, Tiger Data; Vultr deploy next.

## What’s in the repo

| Path | Stack |
|------|--------|
| `frontend/` | React, Vite, TypeScript, Auth0 SPA |
| `backend/` | FastAPI, SQLAlchemy, Alembic, Gemini |
| `docs/` | Schema, AI contribution log, local integration notes |

**Data store:** Tiger Data (PostgreSQL)  
**Auth:** Auth0 (SPA login + backend JWT validation)  
**AI:** Google Gemini (`GEMINI_MODEL`, default `gemini-flash-latest`)

## Architecture (short)

```text
Browser (React)
  ├─ public browse  →  GET /courses, GET /courses/{id}, reviews list
  └─ Auth0 login    →  Bearer token on POST reviews / POST /recommendations
                              ↓
                         FastAPI
                              ├─ Tiger Data (courses, users, reviews, aggregates)
                              └─ Gemini (rank + explain retrieved candidates only)
```

Optional **resume text** can be pasted on the AI match form. It is sent with that request only and is **not** stored in our database.

## Prerequisites

- Python **3.11+**
- Node.js **22+** (frontend)
- Tiger Data (or any Postgres) connection string
- Auth0 tenant: **SPA** app + **API** (audience)
- Gemini API key

## 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

### Fill `backend/.env`

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Tiger/Postgres URL with `postgresql+psycopg://…` prefix; keep `?sslmode=require` for Tiger |
| `AUTH0_DOMAIN` | e.g. `your-tenant.us.auth0.com` (no `https://`) |
| `AUTH0_API_AUDIENCE` | Auth0 API identifier, e.g. `https://worththecredit.api` |
| `GEMINI_API_KEY` | From [Google AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | Recommended: `gemini-flash-latest` |
| `CORS_ORIGINS` | Must include the frontend origin(s), e.g. `http://localhost:5173,http://127.0.0.1:5173` |
| `AUTH_SKIP_EMAIL_VERIFICATION` | `true` **only** for local `APP_ENV=development` testing; **never** in production |

Migrate + seed (courses + demo reviews for Worth Scores / recommender demos):

```bash
alembic upgrade head
python scripts/seed_db.py
```

Run the API:

```bash
# macOS tip: if Auth0 JWKS fetch fails with CERTIFICATE_VERIFY_FAILED:
#   SSL_CERT_FILE="$(python -m certifi)" uvicorn ...
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- Health: http://127.0.0.1:8000/health  
- OpenAPI: http://127.0.0.1:8000/docs  

```bash
PYTHONPATH=. pytest -q
```

## 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
```

### Fill `frontend/.env.local` (for real backend)

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_API_MOCKS=none

VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your_spa_client_id
VITE_AUTH0_AUDIENCE=https://worththecredit.api

VITE_DEV_AUTH=false
```

`VITE_*` values are public (bundled into the browser). **Never** put Gemini keys, `DATABASE_URL`, or Auth0 Client Secret in the frontend.

```bash
npm run dev
```

App: http://localhost:5173

### Auth0 SPA URLs (required)

In Auth0 → Application → **URLs**:

| Setting | Values |
|---------|--------|
| Allowed Callback URLs | `http://localhost:5173/callback`, `http://127.0.0.1:5173/callback` |
| Allowed Logout URLs | `http://localhost:5173`, `http://127.0.0.1:5173` |
| Allowed Web Origins | `http://localhost:5173`, `http://127.0.0.1:5173` |

Production will need your Vercel (or other) HTTPS origins added the same way.

## What works end-to-end

| Feature | Auth? | Notes |
|---------|-------|--------|
| Home / search / course details | No | Live Tiger catalog |
| Review list + Worth Score | No | Seeded demo reviews available via `seed_db.py` |
| Sign in / out | Auth0 | Email verify UI is separate from backend skip flag |
| Submit review | Yes | One review per user per course |
| AI recommendations | Yes | Needs Gemini key; optional resume paste |

## Know before deployment (Vercel + Vultr)

1. **Secrets stay on the API host.** Vultr (or similar) runs FastAPI with `DATABASE_URL`, `AUTH0_*`, `GEMINI_*`. Vercel only gets `VITE_*` public Auth0 + API base URL.
2. **CORS:** set `CORS_ORIGINS` to the exact Vercel URL(s) (scheme + host, no trailing slash mismatch).
3. **Auth0:** add production callback `/callback`, logout, and web origins for the Vercel domain.
4. **`APP_ENV`:** use something other than `development` in prod so `AUTH_SKIP_EMAIL_VERIFICATION` cannot apply.
5. **Gemini model:** prefer `gemini-flash-latest`; older `gemini-2.5-flash` is blocked for many new keys.
6. **Tiger:** keep `sslmode=require`; run `alembic upgrade head` and `python scripts/seed_db.py` against the prod DB once (or seed only what you want for demo).
7. **Frontend mocks:** production build should use `VITE_API_MOCKS=none` and a real `VITE_API_BASE_URL` pointing at the Vultr API.
8. **Do not commit** `.env` / `.env.local` — only `.env.example` files.

## Docs

- [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) — tables and Worth Score rules  
- [`docs/local-integration.md`](docs/local-integration.md) — FE against real API / Docker Postgres notes  
- [`docs/frontend-coordination.md`](docs/frontend-coordination.md) — FE1 / FE2 ownership  
- [`docs/ai-contributions.md`](docs/ai-contributions.md) — AI assistance log (hackathon citation)  

## License / team

Built for HACK.COMS 2026 (MLH). See GitHub issues/PRs for contributor history.
