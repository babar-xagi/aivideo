from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.auth import AuthenticatedUser
from app.db.connection import get_db
from app.models.analysis_job import AnalysisJob
from app.models.practice_session import PracticeSession
from app.schemas.practice_session import SessionCreate, SessionRead
from app.services.storage import StorageUnavailable, get_storage_service

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


def owned_session(db: Session, user_id: UUID, session_id: UUID) -> PracticeSession:
    practice_session = db.scalar(
        select(PracticeSession).where(
            PracticeSession.id == session_id, PracticeSession.user_id == user_id
        )
    )
    if practice_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return practice_session


@router.post("", response_model=SessionRead, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionCreate,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PracticeSession:
    practice_session = PracticeSession(
        user_id=user.id, topic=payload.topic, practice_type=payload.practice_type.value
    )
    db.add(practice_session)
    db.commit()
    db.refresh(practice_session)
    return practice_session


@router.get("", response_model=list[SessionRead])
def list_sessions(
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[PracticeSession]:
    return list(
        db.scalars(
            select(PracticeSession)
            .where(PracticeSession.user_id == user.id)
            .order_by(PracticeSession.created_at.desc(), PracticeSession.id.desc())
            .limit(50)
        )
    )


@router.get("/{session_id}", response_model=SessionRead)
def get_session(
    session_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PracticeSession:
    return owned_session(db, user.id, session_id)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    practice_session = owned_session(db, user.id, session_id)
    job = db.scalar(select(AnalysisJob).where(AnalysisJob.session_id == session_id))
    if job is not None:
        db.delete(job)
    if practice_session.recording_object_key:
        try:
            get_storage_service().delete_object(practice_session.recording_object_key)
        except StorageUnavailable as exc:
            raise HTTPException(status_code=503, detail="Storage unavailable") from exc
    db.delete(practice_session)
    db.commit()
