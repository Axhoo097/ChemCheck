"""
Phase 2 seed script. Loads a curated set of real cosmetic/food/personal-
care ingredients so search and scoring have something real to work with.

Usage:
    python -m scripts.seed_ingredients
"""
import asyncio

from sqlalchemy import select

from app.core.logging import logger, setup_logging
from app.db.session import AsyncSessionLocal
from app.models.ingredient import EvidenceLevel, Ingredient, RiskLevel

L, M, H = RiskLevel.low, RiskLevel.medium, RiskLevel.high
STRONG, MODERATE, LIMITED = EvidenceLevel.strong, EvidenceLevel.moderate, EvidenceLevel.limited

# name, function, risk_level, is_allergen, evidence_level, description
INGREDIENTS: list[tuple[str, str, RiskLevel, bool, EvidenceLevel, str]] = [
    ("Water", "solvent", L, False, STRONG, "The base of most liquid formulations; carries other ingredients."),
    ("Sodium Laureth Sulfate", "surfactant/cleansing agent", M, False, MODERATE,
     "Creates foam and removes oil/dirt; can be drying with frequent use on sensitive skin."),
    ("Sodium Lauryl Sulfate", "surfactant/cleansing agent", M, False, MODERATE,
     "A stronger foaming cleanser than SLES; more likely to strip natural oils."),
    ("Cocamidopropyl Betaine", "surfactant, foam booster", M, True, MODERATE,
     "A milder co-surfactant derived from coconut oil; a known contact allergen for some users."),
    ("Glycerin", "humectant", L, False, STRONG, "Draws moisture into the skin/hair; widely considered safe and effective."),
    ("Fragrance (Parfum)", "scenting agent", M, True, LIMITED,
     "An umbrella term for a mixture of scent chemicals; common trigger for sensitization/irritation."),
    ("Phenoxyethanol", "preservative", M, False, MODERATE,
     "Prevents microbial growth; generally considered safe at regulated concentrations (<1%)."),
    ("Methylparaben", "preservative", M, False, MODERATE,
     "A widely used preservative; subject to ongoing regulatory review over endocrine-disruption concerns."),
    ("Propylparaben", "preservative", M, False, LIMITED,
     "Similar to methylparaben; some evidence of weak estrogenic activity at high doses."),
    ("Citric Acid", "pH adjuster, preservative", L, False, STRONG, "Naturally derived acid used to balance formula pH."),
    ("Sodium Benzoate", "preservative", L, False, STRONG, "Common food/cosmetic preservative; safe at approved levels."),
    ("Potassium Sorbate", "preservative", L, False, STRONG, "Inhibits mold and yeast growth; well-studied and low-risk."),
    ("Salicylic Acid", "exfoliant (BHA)", M, False, STRONG,
     "Penetrates pores to clear dead skin/oil; can cause irritation or sun sensitivity."),
    ("Retinol", "anti-aging, cell turnover", M, False, STRONG,
     "A vitamin A derivative that speeds cell turnover; commonly causes dryness/irritation initially."),
    ("Niacinamide", "skin barrier support", L, False, STRONG, "Vitamin B3 derivative; well tolerated, supports barrier function."),
    ("Hyaluronic Acid", "humectant", L, False, STRONG, "Holds many times its weight in water; widely used, low irritation risk."),
    ("Titanium Dioxide", "UV filter, pigment", L, False, STRONG, "A mineral sunscreen filter; sits on the skin rather than absorbing."),
    ("Zinc Oxide", "UV filter, soothing agent", L, False, STRONG, "Broad-spectrum mineral sunscreen filter; also used to soothe irritation."),
    ("Octinoxate", "UV filter (chemical)", M, False, MODERATE,
     "Absorbs UVB rays; some environmental/hormonal-activity concerns raised in studies."),
    ("Oxybenzone", "UV filter (chemical)", M, True, MODERATE,
     "Broad-spectrum chemical sunscreen filter; a known contact allergen and coral-reef concern."),
    ("Avobenzone", "UV filter (chemical)", L, False, MODERATE, "Absorbs UVA rays; often paired with stabilizers for photostability."),
    ("Dimethicone", "emollient, skin conditioner", L, False, MODERATE,
     "A silicone that smooths texture and locks in moisture; can feel occlusive on some skin types."),
    ("Cyclopentasiloxane", "emollient, texture enhancer", L, False, LIMITED, "A lightweight silicone that evaporates, leaving a silky feel."),
    ("Sodium Chloride", "thickener (in cleansers)", L, False, STRONG, "Common table salt; used to adjust viscosity in liquid formulas."),
    ("Xanthan Gum", "thickener, stabilizer", L, False, STRONG, "A natural polysaccharide that thickens and stabilizes emulsions."),
    ("Tocopherol (Vitamin E)", "antioxidant", L, False, STRONG, "Protects formulas and skin from oxidative damage."),
    ("Ascorbic Acid (Vitamin C)", "antioxidant, brightening", M, False, STRONG,
     "A potent antioxidant that can brighten skin; unstable and can irritate at high concentrations."),
    ("Aloe Vera Extract", "soothing agent", L, False, MODERATE, "Traditionally used to calm and hydrate irritated skin."),
    ("Panthenol", "humectant, soothing agent", L, False, STRONG, "Pro-vitamin B5; hydrates and helps calm irritation."),
    ("Allantoin", "soothing agent", L, False, MODERATE, "Softens skin and promotes a calming, non-irritating feel."),
    ("Menthol", "cooling agent", M, True, LIMITED, "Provides a cooling sensation; can irritate sensitive or broken skin."),
    ("Formaldehyde", "preservative (legacy)", H, True, STRONG,
     "A known human carcinogen at high/chronic exposure; restricted or banned in many cosmetic markets."),
    ("DMDM Hydantoin", "formaldehyde-releasing preservative", H, True, MODERATE,
     "Slowly releases small amounts of formaldehyde as a preservation mechanism; a common sensitizer."),
    ("Triclosan", "antibacterial agent", H, False, MODERATE,
     "An antimicrobial linked to hormone-disruption concerns; banned in some hand-soap formulations."),
    ("BHA (Butylated Hydroxyanisole)", "antioxidant/preservative", M, False, LIMITED,
     "Prevents fats from spoiling; classified by some bodies as a possible carcinogen at high doses."),
    ("BHT (Butylated Hydroxytoluene)", "antioxidant/preservative", M, False, LIMITED,
     "Similar use to BHA; considered low-risk at typical cosmetic/food concentrations."),
    ("Sodium Nitrite", "food preservative, color fixative", H, False, MODERATE,
     "Used in cured meats; can form nitrosamines (linked to cancer risk) under certain cooking conditions."),
    ("Monosodium Glutamate (MSG)", "flavor enhancer", L, False, STRONG,
     "A flavor enhancer; large-scale studies have not confirmed widely-feared adverse effects for most people."),
    ("High Fructose Corn Syrup", "sweetener", M, False, MODERATE,
     "A common sweetener linked in observational studies to excess sugar intake concerns."),
    ("Aspartame", "artificial sweetener", M, False, MODERATE,
     "A low-calorie sweetener; safety is well-studied but remains a subject of public debate."),
    ("Sucralose", "artificial sweetener", L, False, MODERATE, "A calorie-free sweetener generally regarded as safe by major regulators."),
    ("Caffeine", "stimulant, active ingredient", M, False, STRONG,
     "A stimulant found naturally in coffee/tea/cacao; also used topically to reduce puffiness."),
    ("Tartrazine (Yellow 5)", "food/cosmetic colorant", M, True, MODERATE,
     "A synthetic dye linked to hypersensitivity reactions in a small subset of people."),
    ("Red 40 (Allura Red)", "food/cosmetic colorant", M, True, LIMITED,
     "A widely used synthetic dye; some studies suggest a link to hyperactivity in sensitive children."),
    ("Sunset Yellow (Yellow 6)", "food/cosmetic colorant", M, True, LIMITED, "A synthetic dye associated with occasional allergic-type reactions."),
    ("Sulfur Dioxide", "preservative (dried fruit/wine)", M, True, MODERATE,
     "Prevents browning/spoilage; can trigger asthma-like reactions in sulfite-sensitive individuals."),
    ("Potassium Bromate", "flour treatment agent", H, False, LIMITED,
     "Strengthens dough; classified as a possible carcinogen and banned in several countries."),
    ("Partially Hydrogenated Oil (Trans Fat)", "texture/shelf-life agent", H, False, STRONG,
     "Raises LDL cholesterol and lowers HDL; strongly linked to cardiovascular risk."),
    ("Palm Oil", "emollient / cooking oil", L, False, MODERATE, "A widely used vegetable oil; nutritional concerns relate mainly to saturated fat content."),
    ("Coconut Oil", "emollient", L, False, MODERATE, "A rich plant oil used for moisturizing; can be comedogenic (pore-clogging) for some skin types."),
    ("Shea Butter", "emollient", L, False, MODERATE, "A rich, naturally-derived moisturizer; low irritation potential for most users."),
    ("Jojoba Oil", "emollient", L, False, MODERATE, "Closely resembles skin's natural sebum; well tolerated by most skin types."),
    ("Argan Oil", "emollient", L, False, LIMITED, "A lightweight plant oil rich in fatty acids and vitamin E."),
    ("Lanolin", "emollient", M, True, MODERATE, "Derived from sheep's wool; a known contact allergen for a minority of users."),
    ("Beeswax", "emulsifier, thickener", L, True, MODERATE, "A natural wax that thickens formulas; rarely, can trigger allergic reactions."),
    ("Cetyl Alcohol", "emollient, thickener", L, False, STRONG,
     "A fatty alcohol (not drying like ethanol) that softens and thickens formulas."),
    ("Stearyl Alcohol", "emollient, thickener", L, False, STRONG, "Similar to cetyl alcohol; adds a smooth, non-greasy texture."),
    ("Isopropyl Alcohol", "solvent, astringent", M, False, MODERATE,
     "Evaporates quickly and can be drying/irritating with repeated use on skin."),
    ("Talc", "absorbent, texture agent", M, False, LIMITED,
     "Used in powders for silkiness; asbestos-free talc is considered low-risk, but sourcing purity matters."),
    ("Mica", "shimmer/pigment", L, False, LIMITED, "A mineral used for shimmer in cosmetics; low irritation risk."),
    ("Silica", "absorbent, anti-caking agent", L, False, STRONG, "Absorbs excess oil and prevents clumping in powder products."),
    ("Kaolin Clay", "absorbent, mask ingredient", L, False, MODERATE, "A gentle clay that absorbs excess oil without over-drying."),
    ("Benzoyl Peroxide", "acne treatment", M, False, STRONG,
     "Kills acne-causing bacteria; can bleach fabric and cause dryness/irritation."),
    ("Hydroquinone", "skin-lightening agent", H, False, MODERATE,
     "A potent depigmenting agent; regulated or restricted in several countries due to long-term safety concerns."),
    ("Glycolic Acid", "exfoliant (AHA)", M, False, STRONG,
     "An alpha-hydroxy acid that exfoliates the skin surface; increases sun sensitivity."),
    ("Lactic Acid", "exfoliant (AHA), humectant", L, False, STRONG, "A gentler AHA than glycolic acid; also hydrates the skin."),
    ("Urea", "humectant, exfoliant", L, False, STRONG, "Softens and hydrates very dry or rough skin at higher concentrations."),

    # --- Haircare-specific ---
    ("Sodium Cocoyl Isethionate", "gentle surfactant", L, False, MODERATE,
     "A mild coconut-derived cleanser common in sulfate-free shampoos and syndet bars."),
    ("Polyquaternium-7", "conditioning polymer", L, False, LIMITED, "A film-forming polymer that detangles hair and reduces static."),
    ("Behentrimonium Chloride", "hair conditioning agent", M, True, LIMITED,
     "A quaternary ammonium compound that smooths hair; can irritate the scalp in sensitive users."),
    ("Biotin", "hair/nail conditioning vitamin", L, False, LIMITED, "Vitamin B7; commonly added to haircare though topical efficacy evidence is limited."),
    ("Hydrolyzed Keratin", "hair repair protein", L, False, LIMITED, "Small protein fragments that temporarily fill damaged areas of the hair shaft."),
    ("Zinc Pyrithione", "anti-dandruff agent", M, False, STRONG, "An antifungal/antibacterial agent that controls scalp flaking; can irritate sensitive scalps."),
    ("Selenium Sulfide", "anti-dandruff agent", M, False, STRONG, "Reduces the yeast associated with dandruff; regulated as an active drug ingredient in many markets."),
    ("Ketoconazole", "antifungal (anti-dandruff)", M, False, STRONG, "An antifungal used in medicated shampoos to treat seborrheic dermatitis/dandruff."),
    ("Coal Tar", "anti-dandruff, anti-psoriasis agent", H, False, MODERATE,
     "Slows skin cell turnover; effective for scalp conditions but carries carcinogenicity concerns with prolonged, high exposure."),
    ("Minoxidil", "hair growth active", M, False, STRONG, "A vasodilator applied topically to stimulate hair regrowth; can cause scalp irritation."),

    # --- Additional skincare actives ---
    ("Ceramide NP", "skin barrier lipid", L, False, STRONG, "A lipid naturally found in skin; replenishes the barrier and reduces moisture loss."),
    ("Squalane", "emollient", L, False, STRONG, "A stable, lightweight oil that mimics skin's natural sebum without a greasy feel."),
    ("Bisabolol", "soothing agent", L, False, MODERATE, "Derived from chamomile; calms irritation and reduces redness."),
    ("Centella Asiatica Extract", "soothing, healing agent", L, False, MODERATE, "A botanical extract traditionally used to calm irritation and support skin repair."),
    ("Green Tea Extract", "antioxidant", L, False, MODERATE, "Rich in polyphenols; helps neutralize free-radical damage."),
    ("Witch Hazel Extract", "astringent", M, False, LIMITED, "Tightens the appearance of pores; can be drying with frequent use due to its tannin content."),
    ("Isopropyl Myristate", "emollient", M, False, LIMITED, "A lightweight oil substitute; known to be comedogenic (pore-clogging) for acne-prone skin."),
    ("Propylene Glycol", "humectant, solvent", M, True, MODERATE, "Helps other ingredients penetrate and stay moist; an occasional contact irritant/allergen."),
    ("Butylene Glycol", "humectant, solvent", L, False, MODERATE, "Similar function to propylene glycol; generally better tolerated."),
    ("Disodium EDTA", "chelating agent", L, False, MODERATE, "Binds trace metals to keep formulas stable; not intended to affect skin/hair directly."),
    ("Carbomer", "thickener, gel former", L, False, STRONG, "A synthetic polymer that creates the gel texture in many lightweight formulas."),
    ("Polysorbate 20", "emulsifier", L, False, MODERATE, "Helps blend oil and water phases; used at low concentrations in most formulas."),
    ("Cetearyl Alcohol", "emollient, thickener", L, False, STRONG, "A blend of fatty alcohols; softens skin/hair and stabilizes emulsions, not drying like ethanol."),
    ("Sodium Hyaluronate", "humectant", L, False, STRONG, "The salt form of hyaluronic acid; smaller molecule size allows deeper penetration."),
    ("Azelaic Acid", "acne/rosacea treatment", M, False, STRONG, "Reduces inflammation and unclogs pores; can cause mild tingling on application."),
    ("Coenzyme Q10", "antioxidant", L, False, MODERATE, "Naturally occurring in skin cells; supports collagen production and fights oxidative stress."),
    ("Alpha Arbutin", "skin-brightening agent", L, False, MODERATE, "Inhibits melanin production to even skin tone; considered gentler than hydroquinone."),
    ("Kojic Acid", "skin-brightening agent", M, True, MODERATE, "A fungal-derived brightening agent; can cause contact irritation in some users."),

    # --- Food additives ---
    ("Carrageenan", "thickener, stabilizer", M, False, LIMITED, "A seaweed-derived thickener; some research has raised gut-inflammation questions, though regulators consider it safe."),
    ("Guar Gum", "thickener, stabilizer", L, False, STRONG, "A natural fiber-based thickener used across food and cosmetic products."),
    ("Sodium Metabisulfite", "preservative, antioxidant", M, True, MODERATE,
     "Prevents browning and spoilage; can trigger reactions in people with sulfite sensitivity or asthma."),
    ("Erythritol", "sugar alcohol sweetener", L, False, MODERATE, "A low-calorie sweetener generally well tolerated, though large amounts can cause GI discomfort."),
    ("Carmine (Cochineal Extract)", "natural red colorant", M, True, MODERATE,
     "Derived from insects; a well-documented allergen for a small subset of sensitive individuals."),
]


async def seed() -> None:
    setup_logging()
    created, skipped = 0, 0

    async with AsyncSessionLocal() as db:
        for name, function, risk_level, is_allergen, evidence_level, description in INGREDIENTS:
            existing = (await db.execute(select(Ingredient).where(Ingredient.name == name))).scalar_one_or_none()
            if existing:
                skipped += 1
                continue

            db.add(
                Ingredient(
                    name=name,
                    function=function,
                    risk_level=risk_level,
                    is_allergen=is_allergen,
                    evidence_level=evidence_level,
                    description=description,
                )
            )
            created += 1

        await db.commit()

    logger.info("Seed complete: %s created, %s already existed (skipped).", created, skipped)


if __name__ == "__main__":
    asyncio.run(seed())
