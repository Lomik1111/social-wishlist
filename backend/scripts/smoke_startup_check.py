"""Smoke check: app import + /health endpoint."""

from pathlib import Path
import sys

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app


def run_smoke() -> None:
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200, response.text
        assert response.json().get("status") == "ok", response.json()


if __name__ == "__main__":
    run_smoke()
    print("Smoke check passed")
