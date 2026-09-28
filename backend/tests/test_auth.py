import asyncio
from uuid import UUID

import httpx
import pytest
from fastapi.testclient import TestClient

from app.api.auth import get_current_user
from app.core.auth import (
    AuthenticatedUser,
    AuthUnavailable,
    InvalidToken,
    verify_access_token,
)
from app.core.config import Settings, get_settings
from app.main import app

client = TestClient(app)
USER_ID = UUID("d908139c-0f79-4937-b5f3-589fb2c4468e")


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


def test_me_requires_bearer_token() -> None:
    app.dependency_overrides[get_settings] = lambda: Settings(database_url="sqlite://")

    response = client.get("/api/me")

    assert response.status_code == 401


def test_me_returns_verified_identity() -> None:
    app.dependency_overrides[get_settings] = lambda: Settings(database_url="sqlite://")
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        id=USER_ID, email="learner@example.com"
    )

    response = client.get("/api/me", headers={"Authorization": "Bearer valid"})

    assert response.status_code == 200
    assert response.json() == {"id": str(USER_ID), "email": "learner@example.com"}


def test_me_fails_closed_without_auth_configuration() -> None:
    app.dependency_overrides[get_settings] = lambda: Settings(database_url="sqlite://")

    response = client.get("/api/me", headers={"Authorization": "Bearer token"})

    assert response.status_code == 503


def test_verifier_uses_supabase_auth_endpoint() -> None:
    def handle(request: httpx.Request) -> httpx.Response:
        assert str(request.url) == "https://example.supabase.co/auth/v1/user"
        assert request.headers["apikey"] == "public-key"
        assert request.headers["authorization"] == "Bearer real-token"
        return httpx.Response(
            200, json={"id": str(USER_ID), "email": "learner@example.com"}
        )

    async def verify() -> AuthenticatedUser:
        transport = httpx.MockTransport(handle)
        async with httpx.AsyncClient(transport=transport) as http_client:
            return await verify_access_token(
                "real-token",
                Settings(
                    database_url="sqlite://",
                    supabase_url="https://example.supabase.co",
                    supabase_publishable_key="public-key",
                ),
                http_client,
            )

    assert asyncio.run(verify()).id == USER_ID


def test_verifier_rejects_invalid_token() -> None:
    async def verify() -> None:
        transport = httpx.MockTransport(lambda _: httpx.Response(401))
        async with httpx.AsyncClient(transport=transport) as http_client:
            await verify_access_token(
                "invalid",
                Settings(
                    database_url="sqlite://",
                    supabase_url="https://example.supabase.co",
                    supabase_publishable_key="public-key",
                ),
                http_client,
            )

    with pytest.raises(InvalidToken):
        asyncio.run(verify())


def test_verifier_rejects_malformed_identity() -> None:
    async def verify() -> None:
        transport = httpx.MockTransport(
            lambda _: httpx.Response(200, json={"id": "bad"})
        )
        async with httpx.AsyncClient(transport=transport) as http_client:
            await verify_access_token(
                "invalid",
                Settings(
                    database_url="sqlite://",
                    supabase_url="https://example.supabase.co",
                    supabase_publishable_key="public-key",
                ),
                http_client,
            )

    with pytest.raises(AuthUnavailable):
        asyncio.run(verify())
