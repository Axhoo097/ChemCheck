"""
Phase 6 — "what should I buy instead?"

Deliberately reuses analysis_service.analyze_product() for every
candidate rather than re-implementing any scoring/weighting logic here.
One scoring algorithm lives in services/scoring.py; every feature that
needs a score (this one included) calls the same path to get it, so a
future change to the weights automatically applies everywhere.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.models.user import User
from app.schemas.product import ProductOut
from app.schemas.recommendation import AlternativeOut
from app.services import analysis_service, product_service

DEFAULT_ALTERNATIVES_LIMIT = 5


async def recommend_alternatives(
    db: AsyncSession,
    product_id: str,
    current_user: User | None,
    limit: int = DEFAULT_ALTERNATIVES_LIMIT,
) -> list[AlternativeOut]:
    target_product = await product_service.get_product(db, product_id)  # 404s if missing

    candidates_stmt = select(Product).where(
        Product.category == target_product.category,
        Product.id != target_product.id,
    )
    candidates = list((await db.execute(candidates_stmt)).scalars().all())

    scored: list[tuple[Product, int, str]] = []

    for candidate in candidates:
        result = await analysis_service.analyze_product(db, str(candidate.id), current_user)

        # If the user is authenticated and this candidate triggered a
        # personalization warning (a saved sensitivity OR a past
        # reaction — see services/scoring.py's personalize_score), it's
        # not a genuine "alternative" for them — skip it rather than
        # recommend something they'd likely react to just as badly.
        if current_user is not None and result.warnings:
            continue

        scored.append((candidate, result.score, result.category))

    # Best score first.
    scored.sort(key=lambda item: item[1], reverse=True)

    return [
        AlternativeOut(product=candidate, score=score, category=category)
        for candidate, score, category in scored[:limit]
    ]
