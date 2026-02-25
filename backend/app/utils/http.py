import httpx
import logging

logger = logging.getLogger(__name__)

_client: httpx.AsyncClient | None = None


async def init_http_client():
    """Initialize the global HTTP client."""
    global _client
    if _client is None:
        _client = httpx.AsyncClient()
        logger.info("Global HTTP client initialized.")


async def close_http_client():
    """Close the global HTTP client."""
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
        logger.info("Global HTTP client closed.")


def get_http_client() -> httpx.AsyncClient:
    """Get the global HTTP client instance."""
    global _client
    if _client is None:
        # Fallback for cases where it wasn't initialized via lifespan
        # (e.g. in some test scenarios or standalone scripts)
        # Note: In production, it should always be initialized in lifespan.
        _client = httpx.AsyncClient()
        logger.warning("Global HTTP client was not initialized, creating a new one.")
    return _client
