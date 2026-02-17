import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.user import RefreshRequest, TokenResponse, UserLogin, UserRegister, UserResponse, UserUpdate
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    verify_password,
)

logger = logging.getLogger(__name__)

try:
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token as google_id_token

    GOOGLE_OAUTH_AVAILABLE = True
    GOOGLE_OAUTH_IMPORT_ERROR = None
except ImportError as exc:
    google_requests = None
    google_id_token = None
    GOOGLE_OAUTH_AVAILABLE = False
    GOOGLE_OAUTH_IMPORT_ERROR = str(exc)

router = APIRouter()
settings = get_settings()


class GoogleAuthRequest(BaseModel):
    credential: str


@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
    )
    db.add(user)
    await db.flush()

    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)

    rt = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(refresh),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(rt)

    return TokenResponse(access_token=access, refresh_token=refresh, user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)

    rt = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(refresh),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(rt)

    return TokenResponse(access_token=access, refresh_token=refresh, user=UserResponse.model_validate(user))


@router.post("/google", response_model=TokenResponse)
async def google_auth(data: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    if not GOOGLE_OAUTH_AVAILABLE:
        logger.warning("Google OAuth unavailable due to missing dependency: %s", GOOGLE_OAUTH_IMPORT_ERROR)
        raise HTTPException(status_code=503, detail="Google OAuth temporarily unavailable")

    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")

    try:
        token_payload = google_id_token.verify_oauth2_token(
            data.credential,
            google_requests.Request(),
            settings.google_client_id,
        )
    except Exception as exc:
        logger.warning("Invalid Google credential: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid Google credential")

    email = token_payload.get("email")
    google_sub = token_payload.get("sub")
    if not email or not google_sub:
        raise HTTPException(status_code=401, detail="Invalid Google credential payload")

    user_result = await db.execute(
        select(User).where((User.oauth_provider == "google") & (User.oauth_id == google_sub))
    )
    user = user_result.scalar_one_or_none()

    if not user:
        email_result = await db.execute(select(User).where(User.email == email))
        user = email_result.scalar_one_or_none()

    if not user:
        user = User(
            email=email,
            full_name=token_payload.get("name"),
            password_hash=hash_password(secrets.token_urlsafe(32)),
            oauth_provider="google",
            oauth_id=google_sub,
        )
        db.add(user)
        await db.flush()
    else:
        if not user.oauth_provider:
            user.oauth_provider = "google"
            user.oauth_id = google_sub

    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)

    rt = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(refresh),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(rt)

    return TokenResponse(access_token=access, refresh_token=refresh, user=UserResponse.model_validate(user))


@router.post("/refresh")
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    token_h = hash_token(data.refresh_token)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_h, RefreshToken.revoked == False)
    )
    rt = result.scalar_one_or_none()
    if not rt:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    rt.revoked = True
    new_access = create_access_token(rt.user_id)
    new_refresh = create_refresh_token(rt.user_id)

    new_rt = RefreshToken(
        user_id=rt.user_id,
        token_hash=hash_token(new_refresh),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(new_rt)

    return {"access_token": new_access, "refresh_token": new_refresh, "token_type": "bearer"}


@router.post("/logout")
async def logout(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    token_h = hash_token(data.refresh_token)
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_h))
    rt = result.scalar_one_or_none()
    if rt:
        rt.revoked = True
    return {"message": "Logged out"}


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return UserResponse.model_validate(user)


@router.put("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    await db.flush()
    return UserResponse.model_validate(user)
