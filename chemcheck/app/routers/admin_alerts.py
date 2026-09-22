from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_admin
from app.db.session import get_db
from app.schemas.alert import AlertCreate, AlertOut, AlertUpdate
from app.schemas.common import pagination_meta, success_response
from app.services import alert_service

router = APIRouter(prefix="/api/v1/admin/alerts", tags=["admin-alerts"])


@router.get("")
async def list_alerts(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
) -> dict:
    items, total_count = await alert_service.list_alerts(db, page, page_size)
    data = [AlertOut.model_validate(i).model_dump(mode="json") for i in items]
    return success_response(data, meta=pagination_meta(page, page_size, total_count))


@router.get("/{alert_id}")
async def get_alert(
    alert_id: str, db: AsyncSession = Depends(get_db), _admin=Depends(require_admin)
) -> dict:
    alert = await alert_service.get_alert(db, alert_id)
    return success_response(AlertOut.model_validate(alert).model_dump(mode="json"))


@router.post("", status_code=201)
async def create_alert(
    payload: AlertCreate, db: AsyncSession = Depends(get_db), _admin=Depends(require_admin)
) -> dict:
    alert = await alert_service.create_alert(db, payload)
    return success_response(AlertOut.model_validate(alert).model_dump(mode="json"))


@router.put("/{alert_id}")
async def update_alert(
    alert_id: str,
    payload: AlertUpdate,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
) -> dict:
    alert = await alert_service.update_alert(db, alert_id, payload)
    return success_response(AlertOut.model_validate(alert).model_dump(mode="json"))


@router.delete("/{alert_id}", status_code=204)
async def delete_alert(
    alert_id: str, db: AsyncSession = Depends(get_db), _admin=Depends(require_admin)
) -> None:
    await alert_service.delete_alert(db, alert_id)
