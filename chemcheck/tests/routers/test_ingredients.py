async def test_create_ingredient_requires_admin(client):
    resp = await client.post(
        "/api/v1/ingredients",
        json={"name": "Fragrance", "risk_level": "medium", "is_allergen": True},
    )
    assert resp.status_code == 401


async def test_admin_can_create_and_search_ingredient(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.post(
        "/api/v1/ingredients",
        json={
            "name": "Sodium Laureth Sulfate",
            "function": "surfactant",
            "risk_level": "medium",
            "is_allergen": False,
            "evidence_level": "moderate",
            "description": "A cleansing agent that creates foam.",
        },
        headers=headers,
    )
    assert resp.status_code == 201
    ingredient_id = resp.json()["data"]["id"]

    search_resp = await client.get("/api/v1/ingredients", params={"q": "sodium"})
    assert search_resp.status_code == 200
    names = [item["name"] for item in search_resp.json()["data"]]
    assert "Sodium Laureth Sulfate" in names

    get_resp = await client.get(f"/api/v1/ingredients/{ingredient_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["data"]["risk_level"] == "medium"


async def test_duplicate_ingredient_name_returns_409(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {"name": "Parfum", "risk_level": "low"}
    first = await client.post("/api/v1/ingredients", json=payload, headers=headers)
    assert first.status_code == 201

    second = await client.post("/api/v1/ingredients", json=payload, headers=headers)
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "INGREDIENT_ALREADY_EXISTS"


async def test_get_nonexistent_ingredient_returns_404(client):
    resp = await client.get("/api/v1/ingredients/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


async def test_admin_can_update_and_delete_ingredient(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    create_resp = await client.post(
        "/api/v1/ingredients", json={"name": "Glycerin", "risk_level": "low"}, headers=headers
    )
    ingredient_id = create_resp.json()["data"]["id"]

    update_resp = await client.put(
        f"/api/v1/ingredients/{ingredient_id}",
        json={"is_allergen": True, "risk_level": "medium"},
        headers=headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["data"]["is_allergen"] is True

    delete_resp = await client.delete(f"/api/v1/ingredients/{ingredient_id}", headers=headers)
    assert delete_resp.status_code == 204

    get_resp = await client.get(f"/api/v1/ingredients/{ingredient_id}")
    assert get_resp.status_code == 404
