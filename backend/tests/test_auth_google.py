from datetime import datetime, timedelta, timezone
from uuid import uuid4
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.routers import auth


class FakeResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class FakeSession:
    def __init__(self):
        self.users = []
        self.refresh_tokens = []

    async def execute(self, _stmt):
        return FakeResult(self.users[0] if self.users else None)

    def add(self, obj):
        if isinstance(obj, User):
            self.users.append(obj)
        elif isinstance(obj, RefreshToken):
            self.refresh_tokens.append(obj)

    async def flush(self):
        for user in self.users:
            if user.id is None:
                user.id = uuid4()
            if user.created_at is None:
                user.created_at = datetime.now(timezone.utc)


def test_google_auth_returns_access_and_refresh_tokens():
    auth.settings.google_client_id = "client-id.apps.googleusercontent.com"
    fake_db = FakeSession()

    async def override_get_db():
        yield fake_db

    app.dependency_overrides[get_db] = override_get_db

    claims = {
        "aud": auth.settings.google_client_id,
        "iss": "https://accounts.google.com",
        "email_verified": True,
        "exp": int((datetime.now(timezone.utc) + timedelta(minutes=10)).timestamp()),
        "email": "google-user@example.com",
        "sub": "google-sub-id",
        "name": "Google User",
    }

    with patch("app.routers.auth.id_token.verify_oauth2_token", return_value=claims):
        with TestClient(app) as client:
            response = client.post("/api/v1/auth/google", json={"credential": "mock-google-credential"})

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["token_type"] == "bearer"
    assert isinstance(data["access_token"], str) and data["access_token"]
    assert isinstance(data["refresh_token"], str) and data["refresh_token"]
    assert data["user"]["email"] == "google-user@example.com"
