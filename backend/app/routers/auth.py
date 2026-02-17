from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from jose import jwt, JWTError
import secrets
from app.database import get_db
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.schemas.user import (
    UserRegister,
    UserLogin,
    UserUpdate,
    TokenResponse,
    UserResponse,
    RefreshRequest,
    GoogleAuthRequest,
)
from app.utils.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token, hash_token
from app.dependencies import get_current_user
from app.config import get_settings

router = APIRouter()
settings = get_settings()


def normalize_email(email: str) -> str:
    return email.strip().lower()


def verify_google_id_token(id_token: str) -> dict:
    try:
        claims = jwt.get_unverified_claims(id_token)
    except JWTError as exc:
        raise HTTPException(status_code=422, detail="Invalid Google token") from exc

    email = claims.get("email")
    sub = claims.get("sub")
    if not isinstance(email, str) or not isinstance(sub, str):
        raise HTTPException(status_code=422, detail="Google token is missing required claims")

    return claims


@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    normalized_email = normalize_email(data.email)
    existing = await db.execute(select(User).where(User.email == normalized_email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=normalized_email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
    )
    db.add(user)

    try:
        await db.flush()
    except IntegrityError as exc:
        raise HTTPException(status_code=409, detail="Email already registered") from exc

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
    normalized_email = normalize_email(data.email)
    result = await db.execute(select(User).where(User.email == normalized_email))
    user = result.scalar_one_or_none()
    if user and user.oauth_provider:
        raise HTTPException(
            status_code=409,
            detail=f"This email is registered via {user.oauth_provider}. Please sign in with {user.oauth_provider.title()}.",
        )

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
    claims = verify_google_id_token(data.id_token)
    email = normalize_email(claims["email"])
    google_sub = claims["sub"]

    oauth_result = await db.execute(
        select(User).where(User.oauth_provider == "google", User.oauth_id == google_sub)
    )
    oauth_user = oauth_result.scalar_one_or_none()
    if oauth_user:
        user = oauth_user
    else:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user:
            if not user.oauth_provider:
                user.oauth_provider = "google"
                user.oauth_id = google_sub
            elif user.oauth_provider == "google" and user.oauth_id == google_sub:
                pass
            elif user.oauth_provider == "google" and user.oauth_id != google_sub:
                raise HTTPException(
                    status_code=409,
                    detail="Google account conflict: this email is already linked to another Google profile.",
                )
            else:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"This email is already linked with {user.oauth_provider}. "
                        f"Please continue with {user.oauth_provider.title()}."
                    ),
                )
        else:
            user = User(
                email=email,
                password_hash=hash_password(secrets.token_urlsafe(32)),
                full_name=claims.get("name"),
                oauth_provider="google",
                oauth_id=google_sub,
            )
            db.add(user)

    try:
        await db.flush()
    except IntegrityError as exc:
        raise HTTPException(
            status_code=409,
            detail="This Google account is already linked to another user.",
        ) from exc

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
