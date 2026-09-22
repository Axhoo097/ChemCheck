from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ServiceError
from app.core.validation import validate_image_upload
from app.db.session import get_db
from app.schemas.common import success_response
from app.schemas.product import ProductOut
from app.services import barcode as barcode_service
from app.services import ocr, openfoodfacts_service, product_service

router = APIRouter(prefix="/api/v1/scan", tags=["scan"])


@router.post("/label")
async def scan_label(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)) -> dict:
    # Section 8: validate BEFORE any processing — never run OCR on an
    # unvalidated upload, since that wastes CPU on garbage input and
    # widens the attack surface to whatever Tesseract/OpenCV would do
    # with a malicious or oversized file.
    contents = await validate_image_upload(file)

    raw_text = ocr.run_ocr(contents)
    tokens = ocr.split_ingredient_text(raw_text)
    matched, unmatched = await ocr.match_ingredient_tokens(db, tokens)

    return success_response({"matched": matched, "unmatched": unmatched, "raw_text": raw_text})


@router.post("/barcode")
async def scan_barcode(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)) -> dict:
    contents = await validate_image_upload(file)

    code = barcode_service.decode_barcode(contents)
    if not code:
        raise ServiceError(
            "BARCODE_NOT_DETECTED", "No barcode could be detected in the image.", status_code=400
        )

    # 1. Check our own catalog first.
    local_product = await product_service.get_product_by_barcode(db, code)
    if local_product:
        return success_response(
            {
                "barcode": code,
                "source": "local",
                "product": ProductOut.model_validate(local_product).model_dump(mode="json"),
            }
        )

    # 2. Fall back to Open Food Facts (external API call, 502 on failure per openfoodfacts_service).
    external_product = await openfoodfacts_service.lookup_barcode_externally(code)
    if external_product is None:
        raise ServiceError(
            "PRODUCT_NOT_FOUND", f"No product found for barcode {code}.", status_code=404
        )

    return success_response({"barcode": code, "source": "openfoodfacts", "product": external_product})
