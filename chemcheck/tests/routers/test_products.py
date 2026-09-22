async def test_create_product_requires_authentication(client):
    resp = await client.post("/api/v1/products", json={"name": "X", "category": "shampoo"})
    assert resp.status_code == 401


async def test_create_product_requires_admin(client):
    await client.post(
        "/api/v1/auth/register",
        json={"name": "Regular", "email": "regular@example.com", "password": "strongpass123"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login", json={"email": "regular@example.com", "password": "strongpass123"}
    )
    token = login_resp.json()["data"]["access_token"]

    resp = await client.post(
        "/api/v1/products",
        json={"name": "X", "category": "shampoo"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"


async def test_admin_can_create_and_fetch_product(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.post(
        "/api/v1/products",
        json={"name": "Herbal Shampoo", "category": "shampoo", "brand": "XYZ"},
        headers=headers,
    )
    assert resp.status_code == 201
    product_id = resp.json()["data"]["id"]

    resp = await client.get(f"/api/v1/products/{product_id}")
    assert resp.status_code == 200
    assert resp.json()["data"]["name"] == "Herbal Shampoo"


async def test_list_products_is_paginated_and_searchable(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    for i in range(3):
        await client.post(
            "/api/v1/products",
            json={"name": f"Product {i}", "category": "snack"},
            headers=headers,
        )

    resp = await client.get("/api/v1/products", params={"page": 1, "page_size": 2, "category": "snack"})
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["data"]) == 2
    assert body["meta"]["total_count"] == 3
    assert body["meta"]["page"] == 1
    assert body["meta"]["page_size"] == 2


async def test_get_nonexistent_product_returns_404(client):
    resp = await client.get("/api/v1/products/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "NOT_FOUND"


async def test_duplicate_barcode_returns_409(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {"name": "P1", "category": "snack", "barcode": "12345"}
    first = await client.post("/api/v1/products", json=payload, headers=headers)
    assert first.status_code == 201

    second = await client.post(
        "/api/v1/products", json={"name": "P2", "category": "snack", "barcode": "12345"}, headers=headers
    )
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "BARCODE_ALREADY_EXISTS"


async def test_admin_can_update_and_delete_product(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    create_resp = await client.post(
        "/api/v1/products", json={"name": "Old Name", "category": "soap"}, headers=headers
    )
    product_id = create_resp.json()["data"]["id"]

    update_resp = await client.put(
        f"/api/v1/products/{product_id}", json={"name": "New Name"}, headers=headers
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["data"]["name"] == "New Name"

    delete_resp = await client.delete(f"/api/v1/products/{product_id}", headers=headers)
    assert delete_resp.status_code == 204

    get_resp = await client.get(f"/api/v1/products/{product_id}")
    assert get_resp.status_code == 404
