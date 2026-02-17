import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine, AsyncSession

from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.utils.security import hash_password


@pytest_asyncio.fixture
async def client(tmp_path, monkeypatch):
    db_path = tmp_path / "test.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with SessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db

    def fake_verify(id_token: str):
        payloads = {
            "plain-user": {"email": "existing@example.com", "sub": "google-sub-1", "name": "Existing User"},
            "same-google": {"email": "google@example.com", "sub": "google-sub-2", "name": "Google User"},
            "other-google": {"email": "google@example.com", "sub": "google-sub-X", "name": "Google User"},
            "github-user": {"email": "github@example.com", "sub": "google-sub-3", "name": "Github User"},
        }
        if id_token not in payloads:
            raise ValueError("unexpected token")
        return payloads[id_token]

    monkeypatch.setattr("app.routers.auth.verify_google_id_token", fake_verify)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac, SessionLocal

    app.dependency_overrides.clear()
    await engine.dispose()


async def _create_user(session_factory, **kwargs):
    async with session_factory() as session:
        session.add(User(**kwargs))
        await session.commit()


@pytest.mark.asyncio
async def test_google_binds_existing_non_oauth_account(client):
    ac, session_factory = client
    await _create_user(
        session_factory,
        email="existing@example.com",
        password_hash=hash_password("password123"),
        full_name="Plain User",
    )

    response = await ac.post("/api/v1/auth/google", json={"id_token": "plain-user"})

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["email"] == "existing@example.com"

    async with session_factory() as session:
        user = (await session.execute(select(User).where(User.email == "existing@example.com"))).scalar_one()
        assert user.oauth_provider == "google"
        assert user.oauth_id == "google-sub-1"


@pytest.mark.asyncio
async def test_google_login_with_same_sub(client):
    ac, session_factory = client
    await _create_user(
        session_factory,
        email="google@example.com",
        password_hash=hash_password("password123"),
        oauth_provider="google",
        oauth_id="google-sub-2",
        full_name="Google User",
    )

    response = await ac.post("/api/v1/auth/google", json={"id_token": "same-google"})

    assert response.status_code == 200

    async with session_factory() as session:
        user = (await session.execute(select(User).where(User.email == "google@example.com"))).scalar_one()
        assert user.oauth_id == "google-sub-2"


@pytest.mark.asyncio
async def test_google_conflict_when_same_email_other_sub(client):
    ac, session_factory = client
    await _create_user(
        session_factory,
        email="google@example.com",
        password_hash=hash_password("password123"),
        oauth_provider="google",
        oauth_id="google-sub-2",
    )

    response = await ac.post("/api/v1/auth/google", json={"id_token": "other-google"})

    assert response.status_code == 409
    assert "another Google profile" in response.json()["detail"]


@pytest.mark.asyncio
async def test_google_conflict_when_other_provider_already_linked(client):
    ac, session_factory = client
    await _create_user(
        session_factory,
        email="github@example.com",
        password_hash=hash_password("password123"),
        oauth_provider="github",
        oauth_id="gh-sub-1",
    )

    response = await ac.post("/api/v1/auth/google", json={"id_token": "github-user"})

    assert response.status_code == 409
    assert "linked with github" in response.json()["detail"].lower()
