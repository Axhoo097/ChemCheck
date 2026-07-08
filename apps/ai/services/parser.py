import re
from typing import List

# Common prefixes/suffixes to strip when parsing ingredient lists
STOP_WORDS = {
    "ingredients", "ingredient", "contains", "may contain", "active ingredients",
    "inactive ingredients", "other ingredients", "and", "or", "etc"
}

def parse_ingredient_text(text: str) -> List[str]:
    """
    Parse raw ingredient text into a clean list of ingredient names.
    Handles comma/semicolon separation, parenthetical notes, INCI names, etc.
    """
    if not text:
        return []

    # Remove common header phrases
    text = re.sub(r'(?i)(active\s+)?ingredients?:?\s*', '', text)
    text = re.sub(r'(?i)contains?:?\s*', '', text)
    text = re.sub(r'(?i)may\s+contain:?\s*', '', text)

    # Split on commas and semicolons, keeping parenthetical groups together
    # First, temporarily replace content in parens
    text = re.sub(r'\([^)]*\)', '', text)  # Remove parenthetical subingredients

    # Split on comma or semicolon
    parts = re.split(r'[,;]', text)

    ingredients = []
    for part in parts:
        # Clean up each ingredient
        cleaned = part.strip()
        cleaned = re.sub(r'\s+', ' ', cleaned)                    # normalize whitespace
        cleaned = re.sub(r'[^\w\s\-/\.]', '', cleaned)            # remove special chars except - / .
        cleaned = cleaned.strip(' -/.')

        # Skip empties, numbers, and stop words
        if not cleaned or len(cleaned) < 2:
            continue
        if cleaned.lower() in STOP_WORDS:
            continue
        if re.match(r'^\d+(\.\d+)?(%|mg|g|ml)?$', cleaned):      # Skip pure numbers/quantities
            continue
        if len(cleaned) > 80:                                      # Skip overly long strings
            continue

        ingredients.append(cleaned)

    return ingredients
