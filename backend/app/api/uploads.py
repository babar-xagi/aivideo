from datetime import timedelta
from typing import Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.api.sessions import owned_session
from app.core.auth import AuthenticatedUser
from app.db.connection import get_db
from app.models.practice_session import utc_now
from app.schemas.practice_session import SessionRead
from app.services.storage import (
    StorageService,
    StorageUnavailable,
    get_storage_service,
)

router = APIRouter(prefix="/api/sessions", tags=["uploads"])
MAX_UPLOAD_BYTES = 500 * 1024 * 1024


class UploadRequest(BaseModel):
    content_type: Literal["video/webm", "video/mp4"]
    size_bytes: int = Field(ge=1, le=MAX_UPLOAD_BYTES)
    duration_seconds: int = Field(ge=1, le=600)


class SignedUpload(BaseModel):
    upload_url: str
    headers: dict[str, str]
    expires_in_seconds: int


class SignedDownload(BaseModel):
    download_url: str
    expires_in_seconds: int


def storage_or_503() -> StorageService:
    try:
        return get_storage_service()
    except StorageUnavailable as exc:
        raise HTTPException(status_code=503, detail="Storage unavailable") from exc


@router.post("/{session_id}/upload-url", response_model=SignedUpload)
def create_upload_url(
    session_id: UUID,
    payload: UploadRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageService = Depends(storage_or_503),
) -> SignedUpload:
    practice_session = owned_session(db, user.id, session_id)
    if practice_session.status not in {"created", "uploading"}:
        raise HTTPException(status_code=409, detail="Session cannot accept an upload")

    extension = "webm" if payload.content_type == "video/webm" else "mp4"
    key = practice_session.recording_object_key or (
        f"users/{user.id}/sessions/{session_id}/{uuid4()}.{extension}"
    )
    if practice_session.upload_content_type and (
        practice_session.upload_content_type != payload.content_type
    ):
        raise HTTPException(status_code=409, detail="Recording format cannot change")
    try:
        upload_url = storage.presign_upload(key, payload.content_type)
    except StorageUnavailable as exc:
        raise HTTPException(status_code=503, detail="Storage unavailable") from exc

    practice_session.recording_object_key = key
    practice_session.upload_content_type = payload.content_type
    practice_session.upload_size_bytes = payload.size_bytes
    practice_session.upload_expires_at = utc_now() + timedelta(seconds=300)
    practice_session.duration_seconds = payload.duration_seconds
    practice_session.status = "uploading"
    db.commit()
    return SignedUpload(
        upload_url=upload_url,
        headers={"Content-Type": payload.content_type},
        expires_in_seconds=300,
    )


@router.post("/{session_id}/complete-upload", response_model=SessionRead)
def complete_upload(
    session_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageService = Depends(storage_or_503),
) -> SessionRead:
    practice_session = owned_session(db, user.id, session_id)
    if practice_session.status == "uploaded":
        return SessionRead.model_validate(practice_session)
    if (
        practice_session.status != "uploading"
        or not practice_session.recording_object_key
    ):
        raise HTTPException(status_code=409, detail="No pending upload")
    try:
        object_info = storage.head_object(practice_session.recording_object_key)
    except StorageUnavailable as exc:
        raise HTTPException(status_code=503, detail="Storage unavailable") from exc
    if object_info is None:
        raise HTTPException(status_code=409, detail="Recording has not been uploaded")
    if (
        object_info.get("ContentLength") != practice_session.upload_size_bytes
        or str(object_info.get("ContentType", "")).split(";", 1)[0]
        != practice_session.upload_content_type
    ):
        raise HTTPException(status_code=409, detail="Uploaded recording did not match")

    practice_session.recording_etag = str(object_info.get("ETag", "")) or None
    practice_session.status = "uploaded"
    practice_session.completed_at = utc_now()
    db.commit()
    db.refresh(practice_session)
    return SessionRead.model_validate(practice_session)


@router.get("/{session_id}/recording-url", response_model=SignedDownload)
def get_recording_url(
    session_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageService = Depends(storage_or_503),
) -> SignedDownload:
    practice_session = owned_session(db, user.id, session_id)
    if (
        practice_session.status
        not in {
            "uploaded",
            "queued",
            "processing",
            "completed",
            "failed",
        }
        or not practice_session.recording_object_key
    ):
        raise HTTPException(status_code=404, detail="Recording not found")
    try:
        download_url = storage.presign_download(practice_session.recording_object_key)
    except StorageUnavailable as exc:
        raise HTTPException(status_code=503, detail="Storage unavailable") from exc
    return SignedDownload(download_url=download_url, expires_in_seconds=300)
