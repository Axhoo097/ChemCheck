import io

from PIL import Image
from pyzbar.pyzbar import decode as zbar_decode


def decode_barcode(image_bytes: bytes) -> str | None:
    """Returns the first decoded barcode value, or None if none found."""
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    results = zbar_decode(image)
    if not results:
        return None
    return results[0].data.decode("utf-8")
