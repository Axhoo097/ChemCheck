"""
Phase 9 — tests for GET /api/v1/products/{id}/explain

Two scenarios are tested:
  1. No OPENAI_API_KEY → endpoint returns 503 LLM_NOT_CONFIGURED
  2. With OPENAI_API_KEY present → openai.AsyncOpenAI is mocked to avoid a
     real network call; endpoint returns the explanation text

Both tests run against the standard in-memory SQLite test DB defined in
conftest.py, so no live Postgres or Redis is required.
"""
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ── helpers ──────────────────────────────────────────────────────────────────

async def _make_product(client, admin_token: str) -> str:
    """Create a product with one ingredient and return its ID."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    product_resp = await client.post(
        "/api/v1/products",
        json={"name": "Test Sunscreen", "category": "skincare"},
        headers=headers,
    )
    product_id = product_resp.json()["data"]["id"]

    ingredient_resp = await client.post(
        "/api/v1/ingredients",
        json={"name": "Oxybenzone", "risk_level": "high", "is_allergen": True, "evidence_level": "strong"},
        headers=headers,
    )
    ingredient_id = ingredient_resp.json()["data"]["id"]

    await client.post(
        f"/api/v1/products/{product_id}/ingredients",
        json={"ingredients": [{"ingredient_id": ingredient_id, "position": 0}]},
        headers=headers,
    )
    return product_id


# ── tests ────────────────────────────────────────────────────────────────────

async def test_explain_without_api_key_returns_503(client, admin_token):
    """
    When OPENAI_API_KEY is absent (or empty), /explain must return 503 with
    code LLM_NOT_CONFIGURED — never a 500.
    """
    product_id = await _make_product(client, admin_token)

    # Ensure no key is set for this test — conftest already blanks REDIS_URL;
    # we similarly blank the OpenAI key here.
    with patch.dict(os.environ, {"OPENAI_API_KEY": ""}, clear=False):
        resp = await client.get(f"/api/v1/products/{product_id}/explain")

    assert resp.status_code == 503
    body = resp.json()
    assert body["success"] is False
    assert body["error"]["code"] == "LLM_NOT_CONFIGURED"


async def test_explain_with_mocked_llm_returns_explanation(client, admin_token):
    """
    When an API key is present and the OpenAI client is mocked, /explain
    returns 200 with a non-empty explanation string plus the score and category.
    """
    product_id = await _make_product(client, admin_token)

    fake_explanation = (
        "This product received a ChemCheck score of 75 (Better category). "
        "It contains Oxybenzone, a high-risk allergen with strong evidence. "
        "Consider products without this ingredient if you have sensitive skin."
    )

    # Build a mock that mimics the openai response structure.
    mock_choice = MagicMock()
    mock_choice.message.content = fake_explanation

    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_response.usage = MagicMock(total_tokens=42)

    mock_client_instance = MagicMock()
    mock_client_instance.chat = MagicMock()
    mock_client_instance.chat.completions = MagicMock()
    mock_client_instance.chat.completions.create = AsyncMock(return_value=mock_response)

    with (
        patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test-key"}, clear=False),
        patch("openai.AsyncOpenAI", return_value=mock_client_instance),
    ):
        resp = await client.get(f"/api/v1/products/{product_id}/explain")

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["explanation"] == fake_explanation
    assert isinstance(data["score"], int)
    assert data["category"] in ("Best", "Better", "Worst")


async def test_explain_nonexistent_product_returns_404(client):
    """/explain must propagate the 404 from analyze_product before touching the LLM."""
    with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test-key"}, clear=False):
        resp = await client.get("/api/v1/products/00000000-0000-0000-0000-000000000000/explain")

    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "NOT_FOUND"


async def test_explain_is_personalized_with_auth(client, admin_token):
    """
    With a valid token for a user who has a matching sensitivity, the
    explanation endpoint uses the personalized (lower) score — confirmed by
    checking that a warning is mentioned in the explanation.
    """
    headers = {"Authorization": f"Bearer {admin_token}"}
    product_id = await _make_product(client, admin_token)

    # Find the Oxybenzone ingredient id.
    ingredients_resp = await client.get(f"/api/v1/products/{product_id}/ingredients")
    oxybenzone_id = ingredients_resp.json()["data"][0]["ingredient_id"]

    # Register a sensitive user and save the sensitivity.
    await client.post(
        "/api/v1/auth/register",
        json={"name": "Sensitive", "email": "sensitive@example.com", "password": "strongpass123"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "sensitive@example.com", "password": "strongpass123"},
    )
    user_token = login_resp.json()["data"]["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}

    await client.post(
        "/api/v1/me/sensitivities",
        json={"ingredient_id": oxybenzone_id},
        headers=user_headers,
    )

    # The LLM will receive a personalized score; mock it and capture the prompt.
    captured_prompt = {}

    async def fake_create(**kwargs):
        captured_prompt["messages"] = kwargs.get("messages", [])
        mock_choice = MagicMock()
        mock_choice.message.content = "Personalized explanation text."
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        mock_response.usage = MagicMock(total_tokens=10)
        return mock_response

    mock_client_instance = MagicMock()
    mock_client_instance.chat.completions.create = fake_create

    with (
        patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test-key"}, clear=False),
        patch("openai.AsyncOpenAI", return_value=mock_client_instance),
    ):
        resp = await client.get(f"/api/v1/products/{product_id}/explain", headers=user_headers)

    assert resp.status_code == 200
    # The prompt sent to the LLM should mention the personalized warning.
    prompt_text = captured_prompt["messages"][0]["content"]
    assert "Personalized warnings" in prompt_text or "sensitivity" in prompt_text.lower()
