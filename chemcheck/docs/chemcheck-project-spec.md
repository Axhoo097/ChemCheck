# ChemCheck — Full Project Specification & Build Prompt

> Use this document as a master reference/prompt when building, or when asking any AI tool (Claude, ChatGPT, Copilot, etc.) to generate code for a specific module. Copy the relevant section as context whenever you need help with that part.

---

## 1. Project Overview

**Project Name:** ChemCheck
**One-liner:** An AI-assisted platform that analyzes ingredient lists of everyday consumer products (cosmetics, food, personal care), scores them for safety, personalizes the risk to each user's profile and reaction history, and recommends safer alternatives.

**Tech Stack:**
- **Backend:** Python (FastAPI)
- **Database:** PostgreSQL (SQLAlchemy ORM + Alembic migrations)
- **Frontend:** React / Next.js + Tailwind CSS
- **AI/Processing:** Python (rule-based scoring engine + OCR + optional ML/NLP)
- **Auth:** JWT (python-jose) + bcrypt (passlib)
- **Containerization:** Docker + docker-compose

**Scope note:** Positioned as an informational/educational tool, not a medical diagnostic tool. All outputs are framed as "ChemCheck Risk Category" scores, not medical safety claims.

---

## 2. System Architecture

```
                        CHEMCHECK
                            │
                            ▼
                  ┌──────────────────┐
                  │  Frontend (Next.js) │
                  └────────┬─────────┘
                           │ REST/JSON (HTTPS)
                           ▼
                  ┌──────────────────┐
                  │  FastAPI Backend  │
                  │  (app/routers)    │
                  └────────┬─────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   Auth Service      Scoring Engine    OCR/Scan Service
   (JWT/bcrypt)      (rule-based +     (pytesseract,
                       ML optional)     opencv, pyzbar)
          │                │                │
          └────────────────┼────────────────┘
                           ▼
                  ┌──────────────────┐
                  │   PostgreSQL DB   │
                  │  (SQLAlchemy ORM) │
                  └──────────────────┘
```

All AI/scoring logic lives **inside** the FastAPI app as services (no separate microservice needed for MVP — keep it monolithic until scale demands splitting it out).

---

## 3. Database Schema (PostgreSQL)

### `users`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| name | VARCHAR | |
| email | VARCHAR, unique | |
| password_hash | VARCHAR | bcrypt hash |
| skin_type | VARCHAR | nullable (dry/oily/combination/sensitive) |
| hair_type | VARCHAR | nullable |
| diet_preference | VARCHAR | nullable (veg/non-veg/vegan) |
| created_at | TIMESTAMP | |

### `user_sensitivities`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | FK → users | |
| ingredient_id | FK → ingredients | |
| severity_note | TEXT | nullable, user's own note |

### `products`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| name | VARCHAR | |
| brand | VARCHAR | |
| barcode | VARCHAR, unique, nullable | |
| category | VARCHAR | e.g. shampoo, sunscreen, snack |
| description | TEXT | nullable |
| image_url | VARCHAR | nullable |
| created_at | TIMESTAMP | |

### `ingredients`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| name | VARCHAR, unique | |
| function | VARCHAR | e.g. "preservative", "surfactant" |
| risk_level | ENUM | low / medium / high |
| is_allergen | BOOLEAN | |
| evidence_level | ENUM | strong / moderate / limited |
| description | TEXT | plain-language explanation |

### `product_ingredients` (join table)
| Column | Type | Notes |
|---|---|---|
| product_id | FK → products | |
| ingredient_id | FK → ingredients | |
| position | INT | order in ingredient list (proxy for concentration) |

### `reactions`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | FK → users | |
| product_id | FK → products | |
| reaction_type | VARCHAR | e.g. redness, itching |
| severity | ENUM | mild / moderate / severe |
| date | DATE | |
| notes | TEXT | nullable |

### `reviews`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | FK → users | |
| product_id | FK → products | |
| rating | INT | 1–5 |
| comment | TEXT | nullable |
| created_at | TIMESTAMP | |

### `alerts` (regulatory/recall)
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| product_id | FK → products, nullable | |
| ingredient_id | FK → ingredients, nullable | |
| title | VARCHAR | |
| description | TEXT | |
| created_at | TIMESTAMP | |

---

## 4. Backend — Functions & API Endpoints (FastAPI)

### 4.1 Auth Module (`app/routers/auth.py`)
- `POST /auth/register` → create user, hash password
- `POST /auth/login` → verify password, return JWT
- `GET /auth/me` → return current user profile (JWT-protected)
- `PUT /auth/me` → update profile (skin_type, hair_type, sensitivities, preferences)

### 4.2 Product Module (`app/routers/products.py`)
- `GET /products` → list/search products (query params: name, category, brand)
- `GET /products/{id}` → product detail + ingredient list
- `POST /products` → admin-only, create product
- `GET /products/barcode/{barcode}` → lookup by barcode (fallback to Open Food Facts API if not found locally)

### 4.3 Ingredient Module (`app/routers/ingredients.py`)
- `GET /ingredients/{id}` → ingredient detail (function, risk, description)
- `GET /ingredients/search?q=` → fuzzy search (use Postgres `pg_trgm`)
- `POST /ingredients` → admin-only, add new ingredient

### 4.4 Scoring/Analysis Module (`app/services/scoring.py`)
Core function:
```python
def calculate_safety_score(product: Product, user: User | None) -> ScoreResult:
    """
    1. Fetch all ingredients for product
    2. Base score = weighted sum of (risk_level, is_allergen, evidence_level)
    3. If user provided:
         - cross-check user_sensitivities against product ingredients
         - cross-check user's past reactions' ingredients against product ingredients
         - apply penalty/warning if overlap found
    4. Return: {score: int, category: Worst/Better/Best, warnings: [...], concern_count: int}
    """
```
- `GET /products/{id}/analyze` → returns personalized score (uses JWT if present, else generic score)

