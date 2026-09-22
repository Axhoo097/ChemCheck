import io

import pytest
from fastapi import UploadFile
from PIL import Image

from app.core.errors import ServiceError
from app.core.validation import MAX_FILE_SIZE_BYTES, validate_image_upload


def _make_png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (10, 10), color="white").save(buf, format="PNG")
    return buf.getvalue()


def _make_jpeg_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (10, 10), color="white").save(buf, format="JPEG")
    return buf.getvalue()


def _upload_file(contents: bytes, filename: str = "upload.png") -> UploadFile:
    return UploadFile(file=io.BytesIO(contents), filename=filename)


async def test_valid_png_passes_validation():
    contents = await validate_image_upload(_upload_file(_make_png_bytes()))
    assert len(contents) > 0


async def test_valid_jpeg_passes_validation():
    contents = await validate_image_upload(_upload_file(_make_jpeg_bytes(), "upload.jpg"))
    assert len(contents) > 0


async def test_empty_file_is_rejected():
    with pytest.raises(ServiceError) as exc_info:
        await validate_image_upload(_upload_file(b""))
    assert exc_info.value.code == "EMPTY_FILE"
    assert exc_info.value.status_code == 400


async def test_oversized_file_is_rejected():
    oversized = b"\x00" * (MAX_FILE_SIZE_BYTES + 1)
    with pytest.raises(ServiceError) as exc_info:
        await validate_image_upload(_upload_file(oversized))
    assert exc_info.value.code == "FILE_TOO_LARGE"
    assert exc_info.value.status_code == 400


async def test_non_image_file_is_rejected_even_with_image_filename():
    # A .png filename doesn't make it a real image — must fail on content, not extension.
    fake_bytes = b"this is definitely not image data"
    with pytest.raises(ServiceError) as exc_info:
        await validate_image_upload(_upload_file(fake_bytes, "totally-a-real.png"))
    assert exc_info.value.code == "UNSUPPORTED_FILE_TYPE"


async def test_unsupported_image_format_is_rejected():
    buf = io.BytesIO()
    Image.new("RGB", (10, 10), color="white").save(buf, format="BMP")
    with pytest.raises(ServiceError) as exc_info:
        await validate_image_upload(_upload_file(buf.getvalue(), "upload.bmp"))
    assert exc_info.value.code == "UNSUPPORTED_FILE_TYPE"
