from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://wishlist:wishlist_dev@localhost:5432/wishlist"
    secret_key: str = "dev-secret-key-change-in-production-min-32-chars-long"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    algorithm: str = "HS256"
    cors_origins: str = "http://localhost:3000"
    environment: str = "development"
    google_client_id: str = ""

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
