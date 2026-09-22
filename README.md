# 🧪 ChemCheck

### AI-Assisted Cosmetic & Food Ingredient Intelligence

ChemCheck helps users understand what's actually in the products they use — search a product, scan a label, or look up an ingredient, and get a transparent, explainable risk breakdown personalized to their own sensitivities and reaction history.

> **ChemCheck is an informational and decision-support tool, not a medical diagnostic device or a replacement for a healthcare professional.** It never labels a product "safe" or "unsafe" — only its internal, deterministic **Worst / Better / Best** risk category.

---

## 🚧 Build status

This repo is being built phase by phase, sequentially, with tests shipped alongside every phase rather than deferred. **Phases 0–2 are done and tested; everything from Phase 3 on is roadmap, not yet built.**

| Phase | What it delivers | Status |
|---|---|---|
| 0 | Project scaffolding — FastAPI + async SQLAlchemy + Alembic + Docker + test harness | ✅ Done |
| 1 | Auth (JWT), Products & Ingredients CRUD, pagination, admin gating | ✅ Done |
| 2 | Ingredient database seed (100 real ingredients), fuzzy search (`pg_trgm` + rapidfuzz), product↔ingredient linking with cascade/restrict rules | ✅ Done |
| 3 | Deterministic rule-based risk scoring engine | ⏳ Planned |
| 4 | Personalization from user sensitivities + reaction history | ⏳ Planned |
| 5 | OCR label scanning + barcode lookup | ⏳ Planned |
| 6 | Safer-alternative recommendations | ⏳ Planned |
| 7 | Reaction tracking + reviews + pattern detection | ⏳ Planned |
| 8 | Admin panel + regulatory alerts | ⏳ Planned |
| 9 | Deployment polish + optional LLM-powered plain-language explanations | ⏳ Planned |

No feature below is claimed unless it's actually implemented and tested — see [`docs/chemcheck-master-prompt-v2.md`](docs/chemcheck-master-prompt-v2.md) for the full phase-by-phase spec this is built against.

---

## ✨ What's working today

- 🔐 **JWT auth** — register, login, `/me`, bcrypt password hashing
- 🧴 **Products & Ingredients** — admin-gated CRUD, public paginated read/search
- 🔎 **Fuzzy ingredient search** — typo-tolerant matching (`pg_trgm` on Postgres, rapidfuzz fallback elsewhere), not just substring matching
- 🔗 **Product↔ingredient linking** — attach/detach ingredients on a product, with real cascade-on-delete / restrict-on-delete data integrity rules enforced
- 🌱 **Seed data** — 100 curated, real cosmetic and food ingredients (not placeholders) to search and link against
- ✅ **Consistent API contract** — every endpoint returns the same `{success, data, meta}` / `{success: false, error}` envelope, with proper HTTP status codes
- 🧪 **Test coverage** — happy-path + failure-path tests on every endpoint shipped so far

## 🔮 Planned

- 📊 Deterministic, explainable risk scoring (no black-box ML for the core safety score)
- 👤 Personalization from saved sensitivities and past reactions
- 📷 OCR label scanning (Tesseract + OpenCV) and barcode lookup
- 🔄 Safer-alternative recommendations
- ⭐ Reviews and reaction tracking with pattern detection
- 🚨 Admin-managed regulatory alerts
- 🤖 *Optional* LLM-generated plain-language ingredient explanations — clearly labeled as the one genuinely ML-powered piece, with the deterministic score never depending on it

---

## 🏗️ Architecture

A modular monolith — no microservices until there's a real scaling reason to justify the complexity.

```text
Next.js / React Frontend   (planned)
            │
            ▼
      FastAPI Backend
    (async, JWT-secured)
            │
     ┌──────┴──────┐
     ▼             ▼
 PostgreSQL     OCR / Barcode   (planned)
 (+ pg_trgm)    (Tesseract, pyzbar)
```

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI (async) |
| Database | PostgreSQL |
| ORM | SQLAlchemy (async) |
| Migrations | Alembic |
| Validation | Pydantic v2 |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Fuzzy matching | RapidFuzz + PostgreSQL `pg_trgm` |
| Testing | pytest + httpx (async, SQLite in-memory) |
| Containerization | Docker + docker-compose |
| OCR / Barcode *(planned)* | Tesseract, OpenCV, pyzbar |
| AI explanations *(planned, optional)* | LLM API |

