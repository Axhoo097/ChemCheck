async def test_register_login_and_me_flow(client):
    resp = await client.post(
        "/api/v1/auth/register",
        json={"name": "Ashish", "email": "ashish@example.com", "password": "strongpass123"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["email"] == "ashish@example.com"
    assert body["data"]["is_admin"] is False

    resp = await client.post(
        "/api/v1/auth/login", json={"email": "ashish@example.com", "password": "strongpass123"}
    )
    assert resp.status_code == 200
    token = resp.json()["data"]["access_token"]
    assert token

    resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["data"]["email"] == "ashish@example.com"


async def test_update_me_updates_profile(client):
    await client.post(
        "/api/v1/auth/register",
        json={"name": "Priya", "email": "priya@example.com", "password": "strongpass123"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login", json={"email": "priya@example.com", "password": "strongpass123"}
    )
    token = login_resp.json()["data"]["access_token"]

    resp = await client.put(
        "/api/v1/auth/me",
        json={"skin_type": "dry", "hair_type": "curly"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["skin_type"] == "dry"
    assert resp.json()["data"]["hair_type"] == "curly"


async def test_register_duplicate_email_returns_409(client):
    payload = {"name": "A", "email": "dup@example.com", "password": "strongpass123"}
    first = await client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 201

    second = await client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 409
    body = second.json()
    assert body["success"] is False
    assert body["error"]["code"] == "EMAIL_ALREADY_EXISTS"


async def test_login_wrong_password_returns_401(client):
    await client.post(
        "/api/v1/auth/register",
        json={"name": "B", "email": "b@example.com", "password": "correctpass1"},
    )
    resp = await client.post("/api/v1/auth/login", json={"email": "b@example.com", "password": "wrongpass"})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "INVALID_CREDENTIALS"


async def test_me_without_token_returns_401(client):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "NOT_AUTHENTICATED"


async def test_register_rejects_short_password(client):
    resp = await client.post(
        "/api/v1/auth/register",
        json={"name": "C", "email": "c@example.com", "password": "short"},
    )
    assert resp.status_code == 422
