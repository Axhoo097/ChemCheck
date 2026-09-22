# ChemCheck — Master Development Prompt (v2)

> Paste **Part A** into any new session as standing context. Paste the relevant **Phase prompt from Part B** on top of it when starting that specific phase's work.

---

# PART A — Global Rules (apply to every phase)

## 1. Product Goal

ChemCheck lets users search consumer products, view ingredients, understand what each ingredient does, get a deterministic personalized risk score, scan labels via OCR, get safer alternatives, track reactions, leave reviews. Admins manage products/ingredients/alerts.

ChemCheck is **informational only**. Never say "safe", "unsafe", "cures", "prevents", "guaranteed". Always use: **"ChemCheck Risk Category: Worst / Better / Best"** — an internal score, not a medical claim.

## 2. Technology Stack

- **Backend:** Python, FastAPI (async), SQLAlchemy (async ORM), Alembic, Pydantic v2, pydantic-settings
- **Auth:** JWT (python-jose), bcrypt (passlib)
- **DB:** PostgreSQL
- **Processing:** OpenCV, pytesseract, pyzbar, rapidfuzz / pg_trgm
- **Frontend:** Next.js, React, Tailwind CSS
- **Optional later:** scikit-learn, LLM API
- **Infra:** Docker, docker-compose
- **Testing:** pytest, httpx (AsyncClient), pytest-asyncio

## 3. Architecture Rules

Modular monolith. No microservices until there's a real scaling reason.

```
app/
├── main.py
├── core/          → config, security, logging setup
├── models/        → SQLAlchemy models
├── schemas/       → Pydantic request/response schemas
├── routers/       → thin route handlers only
├── services/       → business logic (scoring, recommendations, OCR)
├── db/            → session, base, migrations
└── utils/
tests/
├── conftest.py    → fixtures (test DB, test client)
├── routers/
└── services/
```

Rules:
- Business logic lives in `services/`, never in route handlers.
- Route handlers: parse request → call service → return response. Nothing else.
- All DB queries go through service or repository functions, not raw in routers.

## 4. API Contract Standards *(new)*

- All routes prefixed `/api/v1/...`
- **Success envelope:**
```json
{ "success": true, "data": { }, "meta": { } }
```
- **Error envelope:**
```json
{ "success": false, "error": { "code": "STRING_CODE", "message": "human readable", "details": {} } }
```
- **List endpoints** must accept `?page=1&page_size=20` and return:
```json
{ "success": true, "data": [...], "meta": { "page": 1, "page_size": 20, "total_count": 134 } }
```
- Use proper HTTP status codes (400 validation, 401 unauthenticated, 403 unauthorized, 404 not found, 409 conflict, 422 pydantic validation, 500 unhandled).

## 5. Testing Strategy *(new)*

- Every vertical slice ships with tests in the same PR/phase — not deferred.
- **Unit tests** (`tests/services/`): pure logic, e.g. `calculate_safety_score()` with mock data — no DB.
- **Integration tests** (`tests/routers/`): use `httpx.AsyncClient` against a test DB (separate test database or per-test transaction rollback via a `conftest.py` fixture).
- Minimum bar per endpoint: 1 happy-path test + 1 failure-case test (bad input / unauthorized / not found).
- Run `pytest -v` before a phase is marked complete.

## 6. CORS & Frontend Integration *(new)*

- `CORSMiddleware` configured in `main.py`.
- Allowed origins read from env var `ALLOWED_ORIGINS` (comma-separated), defaulting to `http://localhost:3000` for local Next.js dev.
- Credentials allowed only if cookies are used for auth (not needed here since we use JWT bearer tokens).

## 7. Logging Standard *(new)*

- Use Python's `logging` module (or `loguru`) configured once in `core/logging.py`.
- Structured log line: timestamp, level, module, message, and a `request_id` (generated per request via middleware).
- All unhandled exceptions logged with full stack trace before returning a generic 500 error envelope to the client (never leak stack traces to the client).
- No `print()` statements anywhere in `app/`.

