"""
Phase 5's external fallback: when a scanned barcode isn't in our own
`products` table, check Open Food Facts (a free, open product database)
before giving up. Kept in its own function/module so it's a single,
obvious thing to mock in tests (Section 5) and a single place to change
if the external API is ever swapped out.
"""
import httpx

from app.core.errors import ServiceError
from app.core.logging import logger

OPEN_FOOD_FACTS_URL_TEMPLATE = "https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
EXTERNAL_LOOKUP_TIMEOUT_SECONDS = 5.0


async def lookup_barcode_externally(barcode: str) -> dict | None:
    """
    Returns a normalized {"name", "brand", "category"} dict if Open Food
    Facts has this barcode, or None if it doesn't. Raises ServiceError
    (502) if the external call itself fails/times out — that's a
    different situation from "not found" and the caller should be able
    to tell them apart.
    """
    url = OPEN_FOOD_FACTS_URL_TEMPLATE.format(barcode=barcode)

    try:
        async with httpx.AsyncClient(timeout=EXTERNAL_LOOKUP_TIMEOUT_SECONDS) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError:
        logger.exception("Open Food Facts lookup failed for barcode=%s", barcode)
        raise ServiceError(
            "EXTERNAL_LOOKUP_FAILED",
            "Could not reach the external product database right now. Please try again later.",
            status_code=502,
        )

    if data.get("status") != 1:
        return None

    product_data = data.get("product", {})
    categories = product_data.get("categories") or ""
    first_category = categories.split(",")[0].strip() if categories else "uncategorized"

    return {
        "name": product_data.get("product_name") or "Unknown product",
        "brand": product_data.get("brands"),
        "category": first_category or "uncategorized",
    }
