"""
Phase 5 — label scanning pipeline: OpenCV preprocess -> pytesseract OCR
-> split into candidate ingredient tokens -> rapidfuzz match against the
ingredients table.

Split into small functions on purpose (Section 5's testing strategy):
`run_ocr` is the only piece that touches the real Tesseract binary, so
it's the one thing tests mock out. Everything else (splitting, matching)
is plain logic tested directly and for real.
"""
import io
import re

import cv2
import numpy as np
import pytesseract
from PIL import Image
from rapidfuzz import fuzz, process
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ingredient import Ingredient

FUZZY_MATCH_SCORE_CUTOFF = 75  # 0-100; below this, a token is "unmatched" rather than a weak guess


def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """Grayscale + blur + Otsu threshold — standard cleanup that makes
    printed label text easier for Tesseract to read than the raw photo."""
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    array = np.array(image)
    gray = cv2.cvtColor(array, cv2.COLOR_RGB2GRAY)
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)
    _, thresholded = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return thresholded


def run_ocr(image_bytes: bytes) -> str:
    """The only function here that calls the real Tesseract binary — mock
    this one in tests rather than trying to fake image bytes that OCR
    cleanly (Section 5)."""
    processed = preprocess_image(image_bytes)
    return pytesseract.image_to_string(processed)


def split_ingredient_text(raw_text: str) -> list[str]:
    """Ingredient lists are printed comma-separated, sometimes wrapping
    across lines. Normalize newlines to commas, split, strip, and drop
    empty/noise tokens."""
    normalized = raw_text.replace("\n", ",")
    tokens = [t.strip(" .\t") for t in re.split(r"[,;]", normalized)]
    return [t for t in tokens if len(t) > 1]


async def match_ingredient_tokens(
    db: AsyncSession, tokens: list[str]
) -> tuple[list[dict], list[str]]:
    """
    For each OCR token, fuzzy-match against every known ingredient name.
    Returns (matched, unmatched):
      matched   -> [{"token", "ingredient_id", "name", "match_score"}, ...]
      unmatched -> ["raw token", ...] the admin/user can review manually.
    """
    all_ingredients = list((await db.execute(select(Ingredient))).scalars().all())
    if not all_ingredients:
        return [], tokens

    name_lookup = {ingredient.name.lower(): ingredient for ingredient in all_ingredients}
    choices = list(name_lookup.keys())

    matched: list[dict] = []
    unmatched: list[str] = []

    for token in tokens:
        result = process.extractOne(
            token.lower(), choices, scorer=fuzz.WRatio, score_cutoff=FUZZY_MATCH_SCORE_CUTOFF
        )
        if result is None:
            unmatched.append(token)
            continue

        matched_name, score, _ = result
        ingredient = name_lookup[matched_name]
        matched.append(
            {
                "token": token,
                "ingredient_id": str(ingredient.id),
                "name": ingredient.name,
                "match_score": round(score, 1),
            }
        )

    return matched, unmatched
