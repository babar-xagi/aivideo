from collections.abc import Iterator
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api import sessions as sessions_api
from app.api.auth import get_current_user
from app.api.uploads import storage_or_503
from app.core.auth import AuthenticatedUser
from app.core.config import Settings, get_settings
from app.db.connection import get_db
from app.main import app
from app.models.analysis_job import AnalysisJob
from app.models.base import Base
from app.models.practice_session import PracticeSession  # noqa: F401 - table metadata
from app.services import analysis_jobs

USER_A = UUID("d908139c-0f79-4937-b5f3-589fb2c4468e")
USER_B = UUID("4e561e14-2f06-4c2d-87c1-4f7b5ef3f80a")
client = TestClient(app)


class FakeStorage:
    object_info: dict[str, object] | None = None
    deleted_key: str | None = None

    def presign_upload(self, key: str, content_type: str) -> str:
        return f"http://storage.test/{key}?type={content_type}"

    def head_object(self, key: str) -> dict[str, object] | None:
        return self.object_info

    def presign_download(self, key: str) -> str:
        return f"http://storage.test/{key}?download=1"

    def delete_object(self, key: str) -> None:
        self.deleted_key = key


@pytest.fixture
def db() -> Iterator[sessionmaker[Session]]:
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)

    def override_db() -> Iterator[Session]:
        with factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=USER_A)
    yield factory
    app.dependency_overrides.clear()
    engine.dispose()


def test_session_lifecycle_and_owner_isolation(db: None) -> None:
    created = client.post(
        "/api/sessions",
        json={"topic": "  A lesson I learned  ", "practice_type": "tell_a_story"},
    )
    assert created.status_code == 201
    session_id = created.json()["id"]
    assert created.json()["topic"] == "A lesson I learned"
    assert created.json()["status"] == "created"

    assert [item["id"] for item in client.get("/api/sessions").json()] == [session_id]
    assert client.get(f"/api/sessions/{session_id}").status_code == 200

    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=USER_B)
    assert client.get("/api/sessions").json() == []
    assert client.get(f"/api/sessions/{session_id}").status_code == 404
    assert client.delete(f"/api/sessions/{session_id}").status_code == 404

    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=USER_A)
    assert client.delete(f"/api/sessions/{session_id}").status_code == 204
    assert client.get(f"/api/sessions/{session_id}").status_code == 404


def test_session_input_validation(db: None) -> None:
    for payload in (
        {"topic": "   ", "practice_type": "free_speaking"},
        {"topic": "A topic", "practice_type": "unknown"},
        {"topic": "x" * 201, "practice_type": "free_speaking"},
    ):
        assert client.post("/api/sessions", json=payload).status_code == 422
    assert client.get("/api/sessions").json() == []


def test_sessions_require_authentication(db: None) -> None:
    app.dependency_overrides.pop(get_current_user)
    app.dependency_overrides[get_settings] = lambda: Settings(database_url="sqlite://")
    assert client.get("/api/sessions").status_code == 401
    assert (
        client.post(
            "/api/sessions",
            json={"topic": "A topic", "practice_type": "free_speaking"},
        ).status_code
        == 401
    )


def test_signed_upload_checks_owner_and_stored_object(db: None, monkeypatch) -> None:
    storage = FakeStorage()
    app.dependency_overrides[storage_or_503] = lambda: storage
    monkeypatch.setattr(sessions_api, "get_storage_service", lambda: storage)
    created = client.post(
        "/api/sessions",
        json={"topic": "A story", "practice_type": "tell_a_story"},
    )
    session_id = created.json()["id"]
    upload_path = f"/api/sessions/{session_id}/upload-url"
    complete_path = f"/api/sessions/{session_id}/complete-upload"
    recording_path = f"/api/sessions/{session_id}/recording-url"
    payload = {
        "content_type": "video/webm",
        "size_bytes": 11,
        "duration_seconds": 5,
    }

    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=USER_B)
    assert client.post(upload_path, json=payload).status_code == 404
    assert client.post(complete_path).status_code == 404
    assert client.get(recording_path).status_code == 404

    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=USER_A)
    signed = client.post(upload_path, json=payload)
    assert signed.status_code == 200
    assert signed.json()["headers"] == {"Content-Type": "video/webm"}
    assert signed.json()["expires_in_seconds"] == 300
    pending = client.get(f"/api/sessions/{session_id}").json()
    key = pending["recording_object_key"]
    assert key.startswith(f"users/{USER_A}/sessions/{session_id}/")
    assert key.endswith(".webm")
    assert pending["status"] == "uploading"

    assert client.post(complete_path).status_code == 409
    storage.object_info = {
        "ContentLength": 12,
        "ContentType": "video/webm",
        "ETag": '"etag"',
    }
    assert client.post(complete_path).status_code == 409
    storage.object_info["ContentLength"] = 11
    completed = client.post(complete_path)
    assert completed.status_code == 200
    assert completed.json()["status"] == "uploaded"
    assert completed.json()["recording_object_key"] == key
    assert client.post(upload_path, json=payload).status_code == 409
    assert client.get(recording_path).json()["download_url"].endswith("?download=1")

    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=USER_B)
    assert client.get(recording_path).status_code == 404
    assert client.delete(f"/api/sessions/{session_id}").status_code == 404
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=USER_A)
    assert client.delete(f"/api/sessions/{session_id}").status_code == 204
    assert storage.deleted_key == key


