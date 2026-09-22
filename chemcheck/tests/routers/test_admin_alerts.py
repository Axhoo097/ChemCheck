async def _register_login_headers(client, email, password="strongpass123"):
    await client.post("/api/v1/auth/register", json={"name": "User", "email": email, "password": password})
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {resp.json()['data']['access_token']}"}


async def test_list_alerts_requires_authentication(client):
    resp = await client.get("/api/v1/admin/alerts")
    assert resp.status_code == 401


async def test_non_admin_gets_403_on_admin_alerts_route(client):
    """The Phase 8 checkpoint case."""
    user_headers = await _register_login_headers(client, "regular-user@example.com")
    resp = await client.post(
        "/api/v1/admin/alerts", json={"title": "X", "description": "Y", "product_id": None}, headers=user_headers
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"


async def test_admin_can_create_alert_for_product(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    product_resp = await client.post(
        "/api/v1/products", json={"name": "Recalled Shampoo", "category": "shampoo"}, headers=headers
    )
    product_id = product_resp.json()["data"]["id"]

    resp = await client.post(
        "/api/v1/admin/alerts",
        json={
            "product_id": product_id,
            "title": "Voluntary recall",
            "description": "Batch #4471 recalled due to a labeling error.",
        },
        headers=headers,
    )
    assert resp.status_code == 201
    assert resp.json()["data"]["title"] == "Voluntary recall"
    assert resp.json()["data"]["product_id"] == product_id


async def test_admin_can_create_alert_for_ingredient(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    ingredient_resp = await client.post(
        "/api/v1/ingredients", json={"name": "Some Chemical", "risk_level": "high"}, headers=headers
    )
    ingredient_id = ingredient_resp.json()["data"]["id"]

    resp = await client.post(
        "/api/v1/admin/alerts",
        json={
            "ingredient_id": ingredient_id,
            "title": "Regulatory status changed",
            "description": "This ingredient is now restricted in several markets.",
        },
        headers=headers,
    )
    assert resp.status_code == 201
    assert resp.json()["data"]["ingredient_id"] == ingredient_id


async def test_alert_without_product_or_ingredient_is_rejected(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.post(
        "/api/v1/admin/alerts", json={"title": "Vague notice", "description": "About nothing in particular."}, headers=headers
    )
    assert resp.status_code == 422


async def test_alert_for_nonexistent_product_returns_404(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.post(
        "/api/v1/admin/alerts",
        json={
            "product_id": "00000000-0000-0000-0000-000000000000",
            "title": "X",
            "description": "Y",
        },
        headers=headers,
    )
    assert resp.status_code == 404


async def test_admin_can_update_and_delete_alert(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    product_resp = await client.post(
        "/api/v1/products", json={"name": "P", "category": "soap"}, headers=headers
    )
    product_id = product_resp.json()["data"]["id"]

    create_resp = await client.post(
        "/api/v1/admin/alerts",
        json={"product_id": product_id, "title": "Original", "description": "Original text."},
        headers=headers,
    )
    alert_id = create_resp.json()["data"]["id"]

    update_resp = await client.put(
        f"/api/v1/admin/alerts/{alert_id}", json={"title": "Updated title"}, headers=headers
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["data"]["title"] == "Updated title"

    delete_resp = await client.delete(f"/api/v1/admin/alerts/{alert_id}", headers=headers)
    assert delete_resp.status_code == 204

    get_resp = await client.get(f"/api/v1/admin/alerts/{alert_id}", headers=headers)
    assert get_resp.status_code == 404


async def test_admin_alerts_list_is_paginated(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    product_resp = await client.post(
        "/api/v1/products", json={"name": "P", "category": "soap"}, headers=headers
    )
    product_id = product_resp.json()["data"]["id"]

    for i in range(3):
        await client.post(
            "/api/v1/admin/alerts",
            json={"product_id": product_id, "title": f"Alert {i}", "description": "Text"},
            headers=headers,
        )

    resp = await client.get("/api/v1/admin/alerts", params={"page": 1, "page_size": 2}, headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["data"]) == 2
    assert body["meta"]["total_count"] == 3
