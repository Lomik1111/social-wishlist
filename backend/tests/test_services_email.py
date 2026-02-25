from unittest.mock import patch, AsyncMock
import pytest
from app.services.email import _mask_email, send_password_reset_email

def test_mask_email():
    assert _mask_email("user@example.com") == "us***r@example.com"
    assert _mask_email("test@example.com") == "te***t@example.com"
    assert _mask_email("bob@example.com") == "b***@example.com"
    assert _mask_email("me@example.com") == "m***@example.com"
    assert _mask_email("a@example.com") == "a***@example.com"
    assert _mask_email("@example.com") == "***@example.com"
    assert _mask_email("invalid") == "***"
    assert _mask_email("") == "***"
    assert _mask_email(None) == "***"
    assert _mask_email("verylongemailaddress@example.com") == "ve***s@example.com"

@pytest.mark.asyncio
async def test_send_password_reset_email_no_api_key(caplog):
    with patch("app.services.email.settings") as mock_settings:
        mock_settings.resend_api_key = ""

        result = await send_password_reset_email("sensitive@example.com", "123456")

        assert result is False
        assert "sensitive@example.com" not in caplog.text
        assert "se***e@example.com" in caplog.text

@pytest.mark.asyncio
async def test_send_password_reset_email_exception(caplog):
    with patch("app.services.email.settings") as mock_settings:
        mock_settings.resend_api_key = "fake_key"
        mock_settings.resend_from_email = "test@example.com"

        with patch("httpx.AsyncClient.post", side_effect=Exception("Connection error")):
            result = await send_password_reset_email("sensitive@example.com", "123456")

            assert result is False
            assert "sensitive@example.com" not in caplog.text
            assert "se***e@example.com" in caplog.text
