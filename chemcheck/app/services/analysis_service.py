from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ingredient import Ingredient
from app.models.product_ingredient import ProductIngredient
from app.models.user import User
from app.schemas.scoring import ScoreResult
from app.services import product_service, reaction_service, sensitivity_service
from app.services.scoring import calculate_base_score, personalize_score


async def analyze_product(db: AsyncSession, product_id: str, current_user: User | None = None) -> ScoreResult:
    """
    DB-facing wrapper around the pure scoring functions. Fetches the
    product (404s if missing) and its linked ingredients, computes the
    deterministic base score, then — only if an authenticated user was
    passed in (Phase 4's optional-auth) — layers personalization on top
    using that user's saved sensitivities (Phase 4) and reaction
    history (Phase 7).

    Phase 9 addition: unauthenticated requests are served from / written
    to an optional Redis cache (TTL 300 s). Personalized scores are
    *never* cached — they are user-specific and must not leak across users.
    The cache is completely transparent: if REDIS_URL is unset or Redis is
    unreachable, the function behaves exactly as before.
    """
    # Phase 9 — try the cache first for anonymous (base) scores only.
    if current_user is None:
        from app.core.cache import get_cached_score, set_cached_score

        cached = await get_cached_score(product_id)
        if cached is not None:
            return cached

    product = await product_service.get_product(db, product_id)

    stmt = (
        select(Ingredient)
        .join(ProductIngredient, ProductIngredient.ingredient_id == Ingredient.id)
        .where(ProductIngredient.product_id == product.id)
    )
    ingredients = list((await db.execute(stmt)).scalars().all())

    base = calculate_base_score(ingredients)

    if current_user is None:
        # Store the freshly-computed base score before returning it.
        from app.core.cache import set_cached_score

        await set_cached_score(product_id, base)
        return base

    sensitivity_ids = await sensitivity_service.get_user_sensitivity_ingredient_ids(db, current_user.id)
    reaction_ingredient_ids = await reaction_service.get_user_reaction_ingredient_ids(db, current_user.id)
    return personalize_score(base, ingredients, sensitivity_ids, reaction_ingredient_ids)
