from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from app.config import get_settings
from app.database import engine, async_session
from app.routers import auth, wishlists, items, reservations, contributions, autofill, websocket, friends, likes, notifications, stats, themes
from app.utils.http import init_http_client, close_http_client

settings = get_settings()

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app):
    # Initialize shared HTTP client
    await init_http_client()
    # Validate DB connection on startup
    async with async_session() as session:
        await session.execute(text("SELECT 1"))
    yield
    # Close shared HTTP client
    await close_http_client()
    await engine.dispose()


app = FastAPI(title="Social Wishlist API", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(wishlists.router, prefix="/api/v1/wishlists", tags=["wishlists"])
app.include_router(items.router, prefix="/api/v1", tags=["items"])
app.include_router(reservations.router, prefix="/api/v1", tags=["reservations"])
app.include_router(contributions.router, prefix="/api/v1", tags=["contributions"])
app.include_router(autofill.router, prefix="/api/v1/autofill", tags=["autofill"])
app.include_router(friends.router, prefix="/api/v1/friends", tags=["friends"])
app.include_router(likes.router, prefix="/api/v1", tags=["likes"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["notifications"])
app.include_router(stats.router, prefix="/api/v1/stats", tags=["stats"])
app.include_router(themes.router, prefix="/api/v1/themes", tags=["themes"])
app.include_router(websocket.router, tags=["websocket"])


@app.get("/health")
async def health():
    try:
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ok", "db": "connected"}
    except Exception:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=503, content={"status": "error", "db": "disconnected"})
