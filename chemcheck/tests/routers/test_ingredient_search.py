async def test_search_finds_partial_match(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    await client.post(
        "/api/v1/ingredients", json={"name": "Sodium Laureth Sulfate", "risk_level": "medium"}, headers=headers
    )

    resp = await client.get("/api/v1/ingredients/search", params={"q": "sodium"})
    assert resp.status_code == 200
    names = [item["name"] for item in resp.json()["data"]]
    assert "Sodium Laureth Sulfate" in names


async def test_search_is_case_insensitive(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    await client.post("/api/v1/ingredients", json={"name": "Glycerin", "risk_level": "low"}, headers=headers)

    resp = await client.get("/api/v1/ingredients/search", params={"q": "GLYCERIN"})
    assert resp.status_code == 200
    names = [item["name"] for item in resp.json()["data"]]
    assert "Glycerin" in names


async def test_search_respects_limit(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    for i in range(5):
        await client.post(
            "/api/v1/ingredients", json={"name": f"Test Ingredient {i}", "risk_level": "low"}, headers=headers
        )

    resp = await client.get("/api/v1/ingredients/search", params={"q": "Test Ingredient", "limit": 3})
    assert resp.status_code == 200
    assert len(resp.json()["data"]) == 3


async def test_search_no_match_returns_empty_list(client):
    resp = await client.get("/api/v1/ingredients/search", params={"q": "xyznonexistentchemical"})
    assert resp.status_code == 200
    assert resp.json()["data"] == []


async def test_search_requires_query_param(client):
    resp = await client.get("/api/v1/ingredients/search")
    assert resp.status_code == 422
