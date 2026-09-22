"""
Phase 9 — Optional LLM explanation layer.

Turns a ScoreResult into a concise, human-readable paragraph that explains
*why* a product received its score in plain English, without any medical claims.

Design decisions:
  - Provider: OpenAI (gpt-4o-mini by default) via the official `openai` SDK.
    The key is read from the OPENAI_API_KEY environment variable.
  - Graceful degradation: if the key is absent, the endpoint returns a 503
    with code LLM_NOT_CONFIGURED — the rest of the API is unaffected.
  - The prompt is deliberately non-medical (see Section 1 of the master spec):
    it uses "ChemCheck risk category" language, never "safe/unsafe".
  - On OpenAI API errors (rate limits, network, etc.) we return a 502 so the
    caller knows to retry rather than treating it as a client error.
"""
from __future__ import annotations

import logging
import os
from typing import TYPE_CHECKING

from app.core.errors import ServiceError

if TYPE_CHECKING:
    from app.schemas.scoring import ScoreResult

logger = logging.getLogger(__name__)

_MODEL = "gpt-4o-mini"
_MAX_TOKENS = 250


def _build_prompt(result: "ScoreResult") -> str:
    """
    Construct a terse, fact-dense prompt so the LLM has everything it needs
    and the completion is short (cost-efficient).
    """
    concern_names = [item.name for item in result.breakdown if item.points_deducted > 0]
    allergen_names = [item.name for item in result.breakdown if item.is_allergen]

    lines = [
        "You are ChemCheck, a cosmetic ingredient safety assistant.",
        "Summarise the following product analysis in 2–3 plain-English sentences.",
        "Use the term 'ChemCheck risk category', never 'safe' or 'unsafe'.",
        "Do not give medical advice. Be concise and factual.",
        "",
        f"Overall score: {result.score}/100  |  Category: {result.category}",
        f"Ingredients of concern ({result.concern_count}): {', '.join(concern_names) or 'none'}",
        f"Allergens ({result.allergen_count}): {', '.join(allergen_names) or 'none'}",
    ]
    if result.personalized and result.warnings:
        lines.append(f"Personalized warnings: {'; '.join(result.warnings)}")
    return "\n".join(lines)


async def explain_score(result: "ScoreResult") -> str:
    """
    Call the LLM and return a plain-text explanation of the score.

    Raises:
        ServiceError("LLM_NOT_CONFIGURED") — 503 if OPENAI_API_KEY is missing.
        ServiceError("LLM_ERROR")           — 502 on any OpenAI API failure.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ServiceError(
            "LLM_NOT_CONFIGURED",
            "No LLM API key is configured. Set OPENAI_API_KEY to enable this feature.",
            status_code=503,
        )

    try:
        from openai import AsyncOpenAI  # lazy import — optional dependency

        client = AsyncOpenAI(api_key=api_key)
        prompt = _build_prompt(result)
        logger.debug("LLM prompt: %s", prompt)

        response = await client.chat.completions.create(
            model=_MODEL,
            max_tokens=_MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,  # low temperature → more factual, less creative
        )
        text = response.choices[0].message.content or ""
        logger.info("LLM explanation generated (score=%s, tokens=%s)", result.score, response.usage.total_tokens if response.usage else "?")
        return text.strip()

    except ServiceError:
        raise  # re-raise our own errors unchanged

    except ImportError:
        raise ServiceError(
            "LLM_NOT_CONFIGURED",
            "The openai package is not installed. Run: pip install openai",
            status_code=503,
        ) from None

    except Exception as exc:
        logger.exception("OpenAI API error: %s", exc)
        raise ServiceError(
            "LLM_ERROR",
            "The explanation service is temporarily unavailable. Please try again later.",
            status_code=502,
        ) from exc
