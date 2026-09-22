from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ingredient import Ingredient
from app.models.product_ingredient import ProductIngredient
from app.models.reaction import Reaction
from app.models.user import User
from app.models.user_sensitivity import UserSensitivity
from app.schemas.reaction import ReactionCreate, SensitivitySuggestion
from app.services import product_service


async def log_reaction(
    db: AsyncSession, user: User, payload: ReactionCreate
) -> tuple[Reaction, list[SensitivitySuggestion]]:
    await product_service.get_product(db, str(payload.product_id))  # 404s if the product doesn't exist

    reaction = Reaction(
        user_id=user.id,
        product_id=payload.product_id,
        reaction_type=payload.reaction_type,
        severity=payload.severity,
        occurred_on=payload.occurred_on,
        notes=payload.notes,
    )
    db.add(reaction)
    await db.commit()
    await db.refresh(reaction)

    suggestions = await _detect_repeat_ingredient_patterns(db, user.id)
    return reaction, suggestions


async def list_my_reactions(db: AsyncSession, user: User) -> list[Reaction]:
    stmt = select(Reaction).where(Reaction.user_id == user.id).order_by(Reaction.occurred_on.desc())
    return list((await db.execute(stmt)).scalars().all())


async def get_user_reaction_ingredient_ids(db: AsyncSession, user_id: UUID) -> set[UUID]:
    """
    All ingredient IDs found in any product the user has ever logged a
    reaction to. Used by analysis_service to feed Phase 7's softer
    "you've reacted to this before" personalization signal into
    /analyze, alongside Phase 4's saved-sensitivity signal.
    """
    reacted_product_ids_stmt = select(Reaction.product_id).where(
        Reaction.user_id == user_id, Reaction.product_id.is_not(None)
    )
    product_ids = [row[0] for row in (await db.execute(reacted_product_ids_stmt)).all()]
    if not product_ids:
        return set()

    ingredient_ids_stmt = select(ProductIngredient.ingredient_id).where(
        ProductIngredient.product_id.in_(product_ids)
    )
    return {row[0] for row in (await db.execute(ingredient_ids_stmt)).all()}


async def _detect_repeat_ingredient_patterns(db: AsyncSession, user_id: UUID) -> list[SensitivitySuggestion]:
    """
    Scans ALL of the user's logged reactions (not just the one just
    added — a pattern can only be seen across the full history) for any
    ingredient that appears in 2+ distinct products the user reacted to.
    Returns a *suggestion* per such ingredient; nothing is written to
    user_sensitivities here — see the router/README for why.
    """
    reacted_product_ids_stmt = select(Reaction.product_id).where(
        Reaction.user_id == user_id, Reaction.product_id.is_not(None)
    )
    product_ids = [row[0] for row in (await db.execute(reacted_product_ids_stmt)).all()]
    if len(product_ids) < 2:
        return []

    ingredient_links_stmt = select(ProductIngredient.ingredient_id, ProductIngredient.product_id).where(
        ProductIngredient.product_id.in_(product_ids)
    )
    rows = (await db.execute(ingredient_links_stmt)).all()

    ingredient_to_products: dict[UUID, set[UUID]] = {}
    for ingredient_id, product_id in rows:
        ingredient_to_products.setdefault(ingredient_id, set()).add(product_id)

    repeat_ingredient_ids = {iid for iid, products in ingredient_to_products.items() if len(products) >= 2}
    if not repeat_ingredient_ids:
        return []

    # Don't suggest something the user already saved as a sensitivity.
    already_saved_stmt = select(UserSensitivity.ingredient_id).where(UserSensitivity.user_id == user_id)
    already_saved = {row[0] for row in (await db.execute(already_saved_stmt)).all()}
    to_suggest = repeat_ingredient_ids - already_saved
    if not to_suggest:
        return []

    ingredients = (
        await db.execute(select(Ingredient).where(Ingredient.id.in_(to_suggest)))
    ).scalars().all()

    return [
        SensitivitySuggestion(
            ingredient_id=ingredient.id,
            ingredient_name=ingredient.name,
            reason=f"You've reacted to more than one product containing {ingredient.name}.",
        )
        for ingredient in ingredients
    ]
