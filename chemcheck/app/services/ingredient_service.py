from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ServiceError
from app.models.alert import Alert
from app.models.ingredient import Ingredient
from app.models.product_ingredient import ProductIngredient
from app.schemas.ingredient import IngredientCreate, IngredientUpdate

# Below this similarity score (0-1), a pg_trgm match is considered noise.
FUZZY_SIMILARITY_THRESHOLD = 0.2


def _parse_uuid(value: str) -> UUID:
    try:
        return UUID(value)
    except ValueError:
        raise ServiceError("NOT_FOUND", "Ingredient not found.", status_code=404)


async def list_ingredients(
    db: AsyncSession, page: int, page_size: int, q: str | None = None
) -> tuple[list[Ingredient], int]:
    stmt = select(Ingredient)
    count_stmt = select(func.count()).select_from(Ingredient)

    # Plain ILIKE for now — Phase 2 swaps this for pg_trgm fuzzy search.
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(Ingredient.name.ilike(pattern))
        count_stmt = count_stmt.where(Ingredient.name.ilike(pattern))

    total_count = (await db.execute(count_stmt)).scalar_one()
    stmt = stmt.order_by(Ingredient.name.asc()).offset((page - 1) * page_size).limit(page_size)
    items = list((await db.execute(stmt)).scalars().all())
    return items, total_count


async def search_ingredients_fuzzy(db: AsyncSession, q: str, limit: int = 20) -> list[Ingredient]:
    """
    Phase 2 fuzzy search. On Postgres, uses the pg_trgm `similarity()`
    function (see migration 0002) so typos and partial names still
    match. On any other dialect (SQLite, used in tests per Section 5
    — no real Postgres needed in CI) it falls back to a plain ILIKE,
    which is good enough for test assertions even though it isn't
    truly fuzzy.
    """
    dialect_name = db.bind.dialect.name if db.bind is not None else "sqlite"

    if dialect_name == "postgresql":
        similarity = func.similarity(Ingredient.name, q)
        stmt = (
            select(Ingredient)
            .where(similarity > FUZZY_SIMILARITY_THRESHOLD)
            .order_by(similarity.desc())
            .limit(limit)
        )
    else:
        pattern = f"%{q}%"
        stmt = select(Ingredient).where(Ingredient.name.ilike(pattern)).order_by(Ingredient.name.asc()).limit(limit)

    return list((await db.execute(stmt)).scalars().all())


async def get_ingredient(db: AsyncSession, ingredient_id: str) -> Ingredient:
    ingredient = await db.get(Ingredient, _parse_uuid(ingredient_id))
    if not ingredient:
        raise ServiceError("NOT_FOUND", "Ingredient not found.", status_code=404)
    return ingredient


async def create_ingredient(db: AsyncSession, payload: IngredientCreate) -> Ingredient:
    existing = (
        await db.execute(select(Ingredient).where(Ingredient.name == payload.name))
    ).scalar_one_or_none()
    if existing:
        raise ServiceError(
            "INGREDIENT_ALREADY_EXISTS",
            "An ingredient with this name already exists.",
            status_code=409,
        )

    ingredient = Ingredient(**payload.model_dump())
    db.add(ingredient)
    await db.commit()
    await db.refresh(ingredient)
    return ingredient


async def update_ingredient(db: AsyncSession, ingredient_id: str, payload: IngredientUpdate) -> Ingredient:
    ingredient = await get_ingredient(db, ingredient_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(ingredient, field, value)
    await db.commit()
    await db.refresh(ingredient)
    return ingredient


async def delete_ingredient(db: AsyncSession, ingredient_id: str) -> None:
    ingredient = await get_ingredient(db, ingredient_id)

    # Section 9 RESTRICT rule, enforced at the application level so it's
    # identical on SQLite (tests) and Postgres (production) regardless
    # of whether FK enforcement is turned on for the connection.
    links_count = (
        await db.execute(
            select(func.count())
            .select_from(ProductIngredient)
            .where(ProductIngredient.ingredient_id == ingredient.id)
        )
    ).scalar_one()
    if links_count > 0:
        raise ServiceError(
            "INGREDIENT_IN_USE",
            "Cannot delete an ingredient that is linked to one or more products. "
            "Remove it from those products first.",
            status_code=409,
        )

    # CASCADE for alerts (catalog metadata, unlike RESTRICT for
    # product_ingredients above), done explicitly so it behaves the
    # same on SQLite (tests) and Postgres (production).
    await db.execute(delete(Alert).where(Alert.ingredient_id == ingredient.id))
    await db.delete(ingredient)
    await db.commit()
