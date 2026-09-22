#!/usr/bin/env sh
# Docker container entrypoint.
# 1. Run any pending Alembic migrations (idempotent — no-op if up-to-date).
# 2. Start the Uvicorn ASGI server.
set -e

echo "▶  Running database migrations…"
alembic upgrade head

echo "▶  Starting ChemCheck API…"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
