"""
Every successful response goes through success_response() so the
envelope shape ({"success": true, "data": ..., "meta": ...}) is
consistent everywhere. Errors are built by the exception handlers in
main.py from ServiceError, never assembled by hand in a router.
"""
from typing import Any


def success_response(data: Any, meta: dict[str, Any] | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"success": True, "data": data}
    if meta is not None:
        payload["meta"] = meta
    return payload


def pagination_meta(page: int, page_size: int, total_count: int) -> dict[str, Any]:
    return {"page": page, "page_size": page_size, "total_count": total_count}
