from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app import main

client = TestClient(main.app)


def test_health_when_database_is_connected(monkeypatch) -> None:
    monkeypatch.setattr(main, "check_database", lambda: None)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "connected"}


def test_health_when_database_is_unavailable(monkeypatch) -> None:
    def unavailable() -> None:
        raise OperationalError("SELECT 1", {}, Exception("connection failed"))

    monkeypatch.setattr(main, "check_database", unavailable)

    response = client.get("/health")

    assert response.status_code == 503
    assert response.json() == {"detail": "Database unavailable"}
