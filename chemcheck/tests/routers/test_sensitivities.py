async def _register_login_and_headers(client, email, password="strongpass123"):
    await client.post("/api/v1/auth/register", json={"name": "User", "email": email, "password": password})
    login_resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    token = login_resp.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def test_list_sensitivities_requires_authentication(client):
    resp = await client.get("/api/v1/me/sensitivities")
    assert resp.status_code == 401


async def test_add_and_list_sensitivity(client, admin_token):
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    ingredient_resp = await client.post(
        "/api/v1/ingredients", json={"name": "Fragrance", "risk_level": "medium"}, headers=admin_headers
    )
    ingredient_id = ingredient_resp.json()["data"]["id"]

    user_headers = await _register_login_and_headers(client, "user1@example.com")

    add_resp = await client.post(
        "/api/v1/me/sensitivities",
        json={"ingredient_id": ingredient_id, "severity_note": "Causes redness"},
        headers=user_headers,
    )
    assert add_resp.status_code == 201
    assert add_resp.json()["data"]["ingredient_name"] == "Fragrance"
    assert add_resp.json()["data"]["severity_note"] == "Causes redness"

    list_resp = await client.get("/api/v1/me/sensitivities", headers=user_headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()["data"]) == 1


async def test_add_sensitivity_with_unknown_ingredient_returns_404(client):
    user_headers = await _register_login_and_headers(client, "user2@example.com")
    resp = await client.post(
        "/api/v1/me/sensitivities",
        json={"ingredient_id": "00000000-0000-0000-0000-000000000000"},
        headers=user_headers,
    )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "INGREDIENT_NOT_FOUND"


async def test_sensitivities_are_scoped_per_user(client, admin_token):
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    ingredient_resp = await client.post(
        "/api/v1/ingredients", json={"name": "Menthol", "risk_level": "medium"}, headers=admin_headers
    )
    ingredient_id = ingredient_resp.json()["data"]["id"]

    user1_headers = await _register_login_and_headers(client, "userA@example.com")
    user2_headers = await _register_login_and_headers(client, "userB@example.com")

    await client.post(
        "/api/v1/me/sensitivities", json={"ingredient_id": ingredient_id}, headers=user1_headers
    )

    list1 = await client.get("/api/v1/me/sensitivities", headers=user1_headers)
    list2 = await client.get("/api/v1/me/sensitivities", headers=user2_headers)

    assert len(list1.json()["data"]) == 1
    assert len(list2.json()["data"]) == 0


async def test_remove_sensitivity(client, admin_token):
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    ingredient_resp = await client.post(
        "/api/v1/ingredients", json={"name": "Sulfates", "risk_level": "medium"}, headers=admin_headers
    )
    ingredient_id = ingredient_resp.json()["data"]["id"]

    user_headers = await _register_login_and_headers(client, "user3@example.com")
    await client.post("/api/v1/me/sensitivities", json={"ingredient_id": ingredient_id}, headers=user_headers)

    remove_resp = await client.delete(f"/api/v1/me/sensitivities/{ingredient_id}", headers=user_headers)
    assert remove_resp.status_code == 204

    list_resp = await client.get("/api/v1/me/sensitivities", headers=user_headers)
    assert list_resp.json()["data"] == []


async def test_remove_nonexistent_sensitivity_returns_404(client):
    user_headers = await _register_login_and_headers(client, "user4@example.com")
    resp = await client.delete(
        "/api/v1/me/sensitivities/00000000-0000-0000-0000-000000000000", headers=user_headers
    )
    assert resp.status_code == 404
