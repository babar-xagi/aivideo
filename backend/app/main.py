from collections.abc import Awaitable, Callable
from typing import Literal

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.exc import SQLAlchemyError
from starlette.responses import Response

from app.api.analysis import router as analysis_router
from app.api.auth import router as auth_router
from app.api.sessions import router as sessions_router
from app.api.uploads import router as uploads_router
from app.db.connection import check_database

app = FastAPI(title="English Coach API", version="0.1.0")
app.include_router(auth_router)
app.include_router(sessions_router)
app.include_router(uploads_router)
app.include_router(analysis_router)


@app.middleware("http")
async def private_api_responses(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    response = await call_next(request)
    if request.url.path.startswith("/api/sessions") or request.url.path == "/api/me":
        response.headers["Cache-Control"] = "private, no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


class HealthResponse(BaseModel):
    status: Literal["ok"]
    database: Literal["connected"]


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    try:
        check_database()
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail="Database unavailable") from exc
    return HealthResponse(status="ok", database="connected")
