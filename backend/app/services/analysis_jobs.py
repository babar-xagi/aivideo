"""Database-backed analysis queue processed outside HTTP requests."""

import logging
import time
from datetime import timedelta
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Event, Thread
from uuid import UUID

from ai.language.coach import OpenAILanguageCoach
from ai.mock import make_mock_report
from ai.speech.metrics import calculate_speech_metrics
from ai.speech.transcribe import TranscriptionError, transcribe_recording
from ai.vision.analyze import analyze_recording
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.models.analysis_job import AnalysisJob
from app.models.practice_session import PracticeSession, utc_now
from app.services.storage import StorageUnavailable, get_storage_service

logger = logging.getLogger(__name__)
STAGES = (
    "transcribing",
    "analyzing_fluency",
    "analyzing_english",
    "analyzing_vision",
    "analyzing_presentation",
    "creating_feedback",
)
LEASE_SECONDS = 60


def analyze_language_safely(
    transcript: dict, metrics: dict, practice_context: dict
) -> dict:
    if not str(transcript.get("text", "")).strip():
        return {"status": "unavailable", "reason": "no_speech"}
    settings = get_settings()
    if not settings.openai_api_key:
        return {"status": "unavailable", "reason": "not_configured"}
    try:
        coach = OpenAILanguageCoach(settings.openai_api_key, settings.openai_model)
        analysis = coach.analyze(transcript, metrics, practice_context)
        return {
            "status": "available",
            "model": settings.openai_model,
            "analysis": analysis.model_dump(),
        }
    except Exception as exc:
        logger.warning("Language feedback unavailable: %s", type(exc).__name__)
        return {"status": "unavailable", "reason": "provider_error"}


def analyze_vision_safely(key: str) -> dict:
    model_dir = Path(__file__).resolve().parents[3] / ".cache" / "models" / "vision"
    if not model_dir.is_dir():
        return {"status": "unavailable", "reason": "models_missing"}
    try:
        with TemporaryDirectory(prefix="english-coach-vision-") as temp_dir:
            recording = Path(temp_dir) / "recording"
            get_storage_service().download_object(key, recording)
            return analyze_recording(recording, model_dir)
    except OSError as exc:
        logger.warning("Vision runtime unavailable: %s", type(exc).__name__)
        return {"status": "unavailable", "reason": "runtime_missing"}
    except Exception as exc:
        logger.warning("Vision feedback unavailable: %s", type(exc).__name__)
        return {"status": "unavailable", "reason": "decode_error"}


def _renew_lease(factory: sessionmaker[Session], job_id: UUID, stop: Event) -> None:
    while not stop.wait(15):
        with factory() as db:
            job = db.get(AnalysisJob, job_id)
            if job is None or job.status in {"completed", "failed"}:
                return
            job.lease_expires_at = utc_now() + timedelta(seconds=LEASE_SECONDS)
            db.commit()


def _transcribe_job(factory: sessionmaker[Session], job_id: UUID) -> dict | None:
    with factory() as db:
        job = db.get(AnalysisJob, job_id)
        if job is None:
            return None
        if job.transcript is not None and "words" in job.transcript:
            return job.transcript
        practice_session = db.get(PracticeSession, job.session_id)
        if practice_session is None:
            return None
        key = practice_session.recording_object_key
        if not key:
            raise TranscriptionError("Recording is missing")

    settings = get_settings()
    with TemporaryDirectory(prefix="english-coach-recording-") as temp_dir:
        recording = Path(temp_dir) / "recording"
        get_storage_service().download_object(key, recording)
        transcript = transcribe_recording(
            recording,
            model_name=settings.whisper_model,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
            cpu_threads=settings.whisper_cpu_threads,
            model_cache=(
                Path(settings.whisper_model_cache)
                if settings.whisper_model_cache
                else Path(__file__).resolve().parents[3] / ".cache" / "models"
            ),
        )
    return transcript


