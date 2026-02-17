from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from sqlalchemy import or_, select
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

VALID_GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


def _validate_google_claims(credential: str) -> dict:
    try:
        claims = jwt.get_unverified_claims(credential)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid Google credential format") from exc

    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")

    if claims.get("aud") != settings.google_client_id:
        raise HTTPException(status_code=401, detail="Invalid Google token audience")

    if claims.get("iss") not in VALID_GOOGLE_ISSUERS:
        raise HTTPException(status_code=401, detail="Invalid Google token issuer")

    if claims.get("email_verified") is not True:
        raise HTTPException(status_code=401, detail="Google email is not verified")

    exp = claims.get("exp")
    if not isinstance(exp, (int, float)) or datetime.fromtimestamp(exp, tz=timezone.utc) <= datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Google token is expired")

    return claims


@router.get("/google/config-status")
async def google_config_status():
    has_client_id = bool(settings.google_client_id)
    return {
        "configured": has_client_id,
        "google_client_id_present": has_client_id,
        "required_env": ["GOOGLE_CLIENT_ID"],
    }


@router.post("/google", response_model=TokenResponse)
async def google_auth(data: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    claims = _validate_google_claims(data.credential)

    email = claims.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Google token does not contain email")

    google_sub = claims.get("sub")
    if not google_sub:
        raise HTTPException(status_code=401, detail="Google token does not contain subject")

    result = await db.execute(
        select(User).where(or_(User.email == email, User.oauth_id == google_sub))
    )
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            email=email,
            password_hash=hash_password(str(uuid4())),
            full_name=claims.get("name"),
            avatar_url=claims.get("picture"),
            oauth_provider="google",
            oauth_id=google_sub,
        )
        db.add(user)
        await db.flush()
    else:
        user.oauth_provider = "google"
        user.oauth_id = google_sub
        user.full_name = user.full_name or claims.get("name")
        user.avatar_url = user.avatar_url or claims.get("picture")

    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)

    rt = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(refresh),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(rt)

    return TokenResponse(access_token=access, refresh_token=refresh, user=UserResponse.model_validate(user))


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
