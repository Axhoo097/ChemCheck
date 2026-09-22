"""
Shared FastAPI dependencies for authentication/authorization.

get_current_user      -> 401 if no/invalid token (fully protected routes)
get_current_user_optional -> None if no/invalid token (personalization,
                              e.g. Phase 4's /analyze, works with or
                              without a token)
require_admin         -> 403 if the authenticated user isn't an admin
"""
from uuid import UUID

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ServiceError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User
from app.services import auth_service


async def get_current_user(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise ServiceError("NOT_AUTHENTICATED", "Missing or invalid Authorization header.", 401)

    token = authorization.split(" ", 1)[1].strip()
    subject = decode_access_token(token)
    if not subject:
        raise ServiceError("INVALID_TOKEN", "Token is invalid or has expired.", 401)

    try:
        user_id = UUID(subject)
    except ValueError:
        raise ServiceError("INVALID_TOKEN", "Token is invalid or has expired.", 401)

    user = await auth_service.get_user_by_id(db, user_id)
    if not user:
        raise ServiceError("USER_NOT_FOUND", "User for this token no longer exists.", 401)
    return user


async def get_current_user_optional(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if not authorization:
        return None
    try:
        return await get_current_user(authorization=authorization, db=db)
    except ServiceError:
        return None


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise ServiceError("FORBIDDEN", "Admin privileges required.", 403)
    return current_user
