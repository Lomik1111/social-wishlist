import logging
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def send_push(expo_token: str, title: str, body: str, data: dict | None = None) -> bool:
    """Send push notification via Expo Push API."""
    if data is None:
        data = {}
    if not expo_token:
        return False

    try:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.post(
                settings.expo_push_url,
                json={
                    "to": expo_token,
                    "title": title,
                    "body": body,
                    "data": data,
                    "sound": "default",
                },
                timeout=10,
            )
            result = response.json()
            if response.status_code != 200:
                logger.error(f"Push failed: {result}")
                return False
            return True
    except Exception as e:
        logger.error(f"Push error: {e}")
        return False


async def send_push_to_user(db, user_id, title: str, body: str, data: dict | None = None):
    """Helper: look up user's push token and send notification."""
    if data is None:
        data = {}
    from sqlalchemy import select
    from app.models.user import User

    result = await db.execute(select(User.expo_push_token).where(User.id == user_id))
    token = result.scalar_one_or_none()
    if token:
        await send_push(token, title, body, data)
