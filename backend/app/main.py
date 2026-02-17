import importlib.util
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth, wishlists, items, reservations, contributions, autofill, websocket

settings = get_settings()
logger = logging.getLogger(__name__)

app = FastAPI(title="Social Wishlist API", version="1.0.0")


@app.on_event("startup")
async def startup_preflight() -> None:
    google_client_id_configured = bool(settings.google_client_id)
    oauth_modules = {
        "google.oauth2.id_token": importlib.util.find_spec("google.oauth2.id_token") is not None,
        "google.auth.transport.requests": importlib.util.find_spec("google.auth.transport.requests") is not None,
        "requests": importlib.util.find_spec("requests") is not None,
    }
    logger.info(
        "Auth preflight: google_client_id_configured=%s oauth_modules=%s",
        google_client_id_configured,
        oauth_modules,
    )


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
app.include_router(websocket.router, tags=["websocket"])


@app.get("/health")
async def health():
    return {"status": "ok"}