### Why a deterministic scoring layer

The core risk score (Phase 3+) is a plain, testable Python function — not a model. That means every score is explainable, reproducible, and independently auditable, which matters a lot more here than squeezing out marginal accuracy from an opaque classifier. Any future LLM/ML usage (Phase 9) is additive — plain-language explanations layered on top of the deterministic score — and is never allowed to change the score itself.

---

## 📁 Project structure

```text
app/
├── main.py          → FastAPI app, CORS, logging middleware, exception handlers
├── core/            → config, JWT/bcrypt security, logging, shared errors, auth deps
├── models/          → SQLAlchemy models (User, Product, Ingredient, ProductIngredient)
├── schemas/         → Pydantic request/response schemas + envelope helpers
├── routers/         → thin HTTP handlers only — no business logic
├── services/        → business logic (auth, products, ingredients, scoring [planned], OCR [planned])
└── db/              → async engine/session setup, declarative base

alembic/             → versioned migrations
scripts/             → seed_ingredients.py — idempotent seed of 100 real ingredients
tests/
├── conftest.py      → test DB (in-memory SQLite) + async client fixtures
├── routers/         → integration tests — happy path + failure path per endpoint
└── services/        → pure unit tests
```

---

## 🚀 Getting started

### Prerequisites
- Python 3.12+
- Docker & Docker Compose *(recommended)*
- PostgreSQL, if running without Docker

### 1. Clone and configure

```bash
git clone https://github.com/Axhoo097/ChemCheck.git
cd ChemCheck
cp .env.example .env   # fill in real values — never commit .env
```

### 2. Run with Docker

```bash
docker-compose up --build
docker-compose exec app alembic upgrade head
docker-compose exec app python -m scripts.seed_ingredients
```

The API is now live at `http://localhost:8000` — interactive docs at `/docs` (Swagger) or `/redoc`.

### 3. Or run locally without Docker

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

### Creating an admin user

There's no public "become admin" endpoint by design — promote a user manually after they register:

```sql
UPDATE users SET is_admin = true WHERE email = 'your@email.com';
```

---

## 📖 API reference

Every route is under `/api/v1`. Every response uses the standard envelope:
`{"success": true, "data": ..., "meta": ...}` or `{"success": false, "error": {"code", "message", "details"}}`.

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | none | |
| POST | `/auth/register` | none | |
| POST | `/auth/login` | none | |
| GET / PUT | `/auth/me` | required | |
| GET | `/products` | none | paginated, `?category=&q=` |
| GET | `/products/{id}` | none | |
| POST / PUT / DELETE | `/products/{id}` | admin | |
| GET | `/products/{id}/ingredients` | none | paginated |
| POST | `/products/{id}/ingredients` | admin | body: `{"ingredient_id": "..."}` |
| DELETE | `/products/{id}/ingredients/{ingredient_id}` | admin | |
| GET | `/ingredients` | none | paginated, exact/substring `?q=` |
| GET | `/ingredients/search` | none | paginated, **fuzzy** `?q=` (typo-tolerant) |
| GET | `/ingredients/{id}` | none | |
| POST / PUT / DELETE | `/ingredients/{id}` | admin | delete blocked (409) if in use by a product |

---

## 🧪 Testing

```bash
pip install -r requirements.txt
pytest -v
```

Tests run against an in-memory SQLite database (see `tests/conftest.py`), so they're fast, isolated, and don't need Postgres running — production always uses PostgreSQL. Every shipped endpoint has at least one happy-path and one failure-path test; data-integrity rules (cascade delete, restrict delete) are tested end to end, not just at the model level.

---

## 🔐 Security

- JWT-based authentication, bcrypt password hashing
- Role-based admin authorization on every write endpoint
- Pydantic request validation on every input
- Config and secrets loaded only from environment variables (`.env`, gitignored) — nothing hardcoded
- No stack traces ever leaked to the client — logged server-side, generic 500 returned instead

---

## ⚠️ Limitations

ChemCheck's output is only as good as its ingredient database and the product data behind it. Real-world ingredient risk depends on concentration, exposure, formulation, and individual sensitivity — factors a general-purpose scoring system can't fully capture. Nothing here should be read as medical advice or a diagnosis.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes, with tests
4. `pytest -v` before opening a PR
5. Submit a pull request.

### 🧪 ChemCheck
**Understand the ingredients. Understand the risks. Make informed choices.**
