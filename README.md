# WorthTheCredit

Crowdsourced RIT course discovery with **Community Worth Scores** and **Gemini-ranked elective recommendations**.

**Live:** [https://worththecredit.courses/](https://worththecredit.courses/)

Students browse a course catalog, leave structured reviews (goals, worth score, difficulty, workload, skills), and get personalized matches. Gemini only ranks courses that already exist in our database — it does not invent classes or calculate Worth Scores.

**HACK.COMS 2026** prize tracks: SpaceXSI (Cursor), Gemini API, Tiger Data, Vultr.

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

Also add production HTTPS origins (see **Production deploy** below).

## What works end-to-end

| Feature | Auth? | Notes |
|---------|-------|--------|
| Home / search / course details | No | Live Tiger catalog |
| Review list + Worth Score | No | Seeded demo reviews available via `seed_db.py` |
| Sign in / out | Auth0 | Email verify UI is separate from backend skip flag |
| Submit review | Yes | One review per user per course |
| AI recommendations | Yes | Needs Gemini key; optional resume paste |

## Production deploy (Vercel + Vultr)

**Live site:** [https://worththecredit.courses/](https://worththecredit.courses/)

| Piece | Where | Role |
|-------|--------|------|
| Frontend | **Vercel** (`frontend/` root directory, Vite → `dist`) | Custom domain `worththecredit.courses` (+ `www`) via DNS (Porkbun) |
| API | **Vultr** Ubuntu + uvicorn on `:8000` | FastAPI + Tiger + Auth0 JWT + Gemini |
| HTTPS → API | Vercel rewrite | Browser calls same-origin `/backend/*`; `frontend/vercel.json` proxies to the Vultr host (avoids mixed-content HTTPS→HTTP) |

### Frontend (Vercel) env

```bash
VITE_API_BASE_URL=https://worththecredit.courses/backend
VITE_API_MOCKS=none
VITE_DEV_AUTH=false
VITE_AUTH0_DOMAIN=…          # same SPA tenant as local
VITE_AUTH0_CLIENT_ID=…
VITE_AUTH0_AUDIENCE=https://worththecredit.api
```

`VITE_*` are public. After changing them, **Redeploy** (Vite bakes env at build time).

`frontend/vercel.json` must keep:

- `/backend/:path*` → Vultr `http://<VULTR_IP>:8000/:path*`
- SPA fallback to `/index.html` for client routes

### Backend (Vultr) env essentials

| Variable | Production note |
|----------|-----------------|
| `DATABASE_URL` | Tiger URL with `postgresql+psycopg://…` and `sslmode=require` |
| `AUTH0_DOMAIN` / `AUTH0_API_AUDIENCE` | Same tenant/audience as the SPA |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Prefer `gemini-flash-latest` |
| `CORS_ORIGINS` | Include `https://worththecredit.courses`, `https://www.worththecredit.courses`, and any `*.vercel.app` preview you still use |
| `APP_ENV` | Prefer `production` so `AUTH_SKIP_EMAIL_VERIFICATION` cannot apply |
| Firewall | Allow TCP **22** and **8000** (or put nginx/HTTPS in front later) |

Run on the box (from `backend/`): `alembic upgrade head`, optional `python scripts/seed_db.py`, then uvicorn bound to `0.0.0.0:8000` (e.g. `nohup` or systemd so SSH disconnect does not kill it).

### Auth0 production URLs

| Setting | Include |
|---------|---------|
| Allowed Callback URLs | `https://worththecredit.courses/callback`, `https://www.worththecredit.courses/callback` |
| Allowed Logout URLs | `https://worththecredit.courses`, `https://www.worththecredit.courses` |
| Allowed Web Origins | `https://worththecredit.courses`, `https://www.worththecredit.courses` |

Keep localhost entries for local dev. Auth0 does **not** need the Vultr IP — only frontend origins.

### DNS (custom domain)

Point the apex (and `www`) at Vercel as shown in the project **Domains** UI (A/CNAME). Remove conflicting apex A records (e.g. old WordPress/parking IPs) so only Vercel’s record remains. Wait until Vercel marks the domain **Valid**.

### Smoke checks

- Site: https://worththecredit.courses/
- API via proxy: https://worththecredit.courses/backend/health → `{"status":"ok",…}`
- Direct API (ops): `http://<VULTR_IP>:8000/health`

### Still true for any redeploy

1. Secrets stay on Vultr — never put `DATABASE_URL` / Gemini / Auth0 secrets in Vercel.
2. Do not commit `.env` / `.env.local` — only `.env.example`.
3. Prefer verified Auth0 emails in real prod; `AUTH_SKIP_EMAIL_VERIFICATION` only works when `APP_ENV=development`.

## Docs

- [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) — tables and Worth Score rules  
- [`docs/local-integration.md`](docs/local-integration.md) — FE against real API / Docker Postgres notes  
- [`docs/frontend-coordination.md`](docs/frontend-coordination.md) — FE1 / FE2 ownership  
- [`docs/ai-contributions.md`](docs/ai-contributions.md) — AI assistance log (hackathon citation)  

## License / team

Built for HACK.COMS 2026 (MLH). See GitHub issues/PRs for contributor history.
