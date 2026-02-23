import httpx
import logging
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

RESEND_API_URL = "https://api.resend.com/emails"


async def send_password_reset_email(to_email: str, code: str) -> bool:
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not configured, skipping email to %s", to_email)
        return False

    payload = {
        "from": settings.resend_from_email,
        "to": [to_email],
        "subject": "Wishly — Сброс пароля",
        "html": (
            f"<div style='font-family: sans-serif; max-width: 400px; margin: 0 auto;'>"
            f"<h2 style='color: #FF2D78;'>Сброс пароля</h2>"
            f"<p>Ваш код для сброса пароля:</p>"
            f"<div style='background: #f5f5f5; padding: 20px; text-align: center; "
            f"border-radius: 12px; margin: 20px 0;'>"
            f"<span style='font-size: 32px; font-weight: bold; letter-spacing: 8px;'>{code}</span>"
            f"</div>"
            f"<p>Код действителен 15 минут.</p>"
            f"<p style='color: #888; font-size: 13px;'>Если вы не запрашивали сброс пароля, "
            f"просто проигнорируйте это письмо.</p>"
            f"</div>"
        ),
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                RESEND_API_URL,
                json=payload,
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                timeout=10,
            )
            resp.raise_for_status()
            return True
    except Exception:
        logger.exception("Failed to send password reset email to %s", to_email)
        return False
