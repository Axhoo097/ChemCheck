from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import pagination_meta, success_response
from app.schemas.review import ReviewCreate, ReviewOut
from app.services import review_service

router = APIRouter(prefix="/api/v1", tags=["reviews"])


@router.post("/reviews", status_code=201)
async def create_review(
    payload: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    review = await review_service.create_review(db, current_user, payload)
    return success_response(ReviewOut.model_validate(review).model_dump(mode="json"))


@router.get("/products/{product_id}/reviews")
async def list_product_reviews(
    product_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict:
    items, total_count = await review_service.list_product_reviews(db, product_id, page, page_size)
    data = [ReviewOut.model_validate(i).model_dump(mode="json") for i in items]
    return success_response(data, meta=pagination_meta(page, page_size, total_count))
