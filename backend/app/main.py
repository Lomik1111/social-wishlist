from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import auth, wishlists, items, reservations, contributions, autofill, websocket, friends, likes, notifications, stats, themes

settings = get_settings()

app = FastAPI(title="Social Wishlist API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    return {"status": "ok"}
