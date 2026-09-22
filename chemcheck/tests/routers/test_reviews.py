async def _register_login_headers(client, email, password="strongpass123"):
    await client.post("/api/v1/auth/register", json={"name": "User", "email": email, "password": password})
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {resp.json()['data']['access_token']}"}


async def test_create_review_requires_authentication(client):
    resp = await client.post(
        "/api/v1/reviews",
        json={"product_id": "00000000-0000-0000-0000-000000000000", "rating": 5},
    )
    assert resp.status_code == 401


async def test_create_and_list_review(client, admin_token):
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product_resp = await client.post(
        "/api/v1/products", json={"name": "Nice Soap", "category": "soap"}, headers=admin_headers
    )
    product_id = product_resp.json()["data"]["id"]

    user_headers = await _register_login_headers(client, "reviewer1@example.com")
    create_resp = await client.post(
        "/api/v1/reviews",
        json={"product_id": product_id, "rating": 4, "comment": "Worked well for my dry skin."},
        headers=user_headers,
    )
    assert create_resp.status_code == 201
    assert create_resp.json()["data"]["rating"] == 4

    list_resp = await client.get(f"/api/v1/products/{product_id}/reviews")
    assert list_resp.status_code == 200
    assert len(list_resp.json()["data"]) == 1
    assert list_resp.json()["data"][0]["comment"] == "Worked well for my dry skin."


async def test_review_for_nonexistent_product_returns_404(client):
    user_headers = await _register_login_headers(client, "reviewer2@example.com")
    resp = await client.post(
        "/api/v1/reviews",
        json={"product_id": "00000000-0000-0000-0000-000000000000", "rating": 3},
        headers=user_headers,
    )
    assert resp.status_code == 404


async def test_review_rating_out_of_range_is_rejected(client, admin_token):
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product_resp = await client.post(
        "/api/v1/products", json={"name": "P", "category": "soap"}, headers=admin_headers
    )
    product_id = product_resp.json()["data"]["id"]

    user_headers = await _register_login_headers(client, "reviewer3@example.com")
    resp = await client.post(
        "/api/v1/reviews", json={"product_id": product_id, "rating": 7}, headers=user_headers
    )
    assert resp.status_code == 422


async def test_list_reviews_for_nonexistent_product_returns_404(client):
    resp = await client.get("/api/v1/products/00000000-0000-0000-0000-000000000000/reviews")
    assert resp.status_code == 404


async def test_review_list_is_paginated(client, admin_token):
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product_resp = await client.post(
        "/api/v1/products", json={"name": "Popular Product", "category": "snack"}, headers=admin_headers
    )
    product_id = product_resp.json()["data"]["id"]

    for i in range(3):
        headers = await _register_login_headers(client, f"reviewer-page-{i}@example.com")
        await client.post(
            "/api/v1/reviews", json={"product_id": product_id, "rating": 5}, headers=headers
        )

    resp = await client.get(f"/api/v1/products/{product_id}/reviews", params={"page": 1, "page_size": 2})
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["data"]) == 2
    assert body["meta"]["total_count"] == 3
