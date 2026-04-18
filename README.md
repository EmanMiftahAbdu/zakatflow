# ZakatFlow

A modern platform for calculating and managing Zakat obligations.

## Monorepo Structure

```
zakatflow/
├── backend/          # Python FastAPI backend
│   ├── app/          # Application code
│   │   ├── api/      # Route handlers
│   │   ├── models/   # Database models
│   │   ├── schemas/  # Pydantic schemas
│   │   └── core/     # Config, auth, dependencies
│   └── tests/        # Backend tests
├── frontend/         # Next.js React frontend
│   ├── src/
│   │   ├── app/      # App router pages
│   │   ├── components/
│   │   └── lib/      # Utilities and API client
│   └── public/
└── .github/          # CI/CD and PR templates
```

## Quick Start

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

API docs at http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App at http://localhost:3000

## Team Workflow

1. Create a branch from `main`: `git checkout -b feat/your-feature`
2. Make changes, commit with conventional messages: `feat: add zakat calculator`
3. Push and open a PR against `main`
4. Get at least 1 approval before merging

### Branch Naming

| Prefix | Use |
|--------|-----|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `chore/` | Tooling, deps, config |
| `docs/` | Documentation |

## Tech Stack

- **Backend:** Python 3.11+, FastAPI, Pydantic v2
- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS v4
- **Database:** (TBD based on hackathon needs)
