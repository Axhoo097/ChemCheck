from fastapi import APIRouter

from app.schemas.common import success_response

router = APIRouter(prefix="/api/v1", tags=["health"])


@router.get("/health")
async def health_check() -> dict:
    return success_response({"status": "ok"})