## 8. File Upload Validation *(new)*

For OCR/scan endpoints (`/scan/label`, `/scan/barcode`):
- Max file size: 5 MB — reject with `400` + `FILE_TOO_LARGE` before processing.
- Allowed MIME types: `image/jpeg`, `image/png` only — reject with `400` + `UNSUPPORTED_FILE_TYPE`.
- Validate MIME type from actual file bytes (e.g. via `python-magic` or Pillow's `Image.open` check), not just the filename extension.

## 9. Database & Cascade Rules

- UUID primary keys, foreign keys, unique constraints, indexes on frequently searched columns, timestamps, enum/check constraints.
- Every schema change → Alembic migration. Never hand-edit the DB.
- **Explicit `ondelete` behavior per FK:**
  - `user` deleted → `reactions`, `user_sensitivities`, `reviews` → `ondelete="CASCADE"` (they're meaningless without the user).
  - `product` deleted → `product_ingredients` → `CASCADE`. `reviews` and `reactions` referencing that product → `ondelete="SET NULL"` (preserve the user's history/text even if the product is removed) — make `product_id` nullable on those two tables to support this.
  - `ingredient` deleted → block deletion (`RESTRICT`) if referenced by any `product_ingredients` row; admin must reassign/remove product links first.

## 10. Config & Secrets *(new)*

- `.env.example` is **mandatory** in the repo root, listing every required env var with a placeholder value (no real secrets).
- All config loaded through a single `core/config.py` using `pydantic-settings.BaseSettings`.
- No hardcoded credentials, API keys, or DB URLs anywhere in code.
- `.env` itself is gitignored.

## 11. AI/Scoring Rules

- MVP scoring is deterministic Python — explainable, testable, and independent of the API route (pure function in `services/scoring.py`).
- Never claim rule-based logic is "machine learning."
- ML/LLM features (explanation generation, similarity-based recommendations) are optional, later-phase additions, clearly labeled as such.
- Personalization uses `user_sensitivities` + `reactions` history, cross-referenced via ingredient set intersection.

## 12. Safety/Content Rules

- Informational only, no medical diagnosis, no unsupported health claims.
- Every ingredient explanation separates: **function** vs **ChemCheck risk level** vs **evidence level** vs **user-specific match**.
- When evidence is limited, say so explicitly (e.g. `evidence_level: "limited"` shown in the response, not hidden).

## 13. Development Rules

Before changing code: inspect the existing repo, identify what already works, identify missing dependencies/broken imports, don't recreate existing functionality, don't change the stack without approval.

When implementing a feature: explain the plan → list files touched → implement the smallest complete version → write tests → run them → fix errors → verify integration → update docs if needed.

Don't implement future phases early. Don't create placeholder code that looks complete but isn't. If something is blocked by missing information, say so — don't invent it.

## 14. Teaching / Checkpoint Mode *(new)*

Ashish is learning FastAPI fundamentals alongside building this, not just outsourcing it. So:
- The **first time** a new concept/library/pattern is introduced (e.g. async SQLAlchemy sessions, Alembic autogenerate, dependency injection via `Depends`), give a 2–4 line plain explanation of *why* it's used before the code.
- Prefer **stepwise walkthroughs** over dumping a finished file — build it up (model → schema → service → router) so the reasoning is visible.
- End each phase with a short **checkpoint**: what to run locally to verify it works (exact commands), and one thing Ashish should be able to explain back in his own words before moving on.
- Don't over-explain things already covered in a previous phase — only teach what's new.

## 15. Response Format

Every development task response uses:

```
## Understanding
## Existing State
## Plan
## Files
## Implementation
## Verification        (exact commands to run)
## Checkpoint           (what you should now understand / be able to explain)
## Result
## Issues
## Next Step            (not implemented automatically — wait for confirmation)
```

## 16. Phase Execution Rule

PHASE 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9, strictly sequential. After each phase: run tests, verify app starts, verify migrations apply cleanly, verify affected APIs via Swagger, verify frontend integration where applicable. Report result + issues. **Wait for explicit confirmation before starting the next phase.**

---

# PART B — Phase-Specific Prompts

Each block below is self-contained: paste Part A + the one phase block you're working on.

---

## PHASE 0 — Project Scaffolding

**Goal:** Empty but fully wired skeleton — app boots, DB connects, tests run, nothing functional yet.

**Deliverables:**
- `app/` structure per Section 3, `main.py` with FastAPI app + CORS middleware (Section 6) + logging setup (Section 7)
- `core/config.py` with `pydantic-settings`, `.env.example` (Section 10)
- Async SQLAlchemy engine/session setup in `db/`
- Alembic initialized and pointed at the async engine
- `tests/conftest.py` with a test-DB fixture and an `httpx.AsyncClient` fixture
- `docker-compose.yml` with `app` + `postgres` services
- A single trivial `GET /api/v1/health` endpoint returning the standard success envelope, with one passing test

**Checkpoint:** `docker-compose up` boots cleanly; `pytest` passes; `/docs` (Swagger) loads; `alembic upgrade head` runs with zero tables (or a placeholder) without error.

---

## PHASE 1 — Users, Auth, Products, Ingredients (Core Vertical Slices)

**Goal:** Full auth flow + the two foundational tables, each as a complete vertical slice (model → schema → service → router → tests).

**Deliverables:**
- `User` model (Section 9 fields) + register/login/me endpoints, JWT issuance, bcrypt hashing
- `Product` and `Ingredient` models with CRUD (admin-gated create/update per Section 13's "admin must verify" rule) and public read/search endpoints
- Alembic migration for all three tables
- Pagination (Section 4) on product/ingredient list endpoints
- Tests: register/login happy + failure paths; product/ingredient CRUD happy + failure paths

**Checkpoint:** Register a user via Swagger, log in, get a JWT, hit `/auth/me` with the token. Create a product + ingredient as admin. Explain back: how does `Depends()` inject the current user into a protected route?

---

## PHASE 2 — Ingredient Chemical Database (Seed Data)

**Goal:** A real, queryable ingredient dataset with fuzzy search.

**Deliverables:**
- `pg_trgm` extension enabled via migration; trigram index on `ingredients.name`
- `GET /api/v1/ingredients/search?q=` using fuzzy match, paginated
- Seed script (`scripts/seed_ingredients.py`) loading ~80–100 curated real ingredients (name, function, risk_level, is_allergen, evidence_level, description)
- `product_ingredients` join table + endpoint to attach ingredients to a product (admin-only), with `ondelete` rules from Section 9

**Checkpoint:** Run the seed script, search `"sodium"` and get fuzzy matches back. Explain back: why is `pg_trgm` better here than a plain `LIKE '%...%'` query?

---

## PHASE 3 — Rule-Based Scoring Engine

**Goal:** `GET /api/v1/products/{id}/analyze` returns a deterministic, explainable score — no user personalization yet.

**Deliverables:**
- `services/scoring.py`: pure function `calculate_base_score(ingredients: list[Ingredient]) -> ScoreResult`
- Weighted formula combining `risk_level`, `is_allergen`, `evidence_level` — documented with the exact weights used
- `ScoreResult` schema: `{ score: int, category: "Worst"|"Better"|"Best", concern_count: int, breakdown: [...] }`
- Unit tests covering the scoring function directly (no DB/API involved) with hand-crafted ingredient sets and expected scores

**Checkpoint:** Analyze a seeded product via Swagger, confirm the score matches manual hand-calculation for at least one test case. Explain back: why is this function kept pure (no DB calls inside it)?

---

## PHASE 4 — Personalization Engine

**Goal:** Same endpoint, but score/warnings change when a JWT is present.

**Deliverables:**
- `user_sensitivities` model + endpoints to add/remove a user's known sensitivities
- `services/scoring.py` extended: `personalize_score(base: ScoreResult, user: User) -> ScoreResult` — cross-references sensitivities + past `reactions` ingredient sets against the product's ingredients, adds `warnings: [...]`
- `/analyze` endpoint: optional-auth (works with or without JWT), personalizes only when a valid token is present
- Tests: same product, two users (one with a matching sensitivity, one without) → assert different `warnings`/score

**Checkpoint:** Hit `/analyze` with and without a token on the same product, see the warning appear only for the sensitized user. Explain back: how does "optional auth" differ from a fully protected route?

---

## PHASE 5 — OCR Label Scanning + Barcode Lookup

**Goal:** Image upload → matched ingredient list.

**Deliverables:**
- `POST /api/v1/scan/label` — multipart upload, validated per Section 8, `services/ocr.py` (OpenCV preprocess → pytesseract → split → rapidfuzz match against `ingredients` table), returns matched + unmatched tokens
- `POST /api/v1/scan/barcode` — image upload, `pyzbar` decode, lookup in local `products` table, fallback to Open Food Facts API if not found (document the external call clearly, with a timeout and error envelope on failure)
- Tests: mock the OCR/decode calls (don't require real Tesseract in CI) and test the matching/validation logic directly

**Checkpoint:** Upload a real label photo via Swagger, confirm at least a few ingredients get matched. Explain back: why do we validate file type/size *before* running OCR, not after?

---

## PHASE 6 — Recommendation Engine

**Goal:** `GET /api/v1/products/{id}/alternatives`.

**Deliverables:**
- `services/recommender.py`: query same-category products, score each (reuse Phase 3/4 logic), exclude ones containing the user's sensitivity ingredients, sort by score, return top N (paginated per Section 4 if list is long)
- Tests: given a seeded category with known scores, assert correct ordering and exclusion

**Checkpoint:** Get alternatives for a low-scoring seeded product, confirm higher-scoring same-category products come back first. Explain back: why does this reuse the scoring service instead of duplicating the weighting logic?

---

## PHASE 7 — Reaction Tracking + Reviews

**Goal:** Users log reactions and reviews; pattern detection flags repeat sensitivities.

**Deliverables:**
- `reactions` and `reviews` models/endpoints (`ondelete` rules from Section 9)
- After a new reaction is logged: check if 2+ reactions share an ingredient → suggest adding it to `user_sensitivities` (return this as a suggestion in the response, don't auto-add it)
- Tests: log two reactions with an overlapping ingredient, assert the suggestion appears

**Checkpoint:** Log two reactions with a shared ingredient, see the suggestion in the API response. Explain back: why is the ingredient suggested rather than auto-added to sensitivities?

---

## PHASE 8 — Admin Panel + Regulatory Alerts

**Goal:** Admin-only management surface.

**Deliverables:**
- `is_admin` flag on `User`, admin-only dependency (`require_admin`)
- Full CRUD for products/ingredients/alerts under `/api/v1/admin/...`
- `alerts` model/endpoints (Section 3's schema) + `GET /api/v1/products/{id}/alerts` for users
- Tests: non-admin gets 403 on admin routes, admin succeeds

**Checkpoint:** Confirm a non-admin JWT gets a 403 on an admin route. Explain back: how does `require_admin` differ from `get_current_user`?

---

## PHASE 9 — Deployment, Testing Polish, Optional LLM Layer

**Goal:** Production-shaped, documented, demo-ready.

**Deliverables:**
- Full `docker-compose.yml` (app + postgres, healthchecks), documented `.env.example`
- Full `pytest` suite run with a coverage report; fill any gaps identified across phases
- README with setup instructions, architecture diagram, and API overview
- **Optional:** `services/explain.py` — LLM API call to turn an ingredient's structured data into a 2-sentence plain-English explanation, clearly labeled in code/docs as the one genuinely ML-powered piece, with graceful fallback to the static `description` field if the API call fails

**Checkpoint:** Fresh clone + `docker-compose up` + `alembic upgrade head` + seed script → fully working app from zero. Explain back: which parts of ChemCheck are "AI" in the traditional rule-based sense, and which (if any) use an actual LLM — and why that distinction matters for the project report.
