"""
Section 8 — validate before processing, never after. Every scan
endpoint calls this first, so a bad upload is rejected before it ever
reaches OpenCV/Tesseract/pyzbar. Type is verified from the actual image
bytes (Pillow tries to decode it), not from the filename or the
browser-supplied Content-Type, since both of those can be spoofed or
simply wrong.
"""
import io

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError

from app.core.errors import ServiceError

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG"}  # Pillow's names for image/jpeg, image/png


async def validate_image_upload(file: UploadFile) -> bytes:
    contents = await file.read()

    if len(contents) == 0:
        raise ServiceError("EMPTY_FILE", "The uploaded file is empty.", status_code=400)

    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise ServiceError(
            "FILE_TOO_LARGE",
            f"File exceeds the {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB upload limit.",
            status_code=400,
        )

    try:
        image = Image.open(io.BytesIO(contents))
        image.verify()  # raises if the bytes aren't a valid image
        detected_format = image.format
    except (UnidentifiedImageError, OSError):
        raise ServiceError(
            "UNSUPPORTED_FILE_TYPE", "The file is not a valid image.", status_code=400
        )

    if detected_format not in ALLOWED_IMAGE_FORMATS:
        raise ServiceError(
            "UNSUPPORTED_FILE_TYPE",
            f"Unsupported image type '{detected_format}'. Only JPEG and PNG are accepted.",
            status_code=400,
        )

    return contents
