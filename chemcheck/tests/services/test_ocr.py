from app.models.ingredient import Ingredient
from app.services.ocr import match_ingredient_tokens, split_ingredient_text


def test_split_handles_comma_separated_list():
    tokens = split_ingredient_text("Water, Glycerin, Fragrance, Citric Acid")
    assert tokens == ["Water", "Glycerin", "Fragrance", "Citric Acid"]


def test_split_normalizes_newlines_to_separators():
    tokens = split_ingredient_text("Water,\nGlycerin,\nFragrance")
    assert tokens == ["Water", "Glycerin", "Fragrance"]


def test_split_drops_empty_and_single_char_noise():
    tokens = split_ingredient_text("Water,, , Glycerin, . ,X")
    assert tokens == ["Water", "Glycerin"]


def test_split_strips_trailing_periods_and_whitespace():
    tokens = split_ingredient_text("Water. , Glycerin . ")
    assert tokens == ["Water", "Glycerin"]


async def test_match_ingredient_tokens_finds_exact_and_close_matches(db_session):
    db_session.add(Ingredient(name="Sodium Laureth Sulfate", risk_level="medium"))
    db_session.add(Ingredient(name="Glycerin", risk_level="low"))
    await db_session.commit()

    matched, unmatched = await match_ingredient_tokens(
        db_session, ["Sodium Laureth Sulfate", "Glyserin", "Unobtainium"]
    )

    matched_names = {item["name"] for item in matched}
    assert "Sodium Laureth Sulfate" in matched_names
    assert "Glycerin" in matched_names  # matched despite the OCR typo
    assert "Unobtainium" in unmatched


async def test_match_ingredient_tokens_with_empty_catalog_returns_all_unmatched(db_session):
    matched, unmatched = await match_ingredient_tokens(db_session, ["Water", "Glycerin"])
    assert matched == []
    assert unmatched == ["Water", "Glycerin"]


async def test_match_ingredient_tokens_with_no_tokens_returns_empty(db_session):
    db_session.add(Ingredient(name="Water", risk_level="low"))
    await db_session.commit()

    matched, unmatched = await match_ingredient_tokens(db_session, [])
    assert matched == []
    assert unmatched == []
