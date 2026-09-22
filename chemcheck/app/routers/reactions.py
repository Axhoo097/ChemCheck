from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import success_response
from app.schemas.reaction import ReactionCreate, ReactionOut
from app.services import reaction_service

router = APIRouter(prefix="/api/v1/me/reactions", tags=["reactions"])


@router.get("")
async def list_my_reactions(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    items = await reaction_service.list_my_reactions(db, current_user)
    return success_response([ReactionOut.model_validate(item).model_dump(mode="json") for item in items])


@router.post("", status_code=201)
async def log_reaction(
    payload: ReactionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    reaction, suggestions = await reaction_service.log_reaction(db, current_user, payload)
    return success_response(
        {
            "reaction": ReactionOut.model_validate(reaction).model_dump(mode="json"),
            "suggested_sensitivities": [s.model_dump(mode="json") for s in suggestions],
        }
    )
