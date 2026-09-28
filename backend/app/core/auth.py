from uuid import UUID

import httpx
from pydantic import BaseModel, ValidationError

from app.core.config import Settings


class AuthUnavailable(Exception):
    """The configured identity provider cannot verify a token right now."""


class InvalidToken(Exception):
    """The identity provider rejected the presented token."""


class AuthenticatedUser(BaseModel):
    id: UUID
    email: str | None = None


async def verify_access_token(
    token: str, settings: Settings, client: httpx.AsyncClient
) -> AuthenticatedUser:
    if not settings.supabase_url or not settings.supabase_publishable_key:
        raise AuthUnavailable("Supabase is not configured")

    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/user"
    try:
        response = await client.get(
            url,
            headers={
                "apikey": settings.supabase_publishable_key,
                "Authorization": f"Bearer {token}",
            },
        )
    except httpx.RequestError as exc:
        raise AuthUnavailable("Supabase Auth is unreachable") from exc

    if response.status_code in (400, 401, 403):
        raise InvalidToken("Supabase Auth rejected the token")
    if response.status_code != 200:
        raise AuthUnavailable("Supabase Auth could not verify the token")

    try:
        return AuthenticatedUser.model_validate(response.json())
    except (ValueError, ValidationError) as exc:
        raise AuthUnavailable("Supabase Auth returned an invalid user") from exc
