from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from services.scorer import CHEMICAL_DB, find_chemical

router = APIRouter()

class RecommendationRequest(BaseModel):
    harmful_ingredients: List[str]
    category: Optional[str] = "skincare"
    skin_type: Optional[str] = None
    hair_type: Optional[str] = None
    allergies: Optional[List[str]] = []

SAFER_ALTERNATIVES_MAP = {
    "skincare": [
        {"name": "CeraVe Moisturizing Cream", "reason": "Fragrance-free, paraben-free, ceramide-rich formula"},
        {"name": "Neutrogena Hydro Boost", "reason": "Hyaluronic acid-based, non-comedogenic, alcohol-free"},
        {"name": "La Roche-Posay Toleriane", "reason": "Minimal ingredients, suitable for sensitive skin"},
        {"name": "Minimalist Moisturizer", "reason": "Clean label, no parabens or sulfates"},
        {"name": "Dot & Key Water Drench Cream", "reason": "Hyaluronic acid, fragrance-free"},
    ],
    "haircare": [
        {"name": "Mamaearth Onion Hair Oil", "reason": "Natural ingredients, no mineral oil or parabens"},
        {"name": "WOW Apple Cider Vinegar Shampoo", "reason": "Sulfate-free, paraben-free"},
        {"name": "Biotique Bio Kelp Shampoo", "reason": "Herbal formula, gentle surfactants"},
        {"name": "Khadi Natural Herbal Shampoo", "reason": "Ayurvedic, no synthetic preservatives"},
    ],
    "food": [
        {"name": "Organic/natural alternatives", "reason": "No artificial preservatives or colors"},
        {"name": "Homemade preparations", "reason": "Full control over ingredients"},
        {"name": "Certified organic products", "reason": "Regulated for harmful additives"},
    ],
    "grocery": [
        {"name": "Products with short ingredient lists", "reason": "Fewer additives and preservatives"},
        {"name": "Certified organic options", "reason": "Stricter standards for additives"},
    ]
}

@router.post("/suggest")
def suggest_alternatives(request: RecommendationRequest):
    """
    Based on a list of harmful ingredients found in a product,
    suggest safer alternatives and explain why.
    """
    # Find specific safer alternatives for detected harmful chemicals
    specific_tips = []
    for ingredient in request.harmful_ingredients[:10]:
        match = find_chemical(ingredient)
        if match and match.get("alternatives"):
            specific_tips.append({
                "instead_of": ingredient,
                "use": match["alternatives"],
                "reason": match.get("description", "")[:100]
            })

    # Get category-specific product recommendations
    category_lower = (request.category or "skincare").lower()
    alt_products = SAFER_ALTERNATIVES_MAP.get(category_lower, SAFER_ALTERNATIVES_MAP["skincare"])

    # Filter out products that contain user's allergens
    if request.allergies:
        alt_products = [p for p in alt_products if not any(
            allergen.lower() in p["name"].lower() for allergen in request.allergies
        )]

    # Tips based on skin/hair type
    tips = []
    if request.skin_type:
        skin_tips = {
            "OILY": "Look for oil-free, non-comedogenic products. Avoid heavy silicones and oils.",
            "DRY": "Prioritize ceramides, hyaluronic acid, and occlusive agents like squalane.",
            "SENSITIVE": "Choose fragrance-free, minimal ingredient lists. Avoid alcohols and essential oils.",
            "COMBINATION": "Use lightweight moisturizers. Avoid heavy occlusive products.",
            "NORMAL": "Most gentle products will work. Avoid unnecessary active ingredients."
        }
        if request.skin_type.upper() in skin_tips:
            tips.append(skin_tips[request.skin_type.upper()])

    return {
        "ingredient_alternatives": specific_tips,
        "recommended_products": alt_products[:3],
        "general_tips": tips,
        "summary": f"Found {len(specific_tips)} ingredient swaps. Avoid products containing: {', '.join(request.harmful_ingredients[:5])}."
    }

@router.get("/safe-ingredients")
def get_safe_ingredients(category: Optional[str] = "skincare"):
    """Returns a list of safe, recommended ingredients for a given category."""
    safe = [
        {"name": k, "description": v["description"], "category": v.get("category", "General")}
        for k, v in CHEMICAL_DB.items()
        if v.get("safe", False) and v.get("risk", 100) <= 15
    ]
    return {"safe_ingredients": safe, "count": len(safe)}
