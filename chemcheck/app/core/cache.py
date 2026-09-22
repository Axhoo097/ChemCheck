"""
Phase 9 — Optional Redis score cache.

Design decisions (documented here, not buried in logic):
  - The cache is *completely optional*: if REDIS_URL is not set (or redis is
    not installed), every function here is a no-op and the app works as if
    caching doesn't exist. This means tests never need a real Redis instance.
  - Only *unauthenticated* (base) scores are cached. Personalized scores are
    user-specific and must never be served to a different user from cache.
  - Cache key: "score:{product_id}"  TTL: 300 seconds (5 minutes).
  - Serialization: JSON (human-readable, debuggable with redis-cli).
"""
from __future__ import annotations

import json
import logging
from typing import TYPE_CHECKING

from app.core.config import settings

if TYPE_CHECKING:
    from app.schemas.scoring import ScoreResult

logger = logging.getLogger(__name__)

_SCORE_TTL = 300  # seconds
_KEY_PREFIX = "score:"


def _make_key(product_id: str) -> str:
    return f"{_KEY_PREFIX}{product_id}"


def _get_client():
    """Return an async Redis client, or None if Redis is not configured."""
    if not settings.redis_url:
        return None
    try:
        import redis.asyncio as aioredis  # type: ignore[import-untyped]

        return aioredis.from_url(settings.redis_url, decode_responses=True)
    except ImportError:
        logger.warning("redis package not installed — caching disabled")
        return None
    except Exception as exc:  # noqa: BLE001
        logger.warning("Redis unavailable — caching disabled: %s", exc)
        return None


async def get_cached_score(product_id: str) -> "ScoreResult | None":
    """Return a cached ScoreResult for the product, or None on a miss/error."""
    client = _get_client()
    if client is None:
        return None
    try:
        async with client:
            raw = await client.get(_make_key(product_id))
        if raw is None:
            return None
        from app.schemas.scoring import ScoreResult  # local import to avoid circular

        return ScoreResult.model_validate_json(raw)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Cache GET failed for %s: %s", product_id, exc)
        return None


async def set_cached_score(product_id: str, result: "ScoreResult") -> None:
    """Store a ScoreResult in Redis. Silently no-ops on any error."""
    client = _get_client()
    if client is None:
        return
    try:
        async with client:
            await client.setex(_make_key(product_id), _SCORE_TTL, result.model_dump_json())
    except Exception as exc:  # noqa: BLE001
        logger.warning("Cache SET failed for %s: %s", product_id, exc)


async def invalidate_score(product_id: str) -> None:
    """Evict a product's score from the cache (e.g., after an ingredient change)."""
    client = _get_client()
    if client is None:
        return
    try:
        async with client:
            await client.delete(_make_key(product_id))
    except Exception as exc:  # noqa: BLE001
        logger.warning("Cache DELETE failed for %s: %s", product_id, exc)
