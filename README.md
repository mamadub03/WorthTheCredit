# WorthTheCredit

AI-powered, crowdsourced RIT course discovery and recommendation platform.

## Backend

The API is a FastAPI project in `backend/`.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Health: http://127.0.0.1:8000/health
- Docs: http://127.0.0.1:8000/docs

## Docs

- Database schema: [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md)
- AI assistance log (hackathon citation): [`docs/ai-contributions.md`](docs/ai-contributions.md)
