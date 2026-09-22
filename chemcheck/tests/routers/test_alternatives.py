async def _create_ingredient(client, headers, name, risk_level="low", is_allergen=False):
    resp = await client.post(
        "/api/v1/ingredients",
        json={"name": name, "risk_level": risk_level, "is_allergen": is_allergen},
        headers=headers,
    )
    return resp.json()["data"]["id"]


async def _create_product_with_ingredients(client, headers, name, category, ingredient_ids):
    resp = await client.post("/api/v1/products", json={"name": name, "category": category}, headers=headers)
    product_id = resp.json()["data"]["id"]
    if ingredient_ids:
        await client.post(
            f"/api/v1/products/{product_id}/ingredients",
            json={"ingredients": [{"ingredient_id": iid, "position": i} for i, iid in enumerate(ingredient_ids)]},
            headers=headers,
        )
    return product_id


async def test_alternatives_orders_best_score_first(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    high_risk = await _create_ingredient(client, headers, "High Risk Chem", risk_level="high")
    medium_risk = await _create_ingredient(client, headers, "Medium Risk Chem", risk_level="medium")

    worst_product = await _create_product_with_ingredients(
        client, headers, "Worst Shampoo", "shampoo", [high_risk]
    )
    better_product = await _create_product_with_ingredients(
        client, headers, "Better Shampoo", "shampoo", [medium_risk]
    )
    best_product = await _create_product_with_ingredients(client, headers, "Best Shampoo", "shampoo", [])

    resp = await client.get(f"/api/v1/products/{worst_product}/alternatives")
    assert resp.status_code == 200
    names_in_order = [item["product"]["name"] for item in resp.json()["data"]]

    # Both alternatives should outrank the excluded worst_product itself,
    # and Best (score 100, no ingredients) should come before Better
    # (score 92, one medium-risk ingredient).
    assert names_in_order.index("Best Shampoo") < names_in_order.index("Better Shampoo")
    assert "Worst Shampoo" not in names_in_order


async def test_alternatives_excludes_the_current_product_itself(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    product_id = await _create_product_with_ingredients(client, headers, "Solo Product", "soap", [])

    resp = await client.get(f"/api/v1/products/{product_id}/alternatives")
    assert resp.status_code == 200
    assert resp.json()["data"] == []


async def test_alternatives_only_considers_same_category(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    shampoo = await _create_product_with_ingredients(client, headers, "A Shampoo", "shampoo", [])
    await _create_product_with_ingredients(client, headers, "A Snack", "snack", [])

    resp = await client.get(f"/api/v1/products/{shampoo}/alternatives")
    assert resp.status_code == 200
    assert resp.json()["data"] == []  # only cross-category product exists, so nothing qualifies


async def test_alternatives_respects_limit(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    target = await _create_product_with_ingredients(client, headers, "Target Snack", "snack", [])
    for i in range(5):
        await _create_product_with_ingredients(client, headers, f"Alt Snack {i}", "snack", [])

    resp = await client.get(f"/api/v1/products/{target}/alternatives", params={"limit": 3})
    assert resp.status_code == 200
    assert len(resp.json()["data"]) == 3


async def test_alternatives_excludes_products_matching_user_sensitivity(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    fragrance = await _create_ingredient(client, headers, "Fragrance", risk_level="medium", is_allergen=True)

    target = await _create_product_with_ingredients(client, headers, "Target Soap", "soap", [])
    scented = await _create_product_with_ingredients(client, headers, "Scented Soap", "soap", [fragrance])
    unscented = await _create_product_with_ingredients(client, headers, "Unscented Soap", "soap", [])

    await client.post(
        "/api/v1/auth/register",
        json={"name": "Sensitive", "email": "sensitive@example.com", "password": "strongpass123"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login", json={"email": "sensitive@example.com", "password": "strongpass123"}
    )
    user_token = login_resp.json()["data"]["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}
    await client.post("/api/v1/me/sensitivities", json={"ingredient_id": fragrance}, headers=user_headers)

    resp = await client.get(f"/api/v1/products/{target}/alternatives", headers=user_headers)
    assert resp.status_code == 200
    names = [item["product"]["name"] for item in resp.json()["data"]]
    assert "Unscented Soap" in names
    assert "Scented Soap" not in names


async def test_alternatives_for_nonexistent_product_returns_404(client):
    resp = await client.get("/api/v1/products/00000000-0000-0000-0000-000000000000/alternatives")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "NOT_FOUND"


async def test_alternatives_also_excludes_products_matching_reaction_history(client, admin_token):
    """Phase 7 extension: even without a saved sensitivity, a candidate
    containing an ingredient the user reacted to before should be excluded."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    parfum = await _create_ingredient(client, headers, "Parfum", risk_level="low")

    target = await _create_product_with_ingredients(client, headers, "Target Body Wash", "bodywash", [])
    reacted_product = await _create_product_with_ingredients(
        client, headers, "Old Body Wash", "bodywash", [parfum]
    )
    scented_alt = await _create_product_with_ingredients(
        client, headers, "Scented Body Wash", "bodywash", [parfum]
    )
    unscented_alt = await _create_product_with_ingredients(
        client, headers, "Unscented Body Wash", "bodywash", []
    )

    user_headers = await _register_login_headers(client, "reaction-alt@example.com")
    await client.post(
        "/api/v1/me/reactions",
        json={
            "product_id": reacted_product,
            "reaction_type": "itching",
            "severity": "mild",
            "occurred_on": "2026-09-01",
        },
        headers=user_headers,
    )

    resp = await client.get(f"/api/v1/products/{target}/alternatives", headers=user_headers)
    names = [item["product"]["name"] for item in resp.json()["data"]]
    assert "Unscented Body Wash" in names
    assert "Scented Body Wash" not in names


async def _register_login_headers(client, email, password="strongpass123"):
    await client.post("/api/v1/auth/register", json={"name": "User", "email": email, "password": password})
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {resp.json()['data']['access_token']}"}