### 4.5 Recommendation Module (`app/services/recommender.py`)
```python
def recommend_alternatives(product: Product, user: User | None, limit=3) -> list[Product]:
    """
    1. Query products in same category
    2. Exclude the current product
    3. Score each candidate (reuse scoring engine)
    4. Filter out ones containing user's known sensitivity ingredients
    5. Sort by score descending, return top N
    """
```
- `GET /products/{id}/alternatives`

### 4.6 Comparison Module
- `POST /products/compare` → body: `{product_ids: [id1, id2]}` → returns side-by-side score/ingredient/user-match table

### 4.7 OCR/Scan Module (`app/services/ocr.py`)
```python
def extract_ingredients_from_image(image_bytes: bytes) -> list[str]:
    """
    1. Load image with OpenCV, preprocess (grayscale, threshold, denoise)
    2. Run pytesseract OCR
    3. Split extracted text by commas/newlines
    4. Fuzzy-match each token against ingredients table
    5. Return matched ingredient list + unmatched raw tokens
    """
```
- `POST /scan/label` → multipart image upload → returns extracted + matched ingredients
- `POST /scan/barcode` → image upload → `pyzbar` decode → barcode lookup

### 4.8 Reaction Tracking Module (`app/routers/reactions.py`)
- `POST /reactions` → log a reaction (user_id, product_id, type, severity, date)
- `GET /reactions/me` → list user's reaction history
- Internal: after logging, re-run pattern check — if same ingredient triggered 2+ reactions, flag it as a "confirmed personal sensitivity" and offer to add it to `user_sensitivities`

### 4.9 Review Module (`app/routers/reviews.py`)
- `POST /reviews` → add review
- `GET /products/{id}/reviews` → list reviews for a product

### 4.10 Admin Module (`app/routers/admin.py`)
- CRUD endpoints for products/ingredients/alerts, role-gated (`is_admin` flag on user)
- `POST /admin/alerts` → create recall/regulatory alert

---

## 5. AI/Intelligence Layer — What's Actually "AI" Here

Be honest in your report: most of the "intelligence" is **deterministic rule-based logic**, not machine learning — and that's fine and defensible for an MVP.

| Component | Technique | Library |
|---|---|---|
| Safety scoring | Weighted rule-based formula | Plain Python |
| Personalization | Set-intersection logic (user sensitivities ∩ product ingredients) | Plain Python |
| Ingredient name matching (OCR output → DB) | Fuzzy string matching | `pg_trgm` (Postgres) or `rapidfuzz` (Python) |
| Label text extraction | OCR | `pytesseract` + `opencv-python` |
| Barcode decoding | Computer vision | `pyzbar` |
| (Optional, later) Similar-product recommendation | TF-IDF + cosine similarity on ingredient sets | `scikit-learn` |
| (Optional, later) Natural-language explanation generation | LLM API call (e.g., Claude/OpenAI API) to turn structured data into a friendly paragraph | `anthropic` or `openai` Python SDK |

**Recommendation:** Build Phases 1–4 fully rule-based first (this is your working MVP). Only add the LLM-powered explanation layer (`ingredient → plain-English "why it matters"` text) as a polish feature near the end — this is where you can legitimately say "AI-powered" via an actual LLM call, e.g.:

```python
def generate_explanation(ingredient: Ingredient) -> str:
    prompt = f"Explain in 2 simple sentences what {ingredient.name} is used for and why someone with sensitivities might want to know about it. Be factual, not alarmist."
    # call LLM API, return response text
```

---

## 6. Frontend Structure (Next.js)

```
/app
  /login
  /register
  /dashboard
  /scan          → camera/upload UI for OCR
  /search        → product search
  /product/[id]  → product detail + score + warnings + alternatives
  /compare       → side-by-side comparison
  /profile       → skin/hair type, sensitivities, preferences
  /reactions     → reaction history log
  /reviews       → user's reviews
  /admin/*       → admin-only pages
/components
  ProductCard.tsx
  ScoreBadge.tsx        → shows Worst/Better/Best with color
  IngredientList.tsx
  WarningAlert.tsx
  ComparisonTable.tsx
  ScanUploader.tsx
/lib
  api.ts        → fetch wrapper for backend calls
  auth.ts        → JWT storage/handling
```

**Key UI principle:** Score badge uses color + text, never says "medically safe" — always "ChemCheck Risk Category: Better".

---

## 7. Build Phases (Reference)

1. **Phase 0:** Project scaffolding (FastAPI + Postgres + Next.js skeletons)
2. **Phase 1:** Users, Products, Ingredients CRUD + Auth
3. **Phase 2:** Ingredient database seeded (curated ~100 entries)
4. **Phase 3:** Rule-based scoring engine
5. **Phase 4:** Personalization (sensitivities cross-check)
6. **Phase 5:** OCR label scanning + barcode lookup
7. **Phase 6:** Recommendation engine
8. **Phase 7:** Reaction tracking + reviews
9. **Phase 8:** Admin panel + regulatory alerts
10. **Phase 9:** Docker deployment, testing, polish, optional LLM explanation layer

---

## 8. How to Use This Document

When you want help building a specific piece, copy the relevant section (e.g., section 4.4 Scoring Module) and say: *"Build this FastAPI service based on this spec, using SQLAlchemy models from section 3."* This keeps each request scoped and gives consistent context every time — to Claude, another AI tool, or a teammate.