def claim_next_job(factory: sessionmaker[Session]) -> UUID | None:
    now = utc_now()
    with factory() as db:
        job = db.scalar(
            select(AnalysisJob)
            .where(
                or_(
                    AnalysisJob.status == "queued",
                    and_(
                        AnalysisJob.status.in_(STAGES),
                        AnalysisJob.lease_expires_at < now,
                    ),
                )
            )
            .order_by(AnalysisJob.created_at, AnalysisJob.id)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if job is None:
            return None
        practice_session = db.get(PracticeSession, job.session_id)
        if practice_session is None:
            db.delete(job)
            db.commit()
            return None
        job.status = STAGES[0]
        job.updated_at = now
        job.lease_expires_at = now + timedelta(seconds=LEASE_SECONDS)
        job.error_message = None
        practice_session.status = "processing"
        job_id = job.id
        db.commit()
        return job_id


def process_next_job(
    factory: sessionmaker[Session], delay_seconds: float = 1.0
) -> bool:
    job_id = claim_next_job(factory)
    if job_id is None:
        return False
    heartbeat_stop = Event()
    heartbeat = Thread(
        target=_renew_lease,
        args=(factory, job_id, heartbeat_stop),
        daemon=True,
    )
    heartbeat.start()
    try:
        transcript = _transcribe_job(factory, job_id)
        if transcript is None:
            return True
        with factory() as db:
            job = db.get(AnalysisJob, job_id)
            if job is None:
                return True
            practice_session = db.get(PracticeSession, job.session_id)
            if practice_session is None:
                db.delete(job)
                db.commit()
                return True
            practice_context = {
                "topic": practice_session.topic,
                "practice_type": practice_session.practice_type,
            }
            recording_key = practice_session.recording_object_key
            existing_vision = job.vision_feedback
            vision_enabled = practice_session.vision_enabled
            job.transcript = transcript
            job.updated_at = utc_now()
            db.commit()
        metrics = calculate_speech_metrics(transcript)
        for stage in STAGES[1:]:
            time.sleep(delay_seconds)
            with factory() as db:
                job = db.get(AnalysisJob, job_id)
                if job is None:
                    return True
                job.status = stage
                if stage == "analyzing_fluency":
                    job.metrics = metrics
                job.updated_at = utc_now()
                job.lease_expires_at = job.updated_at + timedelta(seconds=LEASE_SECONDS)
                db.commit()
            if stage == "analyzing_english":
                feedback = analyze_language_safely(
                    transcript, metrics, practice_context
                )
                with factory() as db:
                    job = db.get(AnalysisJob, job_id)
                    if job is None:
                        return True
                    job.language_feedback = feedback
                    job.updated_at = utc_now()
                    db.commit()
            if stage == "analyzing_vision":
                if not vision_enabled:
                    vision = {"status": "unavailable", "reason": "disabled_by_user"}
                elif existing_vision and existing_vision.get("status") == "available":
                    vision = existing_vision
                elif recording_key:
                    vision = analyze_vision_safely(recording_key)
                else:
                    vision = {"status": "unavailable", "reason": "decode_error"}
                with factory() as db:
                    job = db.get(AnalysisJob, job_id)
                    if job is None:
                        return True
                    job.vision_feedback = vision
                    job.updated_at = utc_now()
                    db.commit()

        time.sleep(delay_seconds)
        with factory() as db:
            job = db.get(AnalysisJob, job_id)
            if job is None:
                return True
            practice_session = db.get(PracticeSession, job.session_id)
            if practice_session is None:
                db.delete(job)
                db.commit()
                return True
            job.report = make_mock_report(practice_session.topic, transcribed=True)
            job.status = "completed"
            job.updated_at = utc_now()
            job.lease_expires_at = None
            practice_session.status = "completed"
            practice_session.analysis_version = (
                "speech-v2+language-v1+vision-v1+mock-v1"
            )
            db.commit()
        return True
    except Exception as exc:
        logger.exception("Analysis job failed: %s", job_id)
        with factory() as db:
            job = db.get(AnalysisJob, job_id)
            if job is not None:
                job.status = "failed"
                job.error_message = (
                    "Transcription could not finish. Check that the recording has "
                    "clear audio, then retry."
                    if isinstance(exc, TranscriptionError)
                    else "Recording could not be read. Please try again."
                    if isinstance(exc, StorageUnavailable)
                    else "Analysis could not finish. Please try again."
                )
                job.updated_at = utc_now()
                job.lease_expires_at = None
                practice_session = db.get(PracticeSession, job.session_id)
                if practice_session is not None:
                    practice_session.status = "failed"
                db.commit()
        return True
    finally:
        heartbeat_stop.set()
        heartbeat.join(timeout=2)


def run_worker(factory: sessionmaker[Session], poll_seconds: float = 2.0) -> None:
    logger.info("Analysis worker started")
    while True:
        try:
            if not process_next_job(factory):
                time.sleep(poll_seconds)
        except Exception:
            logger.exception("Analysis worker could not poll the queue")
            time.sleep(poll_seconds)
