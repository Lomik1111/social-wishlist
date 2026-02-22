import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from google.auth.transport.requests import Request
from google.oauth2 import id_token
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.user import (
    AppleAuthRequest,
    GoogleAuthRequest,
    PushTokenRequest,
    RefreshRequest,
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
    UserUpdate,
)
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

router = APIRouter()
settings = get_settings()


@router.get("/google/config-status")
async def google_config_status():
    return {
        "configured": bool(settings.google_client_id),
        "google_client_id_present": bool(settings.google_client_id),
    }


@router.post("/google", response_model=TokenResponse)
async def google_auth(data: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google auth не настроен")

    try:
        payload = id_token.verify_oauth2_token(data.credential, Request(), settings.google_client_id)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Неверные данные Google") from exc

    email = payload.get("email")
    sub = payload.get("sub")
    if not email or not sub:
        raise HTTPException(status_code=401, detail="Неполный Google-профиль")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            email=email,
            full_name=payload.get("name"),
            avatar_url=payload.get("picture"),
            google_id=sub,
        )
        db.add(user)
        await db.flush()
    else:
        if not user.google_id:
            user.google_id = sub
        user.avatar_url = user.avatar_url or payload.get("picture")
        if not user.full_name:
            user.full_name = payload.get("name")

    return await _issue_tokens(db, user)


@router.post("/apple", response_model=TokenResponse)
async def apple_auth(data: AppleAuthRequest, db: AsyncSession = Depends(get_db)):
    # Apple Sign In token validation - simplified for now
    # In production, verify identity_token with Apple's public keys
    raise HTTPException(status_code=501, detail="Apple Sign In будет доступен позже")


@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")

    if data.username:
        existing_username = await db.execute(select(User).where(User.username == data.username))
        if existing_username.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Username уже занят")

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        username=data.username,
    )
    db.add(user)
    await db.flush()

    return await _issue_tokens(db, user)


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверные учётные данные")

    return await _issue_tokens(db, user)


async def _issue_tokens(db: AsyncSession, user: User) -> TokenResponse:
    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)

    rt = RefreshToken(
        user_id=user.id,
        token=refresh,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(rt)

    return TokenResponse(access_token=access, refresh_token=refresh, user=UserResponse.model_validate(user))


@router.post("/refresh")
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Неверный refresh-токен")

    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token == data.refresh_token)
    )
    rt = result.scalar_one_or_none()
    if not rt or rt.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Неверный refresh-токен")

    await db.delete(rt)

    new_access = create_access_token(rt.user_id)
    new_refresh = create_refresh_token(rt.user_id)

    new_rt = RefreshToken(
        user_id=rt.user_id,
        token=new_refresh,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(new_rt)

    return {"access_token": new_access, "refresh_token": new_refresh, "token_type": "bearer"}


@router.post("/logout")
async def logout(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RefreshToken).where(RefreshToken.token == data.refresh_token))
    rt = result.scalar_one_or_none()
    if rt:
        await db.delete(rt)
    return {"message": "Вы вышли из аккаунта"}


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return UserResponse.model_validate(user)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.username:
        existing = await db.execute(select(User).where(User.username == data.username, User.id != user.id))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Username уже занят")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    await db.flush()
    return UserResponse.model_validate(user)


@router.post("/push-token")
async def save_push_token(
    data: PushTokenRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user.expo_push_token = data.expo_push_token
    await db.flush()
    return {"message": "Push-токен сохранён"}


@router.get("/users/search")
async def search_users(
    q: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if len(q) < 2:
        return []
    result = await db.execute(
        select(User)
        .where(
            User.id != user.id,
            (User.username.ilike(f"%{q}%")) | (User.full_name.ilike(f"%{q}%"))
        )
        .limit(20)
    )
    users = result.scalars().all()
    from app.schemas.user import UserPublicResponse
    return [UserPublicResponse.model_validate(u) for u in users]
