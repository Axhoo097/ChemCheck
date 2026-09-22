async def _make_product_and_ingredient(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    product_resp = await client.post(
        "/api/v1/products", json={"name": "Herbal Shampoo", "category": "shampoo"}, headers=headers
    )
    ingredient_resp = await client.post(
        "/api/v1/ingredients", json={"name": "Water", "risk_level": "low"}, headers=headers
    )
    return product_resp.json()["data"]["id"], ingredient_resp.json()["data"]["id"], headers


async def test_attach_ingredients_requires_admin(client, admin_token):
    product_id, ingredient_id, _headers = await _make_product_and_ingredient(client, admin_token)

    resp = await client.post(
        f"/api/v1/products/{product_id}/ingredients",
        json={"ingredients": [{"ingredient_id": ingredient_id, "position": 0}]},
    )
    assert resp.status_code == 401


async def test_admin_can_attach_and_list_ingredients(client, admin_token):
    product_id, ingredient_id, headers = await _make_product_and_ingredient(client, admin_token)

    attach_resp = await client.post(
        f"/api/v1/products/{product_id}/ingredients",
        json={"ingredients": [{"ingredient_id": ingredient_id, "position": 0}]},
        headers=headers,
    )
    assert attach_resp.status_code == 201
    assert attach_resp.json()["data"][0]["name"] == "Water"

    list_resp = await client.get(f"/api/v1/products/{product_id}/ingredients")
    assert list_resp.status_code == 200
    assert len(list_resp.json()["data"]) == 1
    assert list_resp.json()["data"][0]["ingredient_id"] == ingredient_id


async def test_attach_respects_position_order(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    product_resp = await client.post(
        "/api/v1/products", json={"name": "Multi-Ingredient Product", "category": "snack"}, headers=headers
    )
    product_id = product_resp.json()["data"]["id"]

    first = await client.post("/api/v1/ingredients", json={"name": "Sugar", "risk_level": "low"}, headers=headers)
    second = await client.post("/api/v1/ingredients", json={"name": "Salt", "risk_level": "low"}, headers=headers)
    first_id = first.json()["data"]["id"]
    second_id = second.json()["data"]["id"]

    await client.post(
        f"/api/v1/products/{product_id}/ingredients",
        json={
            "ingredients": [
                {"ingredient_id": second_id, "position": 0},
                {"ingredient_id": first_id, "position": 1},
            ]
        },
        headers=headers,
    )

    list_resp = await client.get(f"/api/v1/products/{product_id}/ingredients")
    ordered_names = [item["name"] for item in list_resp.json()["data"]]
    assert ordered_names == ["Salt", "Sugar"]


async def test_attach_with_unknown_ingredient_returns_404(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    product_resp = await client.post("/api/v1/products", json={"name": "P", "category": "soap"}, headers=headers)
    product_id = product_resp.json()["data"]["id"]

    resp = await client.post(
        f"/api/v1/products/{product_id}/ingredients",
        json={"ingredients": [{"ingredient_id": "00000000-0000-0000-0000-000000000000", "position": 0}]},
        headers=headers,
    )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "INGREDIENT_NOT_FOUND"


async def test_admin_can_remove_ingredient_link(client, admin_token):
    product_id, ingredient_id, headers = await _make_product_and_ingredient(client, admin_token)
    await client.post(
        f"/api/v1/products/{product_id}/ingredients",
        json={"ingredients": [{"ingredient_id": ingredient_id, "position": 0}]},
        headers=headers,
    )

    remove_resp = await client.delete(
        f"/api/v1/products/{product_id}/ingredients/{ingredient_id}", headers=headers
    )
    assert remove_resp.status_code == 204

    list_resp = await client.get(f"/api/v1/products/{product_id}/ingredients")
    assert list_resp.json()["data"] == []


async def test_deleting_ingredient_in_use_is_restricted(client, admin_token):
    product_id, ingredient_id, headers = await _make_product_and_ingredient(client, admin_token)
    await client.post(
        f"/api/v1/products/{product_id}/ingredients",
        json={"ingredients": [{"ingredient_id": ingredient_id, "position": 0}]},
        headers=headers,
    )

    delete_resp = await client.delete(f"/api/v1/ingredients/{ingredient_id}", headers=headers)
    assert delete_resp.status_code == 409
    assert delete_resp.json()["error"]["code"] == "INGREDIENT_IN_USE"


async def test_deleting_product_cascades_to_ingredient_links(client, admin_token):
    product_id, ingredient_id, headers = await _make_product_and_ingredient(client, admin_token)
    await client.post(
        f"/api/v1/products/{product_id}/ingredients",
        json={"ingredients": [{"ingredient_id": ingredient_id, "position": 0}]},
        headers=headers,
    )

    delete_resp = await client.delete(f"/api/v1/products/{product_id}", headers=headers)
    assert delete_resp.status_code == 204

    # The ingredient itself must survive — only the link is gone.
    ingredient_resp = await client.get(f"/api/v1/ingredients/{ingredient_id}")
    assert ingredient_resp.status_code == 200

    # And it's no longer "in use", so it can now be deleted.
    now_delete_resp = await client.delete(f"/api/v1/ingredients/{ingredient_id}", headers=headers)
    assert now_delete_resp.status_code == 204
