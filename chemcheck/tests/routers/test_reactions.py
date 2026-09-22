async def _register_login_headers(client, email, password="strongpass123"):
    await client.post("/api/v1/auth/register", json={"name": "User", "email": email, "password": password})
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {resp.json()['data']['access_token']}"}


async def _create_product_with_ingredient(client, admin_headers, name, category, ingredient_id):
    resp = await client.post("/api/v1/products", json={"name": name, "category": category}, headers=admin_headers)
    product_id = resp.json()["data"]["id"]
    await client.post(
        f"/api/v1/products/{product_id}/ingredients",
        json={"ingredients": [{"ingredient_id": ingredient_id, "position": 0}]},
        headers=admin_headers,
    )
    return product_id


async def test_log_reaction_requires_authentication(client):
    resp = await client.post(
        "/api/v1/me/reactions",
        json={
            "product_id": "00000000-0000-0000-0000-000000000000",
            "reaction_type": "redness",
            "severity": "mild",
            "occurred_on": "2026-09-01",
        },
    )
    assert resp.status_code == 401


async def test_log_reaction_for_nonexistent_product_returns_404(client):
    headers = await _register_login_headers(client, "u1@example.com")
    resp = await client.post(
        "/api/v1/me/reactions",
        json={
            "product_id": "00000000-0000-0000-0000-000000000000",
            "reaction_type": "redness",
            "severity": "mild",
            "occurred_on": "2026-09-01",
        },
        headers=headers,
    )
    assert resp.status_code == 404


async def test_single_reaction_produces_no_suggestion(client, admin_token):
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    fragrance_resp = await client.post(
        "/api/v1/ingredients", json={"name": "Fragrance", "risk_level": "medium"}, headers=admin_headers
    )
    fragrance_id = fragrance_resp.json()["data"]["id"]
    product_id = await _create_product_with_ingredient(
        client, admin_headers, "Face Cream", "skincare", fragrance_id
    )

    user_headers = await _register_login_headers(client, "u2@example.com")
    resp = await client.post(
        "/api/v1/me/reactions",
        json={
            "product_id": product_id,
            "reaction_type": "redness",
            "severity": "moderate",
            "occurred_on": "2026-09-10",
        },
        headers=user_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["data"]["suggested_sensitivities"] == []


async def test_two_reactions_sharing_an_ingredient_triggers_suggestion(client, admin_token):
    """The Phase 7 checkpoint case: log two reactions with an overlapping
    ingredient across two different products, and see the suggestion."""
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    fragrance_resp = await client.post(
        "/api/v1/ingredients", json={"name": "Fragrance", "risk_level": "medium"}, headers=admin_headers
    )
    fragrance_id = fragrance_resp.json()["data"]["id"]

    product_a = await _create_product_with_ingredient(
        client, admin_headers, "Face Cream", "skincare", fragrance_id
    )
    product_b = await _create_product_with_ingredient(
        client, admin_headers, "Body Lotion", "skincare", fragrance_id
    )

    user_headers = await _register_login_headers(client, "u3@example.com")

    first_resp = await client.post(
        "/api/v1/me/reactions",
        json={
            "product_id": product_a,
            "reaction_type": "redness",
            "severity": "mild",
            "occurred_on": "2026-09-01",
        },
        headers=user_headers,
    )
    assert first_resp.json()["data"]["suggested_sensitivities"] == []  # only 1 reaction so far

    second_resp = await client.post(
        "/api/v1/me/reactions",
        json={
            "product_id": product_b,
            "reaction_type": "itching",
            "severity": "moderate",
            "occurred_on": "2026-09-15",
        },
        headers=user_headers,
    )
    assert second_resp.status_code == 201
    suggestions = second_resp.json()["data"]["suggested_sensitivities"]
    assert len(suggestions) == 1
    assert suggestions[0]["ingredient_id"] == fragrance_id
    assert suggestions[0]["ingredient_name"] == "Fragrance"

    # Nothing was auto-added — the user's saved sensitivities are still empty.
    sensitivities_resp = await client.get("/api/v1/me/sensitivities", headers=user_headers)
    assert sensitivities_resp.json()["data"] == []


async def test_suggestion_not_repeated_once_already_saved_as_sensitivity(client, admin_token):
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    fragrance_resp = await client.post(
        "/api/v1/ingredients", json={"name": "Fragrance", "risk_level": "medium"}, headers=admin_headers
    )
    fragrance_id = fragrance_resp.json()["data"]["id"]
    product_a = await _create_product_with_ingredient(client, admin_headers, "A", "skincare", fragrance_id)
    product_b = await _create_product_with_ingredient(client, admin_headers, "B", "skincare", fragrance_id)

    user_headers = await _register_login_headers(client, "u4@example.com")
    await client.post("/api/v1/me/sensitivities", json={"ingredient_id": fragrance_id}, headers=user_headers)

    await client.post(
        "/api/v1/me/reactions",
        json={"product_id": product_a, "reaction_type": "redness", "severity": "mild", "occurred_on": "2026-09-01"},
        headers=user_headers,
    )
    resp = await client.post(
        "/api/v1/me/reactions",
        json={"product_id": product_b, "reaction_type": "itching", "severity": "mild", "occurred_on": "2026-09-02"},
        headers=user_headers,
    )
    # Already saved as a sensitivity, so no redundant suggestion.
    assert resp.json()["data"]["suggested_sensitivities"] == []


async def test_reactions_are_scoped_per_user(client, admin_token):
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    ingredient_resp = await client.post(
        "/api/v1/ingredients", json={"name": "Water", "risk_level": "low"}, headers=admin_headers
    )
    product_id = await _create_product_with_ingredient(
        client, admin_headers, "Product", "misc", ingredient_resp.json()["data"]["id"]
    )

    user1_headers = await _register_login_headers(client, "u5@example.com")
    user2_headers = await _register_login_headers(client, "u6@example.com")

    await client.post(
        "/api/v1/me/reactions",
        json={"product_id": product_id, "reaction_type": "redness", "severity": "mild", "occurred_on": "2026-09-01"},
        headers=user1_headers,
    )

    list1 = await client.get("/api/v1/me/reactions", headers=user1_headers)
    list2 = await client.get("/api/v1/me/reactions", headers=user2_headers)
    assert len(list1.json()["data"]) == 1
    assert len(list2.json()["data"]) == 0
