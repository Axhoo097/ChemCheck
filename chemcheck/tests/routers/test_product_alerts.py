async def test_get_product_alerts_is_public_no_auth_needed(client, admin_token):
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product_resp = await client.post(
        "/api/v1/products", json={"name": "P", "category": "soap"}, headers=admin_headers
    )
    product_id = product_resp.json()["data"]["id"]
    await client.post(
        "/api/v1/admin/alerts",
        json={"product_id": product_id, "title": "Recall notice", "description": "Details here."},
        headers=admin_headers,
    )

    resp = await client.get(f"/api/v1/products/{product_id}/alerts")  # no Authorization header
    assert resp.status_code == 200
    assert len(resp.json()["data"]) == 1
    assert resp.json()["data"][0]["title"] == "Recall notice"


async def test_product_alerts_only_returns_alerts_for_that_product(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    product_a = (
        await client.post("/api/v1/products", json={"name": "A", "category": "soap"}, headers=headers)
    ).json()["data"]["id"]
    product_b = (
        await client.post("/api/v1/products", json={"name": "B", "category": "soap"}, headers=headers)
    ).json()["data"]["id"]

    await client.post(
        "/api/v1/admin/alerts",
        json={"product_id": product_a, "title": "A's alert", "description": "..."},
        headers=headers,
    )

    resp_a = await client.get(f"/api/v1/products/{product_a}/alerts")
    resp_b = await client.get(f"/api/v1/products/{product_b}/alerts")
    assert len(resp_a.json()["data"]) == 1
    assert len(resp_b.json()["data"]) == 0


async def test_product_alerts_for_nonexistent_product_returns_404(client):
    resp = await client.get("/api/v1/products/00000000-0000-0000-0000-000000000000/alerts")
    assert resp.status_code == 404
