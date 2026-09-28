"""Exercise the real local database and storage upload lifecycle."""

from uuid import uuid4

import httpx
from fastapi.testclient import TestClient

from app.api.auth import get_current_user
from app.core.auth import AuthenticatedUser
from app.main import app
from app.services.storage import get_storage_service


def main() -> None:
    owner = uuid4()
    visitor = uuid4()
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=owner)
    storage = get_storage_service()
    session_id: str | None = None
    key: str | None = None
    try:
        with TestClient(app) as api:
            created = api.post(
                "/api/sessions",
                json={"topic": "Storage check", "practice_type": "free_speaking"},
            )
            assert created.status_code == 201, created.status_code
            session_id = created.json()["id"]
            content = b"synthetic recording bytes"
            signed = api.post(
                f"/api/sessions/{session_id}/upload-url",
                json={
                    "content_type": "video/webm",
                    "size_bytes": len(content),
                    "duration_seconds": 1,
                },
            )
            assert signed.status_code == 200, signed.status_code
            pending = api.get(f"/api/sessions/{session_id}").json()
            key = pending["recording_object_key"]
            assert key and pending["status"] == "uploading"
            assert (
                api.post(f"/api/sessions/{session_id}/complete-upload").status_code
                == 409
            )

            app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
                id=visitor
            )
            assert api.get(f"/api/sessions/{session_id}").status_code == 404
            assert (
                api.get(f"/api/sessions/{session_id}/recording-url").status_code == 404
            )
            app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
                id=owner
            )

            with httpx.Client(timeout=15) as browser:
                upload = browser.put(
                    signed.json()["upload_url"],
                    content=content,
                    headers=signed.json()["headers"],
                )
                assert upload.status_code == 200, upload.status_code
                completed = api.post(f"/api/sessions/{session_id}/complete-upload")
                assert completed.status_code == 200, completed.status_code
                assert completed.json()["status"] == "uploaded"
                assert completed.json()["recording_object_key"] == key
                playback = api.get(f"/api/sessions/{session_id}/recording-url")
                assert playback.status_code == 200, playback.status_code
                assert browser.get(playback.json()["download_url"]).content == content

            deleted = api.delete(f"/api/sessions/{session_id}")
            assert deleted.status_code == 204, deleted.status_code
            session_id = None
            assert storage.head_object(key) is None
    finally:
        app.dependency_overrides.clear()
        if session_id and key:
            storage.delete_object(key)
    print("Real DB and S3 upload lifecycle passed, including ownership and deletion.")


if __name__ == "__main__":
    main()
