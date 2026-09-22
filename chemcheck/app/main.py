import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.errors import ServiceError
from app.core.logging import logger, setup_logging
from app.routers import (
    admin_alerts,
    auth,
    health,
    ingredients,
    product_ingredients,
    products,
    reactions,
    reviews,
    scan,
    sensitivities,
)

setup_logging()

# ── Phase 9 — Rich OpenAPI / Swagger metadata ─────────────────────────────────
_DESCRIPTION = """
**ChemCheck** is a cosmetic-ingredient safety API that gives every product a
deterministic, rule-based *ChemCheck risk score* (0–100) so users can make
informed purchasing decisions — no medical claims, no black-box ML.

### Highlights
- 🔬 **Ingredient database** — 100-entry curated dataset with risk levels,
  evidence strength, and allergen flags
- 📊 **Safety scoring** — transparent, documented-weight algorithm (Phase 3)
- 🙋 **Personalization** — saved sensitivities + reaction history lower the
  score for *you*, not everyone (Phase 4 & 7)
- 📸 **Label & barcode scan** — OCR via Tesseract, barcode via pyzbar,
  Open Food Facts fallback (Phase 5)
- 🔄 **Alternatives** — same-category products ranked by your personal score
  (Phase 6)
- 💬 **LLM explanation** *(optional)* — plain-English summary of the score
  via OpenAI (Phase 9; requires `OPENAI_API_KEY`)
"""

_TAGS = [
    {"name": "health",              "description": "Liveness probe — no auth required."},
    {"name": "auth",                "description": "Register, login, and obtain JWT tokens."},
    {"name": "products",            "description": "Product catalog: CRUD (admin), scoring, alternatives, and LLM explanation."},
    {"name": "ingredients",         "description": "Ingredient database: CRUD (admin) and fuzzy search."},
    {"name": "product-ingredients", "description": "Attach / list / remove ingredients on a product (admin)."},
    {"name": "sensitivities",       "description": "Per-user saved ingredient sensitivities."},
    {"name": "reactions",           "description": "Per-user reaction log; triggers pattern-detection suggestions."},
    {"name": "reviews",             "description": "Per-user product reviews."},
    {"name": "scan",                "description": "OCR label scan and barcode lookup."},
    {"name": "admin-alerts",        "description": "Admin-managed product safety alerts."},
]

app = FastAPI(
    title=settings.app_name,
    description=_DESCRIPTION,
    version="1.0.0",
    contact={
        "name": "ChemCheck Team",
        "url": "https://github.com/Axhoo097/ChemCheck",
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    openapi_tags=_TAGS,
    # Clean, readable operation IDs in generated clients (e.g. "products:analyze_product")
    generate_unique_id_function=lambda route: f"{route.tags[0]}:{route.name}" if route.tags else route.name,
)

# Section 6 — CORS, so the Next.js frontend can call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Section 7 — every request gets a request_id, logged with method/path/status/duration.
@app.middleware("http")
async def request_id_and_logging_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    start = time.perf_counter()

    response = await call_next(request)

    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "request_id=%s method=%s path=%s status=%s duration_ms=%.2f",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    response.headers["X-Request-ID"] = request_id
    return response


# Section 4 — every ServiceError becomes the standard error envelope.
@app.exception_handler(ServiceError)
async def service_error_handler(request: Request, exc: ServiceError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {"code": exc.code, "message": exc.message, "details": exc.details},
        },
    )


# Section 7 — never leak stack traces to the client; log them instead.
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    logger.exception("Unhandled error request_id=%s path=%s", request_id, request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "Something went wrong. Please try again.",
                "details": {},
            },
        },
    )


app.include_router(health.router)
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(ingredients.router)
app.include_router(product_ingredients.router)
app.include_router(sensitivities.router)
app.include_router(scan.router)
app.include_router(reactions.router)
app.include_router(reviews.router)
app.include_router(admin_alerts.router)
