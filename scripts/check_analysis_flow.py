"""Verify the live worker transcribes a private English speech recording."""

import time
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import uuid4

import httpx
from check_transcription import make_sample_video
from fastapi.testclient import TestClient

from app.api.auth import get_current_user
from app.core.auth import AuthenticatedUser
from app.main import app
from app.services.storage import get_storage_service


def main() -> None:
    owner = uuid4()
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=owner)
    storage = get_storage_service()
    session_id: str | None = None
    key: str | None = None
    try:
        with TestClient(app) as api:
            created = api.post(
                "/api/sessions",
                json={"topic": "Live worker check", "practice_type": "free_speaking"},
            )
            assert created.status_code == 201, created.status_code
            session_id = created.json()["id"]
            with TemporaryDirectory(prefix="english-coach-check-") as temp_dir:
                recording = Path(temp_dir) / "speech.mp4"
                make_sample_video(recording)
                content = recording.read_bytes()
            signed = api.post(
                f"/api/sessions/{session_id}/upload-url",
                json={
                    "content_type": "video/mp4",
                    "size_bytes": len(content),
                    "duration_seconds": 11,
                },
            )
            assert signed.status_code == 200, signed.status_code
            key = api.get(f"/api/sessions/{session_id}").json()["recording_object_key"]
            with httpx.Client(timeout=15) as browser:
                uploaded = browser.put(
                    signed.json()["upload_url"],
                    content=content,
                    headers=signed.json()["headers"],
                )
                assert uploaded.status_code == 200, uploaded.status_code
            complete = api.post(f"/api/sessions/{session_id}/complete-upload")
            assert complete.status_code == 200, complete.status_code

            submitted = api.post(f"/api/sessions/{session_id}/analysis")
            assert submitted.status_code == 200, submitted.status_code
            assert submitted.json()["status"] == "queued"
            observed = {"queued"}
            deadline = time.monotonic() + 90
            while time.monotonic() < deadline:
                current = api.get(f"/api/sessions/{session_id}/analysis")
                assert current.status_code == 200, current.status_code
                status = current.json()["status"]
                observed.add(status)
                if status in {"completed", "failed"}:
                    break
                time.sleep(0.4)
            assert status == "completed", f"Worker ended at {status}"
            assert current.json()["report"]["mode"] == "mock"
            assert current.json()["report"]["transcription_available"] is True
            transcript = current.json()["transcript"]
            assert transcript["segments"]
            assert transcript["words"]
            metrics = current.json()["metrics"]
            assert metrics["total_words"] == len(transcript["words"])
            assert metrics["words_per_minute"] is not None
            assert "my fellow americans" in transcript["text"].lower()
            assert "your country" in transcript["text"].lower()
            assert transcript["segments"][0]["start"] >= 0
            assert transcript["segments"][0]["end"] > 0
            assert api.get(f"/api/sessions/{session_id}").json()["status"] == (
                "completed"
            )
            assert api.get(f"/api/sessions/{session_id}/recording-url").status_code == (
                200
            )
            assert api.delete(f"/api/sessions/{session_id}").status_code == 204
            session_id = None
            assert storage.head_object(key) is None
    finally:
        if session_id:
            with TestClient(app) as api:
                api.delete(f"/api/sessions/{session_id}")
        app.dependency_overrides.clear()
    print(f"Live worker transcribed a private upload: {sorted(observed)}")


if __name__ == "__main__":
    main()
