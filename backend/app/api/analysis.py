from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.api.sessions import owned_session
from app.core.auth import AuthenticatedUser
from app.db.connection import get_db
from app.models.analysis_job import AnalysisJob
from app.models.practice_session import utc_now
from app.schemas.analysis_job import AnalysisJobRead

router = APIRouter(prefix="/api/sessions", tags=["analysis"])


@router.post("/{session_id}/analysis", response_model=AnalysisJobRead)
def submit_analysis(
    session_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AnalysisJob:
    practice_session = owned_session(db, user.id, session_id)
    if practice_session.status not in {
        "uploaded",
        "queued",
        "processing",
        "completed",
        "failed",
    }:
        raise HTTPException(status_code=409, detail="Upload a recording first")
    job = db.scalar(select(AnalysisJob).where(AnalysisJob.session_id == session_id))
    created = job is None
    if job is None:
        job = AnalysisJob(session_id=session_id, status="queued")
        db.add(job)
    elif job.status == "failed" or (
        job.status == "completed"
        and (
            job.transcript is None
            or job.metrics is None
            or job.language_feedback is None
            or job.language_feedback.get("status") == "unavailable"
            or (
                practice_session.vision_enabled
                and (
                    job.vision_feedback is None
                    or job.vision_feedback.get("reason")
                    in {"models_missing", "runtime_missing", "decode_error"}
                )
            )
        )
    ):
        job.status = "queued"
        job.report = None
        job.metrics = None
        job.language_feedback = None
        job.error_message = None
        job.lease_expires_at = None
        job.updated_at = utc_now()
    else:
        return job
    practice_session.status = "queued"
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if not created:
            raise
        existing = db.scalar(
            select(AnalysisJob).where(AnalysisJob.session_id == session_id)
        )
        if existing is None:
            raise
        return existing
    db.refresh(job)
    return job


@router.get("/{session_id}/analysis", response_model=AnalysisJobRead)
def get_analysis(
    session_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AnalysisJob:
    owned_session(db, user.id, session_id)
    job = db.scalar(select(AnalysisJob).where(AnalysisJob.session_id == session_id))
    if job is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return job
