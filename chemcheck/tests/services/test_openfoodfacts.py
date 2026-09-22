import httpx
import pytest

from app.core.errors import ServiceError
from app.services.openfoodfacts_service import lookup_barcode_externally


class _FakeResponse:
    def __init__(self, json_data, status_code=200):
        self._json_data = json_data
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("error", request=None, response=self)

    def json(self):
        return self._json_data


class _FakeAsyncClient:
    def __init__(self, response=None, raise_exc=None):
        self._response = response
        self._raise_exc = raise_exc

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def get(self, url):
        if self._raise_exc:
            raise self._raise_exc
        return self._response


async def test_lookup_found_product_returns_normalized_dict(monkeypatch):
    fake_response = _FakeResponse(
        {
            "status": 1,
            "product": {
                "product_name": "Test Shampoo",
                "brands": "TestBrand",
                "categories": "Shampoos, Hair Care",
            },
        }
    )
    monkeypatch.setattr(
        "app.services.openfoodfacts_service.httpx.AsyncClient",
        lambda *a, **kw: _FakeAsyncClient(response=fake_response),
    )

    result = await lookup_barcode_externally("1234567890")
    assert result == {"name": "Test Shampoo", "brand": "TestBrand", "category": "Shampoos"}


async def test_lookup_not_found_returns_none(monkeypatch):
    fake_response = _FakeResponse({"status": 0})
    monkeypatch.setattr(
        "app.services.openfoodfacts_service.httpx.AsyncClient",
        lambda *a, **kw: _FakeAsyncClient(response=fake_response),
    )

    result = await lookup_barcode_externally("0000000000")
    assert result is None


async def test_lookup_missing_optional_fields_falls_back_gracefully(monkeypatch):
    fake_response = _FakeResponse({"status": 1, "product": {}})
    monkeypatch.setattr(
        "app.services.openfoodfacts_service.httpx.AsyncClient",
        lambda *a, **kw: _FakeAsyncClient(response=fake_response),
    )

    result = await lookup_barcode_externally("1111111111")
    assert result == {"name": "Unknown product", "brand": None, "category": "uncategorized"}


async def test_lookup_network_failure_raises_502_service_error(monkeypatch):
    monkeypatch.setattr(
        "app.services.openfoodfacts_service.httpx.AsyncClient",
        lambda *a, **kw: _FakeAsyncClient(raise_exc=httpx.ConnectTimeout("timeout")),
    )

    with pytest.raises(ServiceError) as exc_info:
        await lookup_barcode_externally("1234567890")
    assert exc_info.value.code == "EXTERNAL_LOOKUP_FAILED"
    assert exc_info.value.status_code == 502
