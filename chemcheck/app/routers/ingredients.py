from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_admin
from app.db.session import get_db
from app.schemas.common import pagination_meta, success_response
from app.schemas.ingredient import IngredientCreate, IngredientOut, IngredientUpdate
from app.services import ingredient_service

router = APIRouter(prefix="/api/v1/ingredients", tags=["ingredients"])


@router.get("")
async def list_ingredients(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    q: str | None = Query(default=None, description="Search by ingredient name"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    items, total_count = await ingredient_service.list_ingredients(db, page, page_size, q)
    data = [IngredientOut.model_validate(i).model_dump(mode="json") for i in items]
    return success_response(data, meta=pagination_meta(page, page_size, total_count))


@router.get("/search")
async def search_ingredients(
    q: str = Query(min_length=1, description="Ingredient name to fuzzy-match"),
    limit: int = Query(default=20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> dict:
    # IMPORTANT: this route must stay registered before GET /{ingredient_id}
    # below, or FastAPI will try to parse "search" as a UUID path param.
    items = await ingredient_service.search_ingredients_fuzzy(db, q, limit)
    data = [IngredientOut.model_validate(i).model_dump(mode="json") for i in items]
    return success_response(data)


@router.get("/{ingredient_id}")
async def get_ingredient(ingredient_id: str, db: AsyncSession = Depends(get_db)) -> dict:
    ingredient = await ingredient_service.get_ingredient(db, ingredient_id)
    return success_response(IngredientOut.model_validate(ingredient).model_dump(mode="json"))


@router.post("", status_code=201)
async def create_ingredient(
    payload: IngredientCreate,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
) -> dict:
    ingredient = await ingredient_service.create_ingredient(db, payload)
    return success_response(IngredientOut.model_validate(ingredient).model_dump(mode="json"))


@router.put("/{ingredient_id}")
async def update_ingredient(
    ingredient_id: str,
    payload: IngredientUpdate,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
) -> dict:
    ingredient = await ingredient_service.update_ingredient(db, ingredient_id, payload)
    return success_response(IngredientOut.model_validate(ingredient).model_dump(mode="json"))


@router.delete("/{ingredient_id}", status_code=204)
async def delete_ingredient(
    ingredient_id: str,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
) -> None:
    await ingredient_service.delete_ingredient(db, ingredient_id)
