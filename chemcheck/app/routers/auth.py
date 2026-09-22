from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import success_response
from app.schemas.user import LoginRequest, RegisterRequest, TokenResponse, UserOut, UserUpdate
from app.services import auth_service

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register", status_code=201)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)) -> dict:
    user = await auth_service.register_user(db, payload.name, payload.email, payload.password)
    return success_response(UserOut.model_validate(user).model_dump(mode="json"))


@router.post("/login")
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> dict:
    user = await auth_service.authenticate_user(db, payload.email, payload.password)
    token = auth_service.issue_token(user)
    token_response = TokenResponse(access_token=token)
    return success_response(token_response.model_dump())


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)) -> dict:
    return success_response(UserOut.model_validate(current_user).model_dump(mode="json"))


@router.put("/me")
async def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    updated = await auth_service.update_user_profile(db, current_user, payload)
    return success_response(UserOut.model_validate(updated).model_dump(mode="json"))
