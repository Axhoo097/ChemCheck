import io

import barcode as barcode_lib
from barcode.writer import ImageWriter

from app.services.barcode import decode_barcode


def _generate_barcode_png(value: str) -> bytes:
    """Generates a real Code128 barcode image — a genuine round-trip
    check, not a mock, since pyzbar/zbar are actually installed here."""
    code128 = barcode_lib.get_barcode_class("code128")
    instance = code128(value, writer=ImageWriter())
    buf = io.BytesIO()
    instance.write(buf, options={"write_text": False})
    return buf.getvalue()


def test_decode_barcode_reads_a_real_generated_barcode():
    png_bytes = _generate_barcode_png("5901234123457")
    result = decode_barcode(png_bytes)
    assert result == "5901234123457"


def test_decode_barcode_returns_none_for_image_with_no_barcode():
    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (50, 50), color="white").save(buf, format="PNG")
    result = decode_barcode(buf.getvalue())
    assert result is None
