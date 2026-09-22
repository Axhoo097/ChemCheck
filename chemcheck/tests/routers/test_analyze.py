async def _make_product_with_ingredients(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    product_resp = await client.post(
        "/api/v1/products", json={"name": "Test Shampoo", "category": "shampoo"}, headers=headers
    )
    product_id = product_resp.json()["data"]["id"]

    low_resp = await client.post(
        "/api/v1/ingredients",
        json={"name": "Water", "risk_level": "low", "evidence_level": "strong"},
        headers=headers,
    )
    high_resp = await client.post(
        "/api/v1/ingredients",
        json={"name": "Formaldehyde", "risk_level": "high", "is_allergen": True, "evidence_level": "strong"},
        headers=headers,
    )

    await client.post(
        f"/api/v1/products/{product_id}/ingredients",
        json={
            "ingredients": [
                {"ingredient_id": low_resp.json()["data"]["id"], "position": 0},
                {"ingredient_id": high_resp.json()["data"]["id"], "position": 1},
            ]
        },
        headers=headers,
    )
    return product_id, headers


async def test_analyze_product_with_no_ingredients_scores_100(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    product_resp = await client.post(
        "/api/v1/products", json={"name": "Plain Water", "category": "misc"}, headers=headers
    )
    product_id = product_resp.json()["data"]["id"]

    resp = await client.get(f"/api/v1/products/{product_id}/analyze")
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert body["score"] == 100
    assert body["category"] == "Best"
    assert body["breakdown"] == []


async def test_analyze_product_with_risky_ingredient_reduces_score(client, admin_token):
    product_id, _headers = await _make_product_with_ingredients(client, admin_token)

    resp = await client.get(f"/api/v1/products/{product_id}/analyze")
    assert resp.status_code == 200
    body = resp.json()["data"]

    # 20 (high, strong) + 5 (allergen) = 25 deducted -> 75
    assert body["score"] == 75
    assert body["category"] == "Better"
    assert body["concern_count"] == 1
    assert body["allergen_count"] == 1
    assert len(body["breakdown"]) == 2


async def test_analyze_does_not_require_authentication(client, admin_token):
    product_id, _headers = await _make_product_with_ingredients(client, admin_token)
    # No Authorization header at all — analyze is public in Phase 3.
    resp = await client.get(f"/api/v1/products/{product_id}/analyze")
    assert resp.status_code == 200


async def test_analyze_nonexistent_product_returns_404(client):
    resp = await client.get("/api/v1/products/00000000-0000-0000-0000-000000000000/analyze")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "NOT_FOUND"


async def _register_and_login(client, email, password="strongpass123"):
    await client.post("/api/v1/auth/register", json={"name": "User", "email": email, "password": password})
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return resp.json()["data"]["access_token"]


async def test_analyze_with_matching_sensitivity_adds_warning_and_lowers_score(client, admin_token):
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product_id, _ = await _make_product_with_ingredients(client, admin_token)

    # Find the Formaldehyde ingredient id we just attached.
    ingredients_resp = await client.get(f"/api/v1/products/{product_id}/ingredients")
    formaldehyde_id = next(
        item["ingredient_id"] for item in ingredients_resp.json()["data"] if item["name"] == "Formaldehyde"
    )

    sensitive_user_token = await _register_and_login(client, "sensitive-user@example.com")
    sensitive_headers = {"Authorization": f"Bearer {sensitive_user_token}"}
    add_resp = await client.post(
        "/api/v1/me/sensitivities",
        json={"ingredient_id": formaldehyde_id, "severity_note": "Breaks me out"},
        headers=sensitive_headers,
    )
    assert add_resp.status_code == 201

    base_resp = await client.get(f"/api/v1/products/{product_id}/analyze")
    base_score = base_resp.json()["data"]["score"]

    personalized_resp = await client.get(f"/api/v1/products/{product_id}/analyze", headers=sensitive_headers)
    personalized_data = personalized_resp.json()["data"]

    assert personalized_data["score"] < base_score
    assert personalized_data["personalized"] is True
    assert len(personalized_data["warnings"]) == 1
    assert "Formaldehyde" in personalized_data["warnings"][0]


async def test_analyze_for_user_without_matching_sensitivity_has_no_warnings(client, admin_token):
    product_id, _ = await _make_product_with_ingredients(client, admin_token)

    other_user_token = await _register_and_login(client, "other-user@example.com")
    other_headers = {"Authorization": f"Bearer {other_user_token}"}

    resp = await client.get(f"/api/v1/products/{product_id}/analyze", headers=other_headers)
    data = resp.json()["data"]
    assert data["warnings"] == []
    assert data["personalized"] is True


async def test_analyze_two_users_same_product_different_results(client, admin_token):
    product_id, _ = await _make_product_with_ingredients(client, admin_token)
    ingredients_resp = await client.get(f"/api/v1/products/{product_id}/ingredients")
    formaldehyde_id = next(
        item["ingredient_id"] for item in ingredients_resp.json()["data"] if item["name"] == "Formaldehyde"
    )

    user_a_token = await _register_and_login(client, "user-a@example.com")
    user_b_token = await _register_and_login(client, "user-b@example.com")

    await client.post(
        "/api/v1/me/sensitivities",
        json={"ingredient_id": formaldehyde_id},
        headers={"Authorization": f"Bearer {user_a_token}"},
    )

    resp_a = await client.get(
        f"/api/v1/products/{product_id}/analyze", headers={"Authorization": f"Bearer {user_a_token}"}
    )
    resp_b = await client.get(
        f"/api/v1/products/{product_id}/analyze", headers={"Authorization": f"Bearer {user_b_token}"}
    )

    assert resp_a.json()["data"]["score"] != resp_b.json()["data"]["score"]
    assert len(resp_a.json()["data"]["warnings"]) == 1
    assert resp_b.json()["data"]["warnings"] == []


async def test_analyze_reflects_past_reaction_even_without_saved_sensitivity(client, admin_token):
    """Phase 7 extension: /analyze should warn about an ingredient the
    user has reacted to before, even if they never explicitly saved it
    as a sensitivity."""
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    fragrance_resp = await client.post(
        "/api/v1/ingredients", json={"name": "Parfum", "risk_level": "low"}, headers=admin_headers
    )
    fragrance_id = fragrance_resp.json()["data"]["id"]

    reacted_product_resp = await client.post(
        "/api/v1/products", json={"name": "Old Lotion", "category": "lotion"}, headers=admin_headers
    )
    reacted_product_id = reacted_product_resp.json()["data"]["id"]
    await client.post(
        f"/api/v1/products/{reacted_product_id}/ingredients",
        json={"ingredients": [{"ingredient_id": fragrance_id, "position": 0}]},
        headers=admin_headers,
    )

    new_product_resp = await client.post(
        "/api/v1/products", json={"name": "New Lotion", "category": "lotion"}, headers=admin_headers
    )
    new_product_id = new_product_resp.json()["data"]["id"]
    await client.post(
        f"/api/v1/products/{new_product_id}/ingredients",
        json={"ingredients": [{"ingredient_id": fragrance_id, "position": 0}]},
        headers=admin_headers,
    )

    user_token = await _register_and_login(client, "reaction-history@example.com")
    user_headers = {"Authorization": f"Bearer {user_token}"}

    # Log a reaction to the OLD product — no sensitivity saved.
    await client.post(
        "/api/v1/me/reactions",
        json={
            "product_id": reacted_product_id,
            "reaction_type": "redness",
            "severity": "mild",
            "occurred_on": "2026-09-01",
        },
        headers=user_headers,
    )

    # Analyzing the NEW product (different product, same ingredient) should warn.
    resp = await client.get(f"/api/v1/products/{new_product_id}/analyze", headers=user_headers)
    data = resp.json()["data"]
    assert data["personalized"] is True
    assert len(data["warnings"]) == 1
    assert "Parfum" in data["warnings"][0]
    assert "reacted to" in data["warnings"][0]
