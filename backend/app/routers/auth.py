import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.user import (
    GoogleAuthRequest,
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
    hash_token,
    verify_password,
)

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


def _mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    if not local or not domain:
        return "***"
    if len(local) <= 2:
        return f"{local[0]}***@{domain}"
    return f"{local[:2]}***@{domain}"


def _raise_integrity_conflict(exc: IntegrityError, email: str | None = None) -> None:
    raw_error = str(getattr(exc, "orig", exc)).lower()
    detail = "Database integrity conflict"
    error_code = "integrity_conflict"

    if "users_email_key" in raw_error or "email" in raw_error:
        detail = "Email already registered"
        error_code = "duplicate_email"
    elif "oauth" in raw_error:
        detail = "OAuth account conflict for provider/id"
        error_code = "oauth_conflict"

    logger.warning(
        "auth.integrity_conflict",
        extra={
            "branch": "integrity_error",
            "error_code": error_code,
            "reason": detail,
            "email": _mask_email(email) if email else None,
        },
    )
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail) from exc


def _issue_tokens(user_id):
    access = create_access_token(user_id)
    refresh = create_refresh_token(user_id)
    rt = RefreshToken(
        user_id=user_id,
        token_hash=hash_token(refresh),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    )
    return access, refresh, rt


@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    email_masked = _mask_email(data.email)
    logger.info("auth.register.start", extra={"branch": "start", "email": email_masked})

    existing = await db.execute(select(User).where(func.lower(User.email) == data.email.lower()))
    if existing.scalar_one_or_none():
        logger.info(
            "auth.register.reject",
            extra={
                "branch": "duplicate_email_precheck",
                "email": email_masked,
                "error_code": "duplicate_email",
                "reason": "Email already registered",
            },
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
    )
    db.add(user)

    try:
        await db.flush()
    except IntegrityError as exc:
        _raise_integrity_conflict(exc, data.email)

    access, refresh, rt = _issue_tokens(user.id)
    db.add(rt)

    logger.info("auth.register.success", extra={"branch": "created", "email": email_masked})
    return TokenResponse(access_token=access, refresh_token=refresh, user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    email_masked = _mask_email(data.email)
    logger.info("auth.login.start", extra={"branch": "start", "email": email_masked})

    result = await db.execute(select(User).where(func.lower(User.email) == data.email.lower()))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        logger.info(
            "auth.login.reject",
            extra={
                "branch": "invalid_credentials",
                "email": email_masked,
                "error_code": "invalid_credentials",
                "reason": "Credentials mismatch",
            },
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access, refresh, rt = _issue_tokens(user.id)
    db.add(rt)

    logger.info("auth.login.success", extra={"branch": "authenticated", "email": email_masked})
    return TokenResponse(access_token=access, refresh_token=refresh, user=UserResponse.model_validate(user))


@router.post("/google", response_model=TokenResponse)
async def google_auth(data: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    email_masked = _mask_email(data.email)
    logger.info("auth.google.start", extra={"branch": "start", "email": email_masked})

    result = await db.execute(select(User).where(func.lower(User.email) == data.email.lower()))
    user = result.scalar_one_or_none()

    if user:
        if user.oauth_provider and user.oauth_provider != "google":
            logger.info(
                "auth.google.reject",
                extra={
                    "branch": "provider_mismatch",
                    "email": email_masked,
                    "error_code": "oauth_conflict",
                    "reason": "Email is linked with another auth provider",
                },
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email is linked with another auth provider",
            )
        if user.oauth_id and user.oauth_id != data.oauth_id:
            logger.info(
                "auth.google.reject",
                extra={
                    "branch": "oauth_id_mismatch",
                    "email": email_masked,
                    "error_code": "oauth_conflict",
                    "reason": "Google account ID conflict for this email",
                },
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Google account ID conflict for this email",
            )

        user.oauth_provider = "google"
        user.oauth_id = data.oauth_id
        user.full_name = data.full_name or user.full_name
        user.avatar_url = data.avatar_url or user.avatar_url
        branch = "existing_user"
    else:
        conflict = await db.execute(
            select(User).where(
                User.oauth_provider == "google",
                User.oauth_id == data.oauth_id,
                func.lower(User.email) != data.email.lower(),
            )
        )
        if conflict.scalar_one_or_none():
            logger.info(
                "auth.google.reject",
                extra={
                    "branch": "oauth_id_taken",
                    "email": email_masked,
                    "error_code": "oauth_conflict",
                    "reason": "Google account already linked to another user",
                },
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Google account already linked to another user",
            )

        user = User(
            email=data.email,
            password_hash=hash_password(data.oauth_id),
            full_name=data.full_name,
            avatar_url=data.avatar_url,
            oauth_provider="google",
            oauth_id=data.oauth_id,
        )
        db.add(user)
        branch = "new_user"

    try:
        await db.flush()
    except IntegrityError as exc:
        _raise_integrity_conflict(exc, data.email)

    access, refresh, rt = _issue_tokens(user.id)
    db.add(rt)

    logger.info("auth.google.success", extra={"branch": branch, "email": email_masked})
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