def test_upload_request_rejects_unsupported_or_oversize_files(db: None) -> None:
    app.dependency_overrides[storage_or_503] = lambda: FakeStorage()
    created = client.post(
        "/api/sessions",
        json={"topic": "A story", "practice_type": "tell_a_story"},
    )
    upload_path = f"/api/sessions/{created.json()['id']}/upload-url"
    assert (
        client.post(
            upload_path,
            json={"content_type": "video/avi", "size_bytes": 1, "duration_seconds": 5},
        ).status_code
        == 422
    )
    assert (
        client.post(
            upload_path,
            json={
                "content_type": "video/webm",
                "size_bytes": 501 * 1024 * 1024,
                "duration_seconds": 5,
            },
        ).status_code
        == 422
    )


def test_analysis_job_progress_report_retry_and_owner_isolation(
    db: sessionmaker[Session], monkeypatch
) -> None:
    storage = FakeStorage()
    app.dependency_overrides[storage_or_503] = lambda: storage
    monkeypatch.setattr(sessions_api, "get_storage_service", lambda: storage)
    created = client.post(
        "/api/sessions",
        json={"topic": "My story", "practice_type": "tell_a_story"},
    )
    session_id = created.json()["id"]
    path = f"/api/sessions/{session_id}/analysis"
    assert client.post(path).status_code == 409
    assert client.get(path).status_code == 404

    signed = client.post(
        f"/api/sessions/{session_id}/upload-url",
        json={"content_type": "video/webm", "size_bytes": 11, "duration_seconds": 4},
    )
    assert signed.status_code == 200
    storage.object_info = {
        "ContentLength": 11,
        "ContentType": "video/webm",
        "ETag": '"etag"',
    }
    assert client.post(f"/api/sessions/{session_id}/complete-upload").status_code == 200

    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=USER_B)
    assert client.post(path).status_code == 404
    assert client.get(path).status_code == 404
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=USER_A)

    submitted = client.post(path)
    assert submitted.status_code == 200
    assert submitted.json()["status"] == "queued"
    assert client.post(path).json()["id"] == submitted.json()["id"]
    observed: list[str] = []
    sample_transcript = {
        "language": "en",
        "model": "tiny.en",
        "duration_seconds": 4.0,
        "text": "I learned something today.",
        "segments": [{"start": 0.2, "end": 2.9, "text": "I learned something today."}],
        "words": [
            {"start": 0.2, "end": 0.4, "text": "I"},
            {"start": 0.5, "end": 0.9, "text": "learned"},
            {"start": 1.0, "end": 1.5, "text": "something"},
            {"start": 2.5, "end": 2.9, "text": "today."},
        ],
    }
    monkeypatch.setattr(
        analysis_jobs, "_transcribe_job", lambda factory, job_id: sample_transcript
    )

    def observe_stage(_: float) -> None:
        observed.append(client.get(path).json()["status"])

    monkeypatch.setattr(analysis_jobs.time, "sleep", observe_stage)
    assert analysis_jobs.process_next_job(db, delay_seconds=0)
    assert observed == list(analysis_jobs.STAGES)
    completed = client.get(path).json()
    assert completed["status"] == "completed"
    assert completed["report"]["mode"] == "mock"
    assert completed["report"]["transcription_available"] is True
    assert "general examples" in completed["report"]["summary"]
    assert completed["transcript"] == sample_transcript
    assert completed["metrics"]["total_words"] == 4
    assert completed["metrics"]["words_per_minute"] == 88.9
    assert completed["metrics"]["pause_count"] == 1
    assert "metrics" not in completed["report"]
    assert client.get(f"/api/sessions/{session_id}").json()["status"] == "completed"
    assert client.post(path).json()["status"] == "completed"

    with db() as session:
        job = session.get(AnalysisJob, UUID(submitted.json()["id"]))
        assert job is not None
        job.metrics = None
        session.commit()
    upgraded = client.post(path)
    assert upgraded.json()["status"] == "queued"
    assert upgraded.json()["report"] is None
    assert analysis_jobs.process_next_job(db, delay_seconds=0)
    assert client.get(path).json()["transcript"] == sample_transcript
    assert client.get(path).json()["metrics"]["total_words"] == 4

    with db() as session:
        job = session.get(AnalysisJob, UUID(submitted.json()["id"]))
        assert job is not None
        job.status = "failed"
        session.commit()
    retried = client.post(path)
    assert retried.json()["status"] == "queued"
    assert retried.json()["report"] is None
    original_report = analysis_jobs.make_mock_report

    def fail_report(_: str, *, transcribed: bool = False) -> dict[str, object]:
        del transcribed
        raise RuntimeError("Simulated worker failure")

    monkeypatch.setattr(analysis_jobs, "make_mock_report", fail_report)
    assert analysis_jobs.process_next_job(db, delay_seconds=0)
    assert client.get(path).json()["status"] == "failed"
    assert client.get(f"/api/sessions/{session_id}").json()["status"] == "failed"
    assert client.post(path).json()["status"] == "queued"
    monkeypatch.setattr(analysis_jobs, "make_mock_report", original_report)
    assert analysis_jobs.process_next_job(db, delay_seconds=0)
    assert client.get(path).json()["status"] == "completed"

    assert client.delete(f"/api/sessions/{session_id}").status_code == 204
    with db() as session:
        assert session.get(AnalysisJob, UUID(submitted.json()["id"])) is None
