from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import success_response
from app.schemas.sensitivity import AddSensitivityRequest
from app.services import sensitivity_service

router = APIRouter(prefix="/api/v1/me/sensitivities", tags=["sensitivities"])


@router.get("")
async def list_my_sensitivities(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    items = await sensitivity_service.list_user_sensitivities(db, current_user)
    return success_response([item.model_dump(mode="json") for item in items])


@router.post("", status_code=201)
async def add_my_sensitivity(
    payload: AddSensitivityRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    item = await sensitivity_service.add_sensitivity(
        db, current_user, payload.ingredient_id, payload.severity_note
    )
    return success_response(item.model_dump(mode="json"))


@router.delete("/{ingredient_id}", status_code=204)
async def remove_my_sensitivity(
    ingredient_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await sensitivity_service.remove_sensitivity(db, current_user, ingredient_id)
