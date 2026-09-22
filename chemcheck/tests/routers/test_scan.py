import io

import barcode as barcode_lib
from barcode.writer import ImageWriter
from PIL import Image


def _png_bytes(color="white", size=(20, 20)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, color=color).save(buf, format="PNG")
    return buf.getvalue()


def _barcode_png_bytes(value: str) -> bytes:
    code128 = barcode_lib.get_barcode_class("code128")
    instance = code128(value, writer=ImageWriter())
    buf = io.BytesIO()
    instance.write(buf, options={"write_text": False})
    return buf.getvalue()


# ---------- /scan/label ----------


async def test_scan_label_matches_and_reports_unmatched_tokens(client, admin_token, monkeypatch):
    headers = {"Authorization": f"Bearer {admin_token}"}
    await client.post("/api/v1/ingredients", json={"name": "Water", "risk_level": "low"}, headers=headers)
    await client.post("/api/v1/ingredients", json={"name": "Glycerin", "risk_level": "low"}, headers=headers)

    # Mock the Tesseract call itself (Section 5) — everything downstream
    # (splitting, fuzzy matching) runs for real against the seeded ingredients.
    monkeypatch.setattr(
        "app.services.ocr.run_ocr", lambda image_bytes: "Water, Glycerin, Unobtainium"
    )

    resp = await client.post(
        "/api/v1/scan/label", files={"file": ("label.png", _png_bytes(), "image/png")}
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    matched_names = {item["name"] for item in data["matched"]}
    assert matched_names == {"Water", "Glycerin"}
    assert data["unmatched"] == ["Unobtainium"]


async def test_scan_label_rejects_oversized_file(client):
    oversized = b"\x00" * (5 * 1024 * 1024 + 1)
    resp = await client.post(
        "/api/v1/scan/label", files={"file": ("label.png", oversized, "image/png")}
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "FILE_TOO_LARGE"


async def test_scan_label_rejects_non_image_file(client):
    resp = await client.post(
        "/api/v1/scan/label", files={"file": ("label.txt", b"not an image", "text/plain")}
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "UNSUPPORTED_FILE_TYPE"


# ---------- /scan/barcode ----------


async def test_scan_barcode_finds_local_product(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    await client.post(
        "/api/v1/products",
        json={"name": "Local Shampoo", "category": "shampoo", "barcode": "5901234123457"},
        headers=headers,
    )

    resp = await client.post(
        "/api/v1/scan/barcode",
        files={"file": ("code.png", _barcode_png_bytes("5901234123457"), "image/png")},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["source"] == "local"
    assert data["product"]["name"] == "Local Shampoo"


async def test_scan_barcode_falls_back_to_external_source(client, monkeypatch):
    async def fake_lookup(barcode: str):
        return {"name": "External Product", "brand": "SomeBrand", "category": "snack"}

    monkeypatch.setattr("app.services.openfoodfacts_service.lookup_barcode_externally", fake_lookup)

    resp = await client.post(
        "/api/v1/scan/barcode",
        files={"file": ("code.png", _barcode_png_bytes("9999999999999"), "image/png")},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["source"] == "openfoodfacts"
    assert data["product"]["name"] == "External Product"


async def test_scan_barcode_returns_404_when_not_found_anywhere(client, monkeypatch):
    async def fake_lookup_none(barcode: str):
        return None

    monkeypatch.setattr("app.services.openfoodfacts_service.lookup_barcode_externally", fake_lookup_none)

    resp = await client.post(
        "/api/v1/scan/barcode",
        files={"file": ("code.png", _barcode_png_bytes("0000000000000"), "image/png")},
    )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "PRODUCT_NOT_FOUND"


async def test_scan_barcode_with_no_barcode_in_image_returns_400(client):
    resp = await client.post(
        "/api/v1/scan/barcode", files={"file": ("blank.png", _png_bytes(), "image/png")}
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "BARCODE_NOT_DETECTED"
