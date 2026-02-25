import asyncio
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.password_reset import PasswordResetCode
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.user import (
    AppleAuthRequest,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    PushTokenRequest,
    RefreshRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
    UserUpdate,
)
from app.services.email import send_password_reset_email
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    verify_password,
)
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter()
settings = get_settings()
limiter = Limiter(key_func=get_remote_address)


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
        payload = id_token.verify_oauth2_token(data.credential, GoogleRequest(), settings.google_client_id)
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
@limiter.limit("3/minute")
async def register(request: Request, data: UserRegister, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")

    if data.username:
        existing_username = await db.execute(select(User).where(User.username == data.username))
        if existing_username.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Username уже занят")

    loop = asyncio.get_running_loop()
    password_hash = await loop.run_in_executor(None, hash_password, data.password)
    user = User(
        email=data.email,
        password_hash=password_hash,
        full_name=data.full_name,
        username=data.username,
    )
    db.add(user)
    await db.flush()

    return await _issue_tokens(db, user)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    is_password_correct = False
    if user and user.password_hash:
        loop = asyncio.get_running_loop()
        is_password_correct = await loop.run_in_executor(
            None, verify_password, data.password, user.password_hash
        )

    if not is_password_correct:
        raise HTTPException(status_code=401, detail="Неверные учётные данные")

    return await _issue_tokens(db, user)


async def _issue_tokens(db: AsyncSession, user: User) -> TokenResponse:
    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)

    rt = RefreshToken(
        user_id=user.id,
        token=hash_token(refresh),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(rt)

    return TokenResponse(access_token=access, refresh_token=refresh, user=UserResponse.model_validate(user))


@router.post("/refresh")
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Неверный refresh-токен")

    token_hash = hash_token(data.refresh_token)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token == token_hash)
    )
    rt = result.scalar_one_or_none()
    if not rt or rt.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Неверный refresh-токен")

    await db.delete(rt)

    new_access = create_access_token(rt.user_id)
    new_refresh = create_refresh_token(rt.user_id)

    new_rt = RefreshToken(
        user_id=rt.user_id,
        token=hash_token(new_refresh),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(new_rt)

    return {"access_token": new_access, "refresh_token": new_refresh, "token_type": "bearer"}


@router.post("/logout")
async def logout(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    token_hash = hash_token(data.refresh_token)
    result = await db.execute(select(RefreshToken).where(RefreshToken.token == token_hash))
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


@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(request: Request, data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    # Always return success to prevent email enumeration
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if user:
        # Invalidate previous codes for this user
        old_codes = await db.execute(
            select(PasswordResetCode).where(
                PasswordResetCode.user_id == user.id,
                PasswordResetCode.used == False,
            )
        )
        for old in old_codes.scalars().all():
            old.used = True

        # Generate 6-digit code
        code = f"{secrets.randbelow(900000) + 100000}"
        code_hash = hashlib.sha256(code.encode()).hexdigest()

        reset_code = PasswordResetCode(
            user_id=user.id,
            code_hash=code_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.password_reset_code_ttl_minutes),
        )
        db.add(reset_code)
        await db.flush()

        await send_password_reset_email(user.email, code)

    return {"message": "Если аккаунт существует, код отправлен на почту"}


@router.post("/reset-password")
@limiter.limit("5/minute")
async def reset_password(request: Request, data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="Неверный код")

    code_hash = hashlib.sha256(data.code.encode()).hexdigest()
    result = await db.execute(
        select(PasswordResetCode).where(
            PasswordResetCode.user_id == user.id,
            PasswordResetCode.code_hash == code_hash,
            PasswordResetCode.used == False,
            PasswordResetCode.expires_at > datetime.now(timezone.utc),
        )
    )
    reset_code = result.scalar_one_or_none()
    if not reset_code:
        raise HTTPException(status_code=400, detail="Неверный или истёкший код")

    reset_code.used = True
    loop = asyncio.get_running_loop()
    user.password_hash = await loop.run_in_executor(None, hash_password, data.new_password)
    await db.flush()

    return {"message": "Пароль успешно изменён"}


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
@limiter.limit("20/minute")
async def search_users(
    request: Request,
    q: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if len(q) < 2 or len(q) > 100:
        return []
    # Escape LIKE wildcards
    safe_q = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    result = await db.execute(
        select(User)
        .where(
            User.id != user.id,
            (User.username.ilike(f"%{safe_q}%")) | (User.full_name.ilike(f"%{safe_q}%"))
        )
        .limit(20)
    )
    users = result.scalars().all()
    from app.schemas.user import UserPublicResponse
    return [UserPublicResponse.model_validate(u) for u in users]
