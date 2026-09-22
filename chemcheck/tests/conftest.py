"""
Section 5: integration tests run against a real (in-memory) database
via a per-test-session SQLite engine, with FastAPI's get_db dependency
overridden to use it. StaticPool keeps every connection pointed at the
same in-memory DB for the life of the test run.

Phase 9: REDIS_URL is forced to None here so the optional cache is always
disabled during tests — no Redis instance required to run the test suite.
"""
import os

# Disable Redis *before* any app module is imported (settings are cached
# via lru_cache, so this must happen at import time, not in a fixture).
os.environ.setdefault("REDIS_URL", "")

import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import User

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = async_sessionmaker(bind=test_engine, expire_on_commit=False)


async def _override_get_db():
    async with TestSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = _override_get_db


@pytest_asyncio.fixture(autouse=True)
async def _reset_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def db_session():
    """For service-layer tests that need a DB session but not the HTTP client."""
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def admin_token(client: AsyncClient) -> str:
    """Registers a user, promotes them to admin directly in the DB, logs in."""
    await client.post(
        "/api/v1/auth/register",
        json={"name": "Admin", "email": "admin@example.com", "password": "adminpass123"},
    )
    async with TestSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == "admin@example.com"))
        user = result.scalar_one()
        user.is_admin = True
        await session.commit()

    resp = await client.post(
        "/api/v1/auth/login", json={"email": "admin@example.com", "password": "adminpass123"}
    )
    return resp.json()["data"]["access_token"]
