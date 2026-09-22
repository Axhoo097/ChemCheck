from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_optional, require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.alert import AlertOut
from app.schemas.common import pagination_meta, success_response
from app.schemas.product import ProductCreate, ProductOut, ProductUpdate
from app.services import alert_service, analysis_service, llm_service, product_service, recommender

router = APIRouter(prefix="/api/v1/products", tags=["products"])


@router.get("")
async def list_products(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    category: str | None = Query(default=None),
    q: str | None = Query(default=None, description="Search by name or brand"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    items, total_count = await product_service.list_products(db, page, page_size, category, q)
    data = [ProductOut.model_validate(p).model_dump(mode="json") for p in items]
    return success_response(data, meta=pagination_meta(page, page_size, total_count))


@router.get("/{product_id}")
async def get_product(product_id: str, db: AsyncSession = Depends(get_db)) -> dict:
    product = await product_service.get_product(db, product_id)
    return success_response(ProductOut.model_validate(product).model_dump(mode="json"))


@router.get("/{product_id}/analyze")
async def analyze_product(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> dict:
    # Works with or without a token. With one, Phase 4 personalization
    # (saved sensitivities) is layered on top of the deterministic base
    # score; without one, only the base score is returned.
    result = await analysis_service.analyze_product(db, product_id, current_user)
    return success_response(result.model_dump(mode="json"))


@router.get("/{product_id}/alternatives")
async def get_alternatives(
    product_id: str,
    limit: int = Query(default=recommender.DEFAULT_ALTERNATIVES_LIMIT, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> dict:
    # Same optional-auth pattern as /analyze: with a token, candidates
    # that would trigger one of the user's own sensitivity warnings are
    # excluded rather than recommended.
    items = await recommender.recommend_alternatives(db, product_id, current_user, limit)
    return success_response([item.model_dump(mode="json") for item in items])


@router.get("/{product_id}/alerts")
async def get_product_alerts(product_id: str, db: AsyncSession = Depends(get_db)) -> dict:
    items = await alert_service.list_product_alerts(db, product_id)
    return success_response([AlertOut.model_validate(i).model_dump(mode="json") for i in items])


@router.get(
    "/{product_id}/explain",
    summary="Plain-English LLM explanation of a product's score",
    description=(
        "Calls an LLM (OpenAI gpt-4o-mini by default) to turn the ChemCheck "
        "score into a 2–3 sentence plain-English summary. "
        "Returns **503** if `OPENAI_API_KEY` is not configured. "
        "Supports optional authentication: with a token the personalized score "
        "is explained; without one the base score is used."
    ),
)
async def explain_product(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> dict:
    result = await analysis_service.analyze_product(db, product_id, current_user)
    explanation = await llm_service.explain_score(result)
    return success_response({"explanation": explanation, "score": result.score, "category": result.category})


@router.post("", status_code=201)
async def create_product(
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
) -> dict:
    product = await product_service.create_product(db, payload)
    return success_response(ProductOut.model_validate(product).model_dump(mode="json"))


@router.put("/{product_id}")
async def update_product(
    product_id: str,
    payload: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
) -> dict:
    product = await product_service.update_product(db, product_id, payload)
    return success_response(ProductOut.model_validate(product).model_dump(mode="json"))


@router.delete("/{product_id}", status_code=204)
async def delete_product(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
) -> None:
    await product_service.delete_product(db, product_id)
