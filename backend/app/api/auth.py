import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.auth import (
    AuthenticatedUser,
    AuthUnavailable,
    InvalidToken,
    verify_access_token,
)
from app.core.config import Settings, get_settings

router = APIRouter(prefix="/api", tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> AuthenticatedUser:
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            return await verify_access_token(credentials.credentials, settings, client)
    except InvalidToken as exc:
        raise HTTPException(
            status_code=401,
            detail="Invalid access token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except AuthUnavailable as exc:
        raise HTTPException(
            status_code=503, detail="Authentication unavailable"
        ) from exc


@router.get("/me", response_model=AuthenticatedUser)
async def me(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    return user
