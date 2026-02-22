import os
import ssl as _ssl_mod
from urllib.parse import urlparse, urlencode, parse_qs, urlunparse
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

_IS_RAILWAY = bool(os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("RAILWAY_SERVICE_NAME"))

_db_url = settings.database_url
if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql+asyncpg://", 1)

_connect_args: dict = {}
if _IS_RAILWAY:
    # Railway public proxy (*.proxy.rlwy.net) expects direct TLS, not PostgreSQL
    # SSLRequest negotiation. Use direct_tls=True so asyncpg wraps the socket in
    # TLS immediately. Strip sslmode from URL to prevent asyncpg from also trying
    # PostgreSQL-level SSL negotiation.
    _parsed = urlparse(_db_url)
    _qs = parse_qs(_parsed.query)
    _qs.pop("sslmode", None)
    _db_url = urlunparse(_parsed._replace(query=urlencode(_qs, doseq=True)))
    _ssl_ctx = _ssl_mod.create_default_context()
    _ssl_ctx.check_hostname = False
    _ssl_ctx.verify_mode = _ssl_mod.CERT_NONE
    _connect_args["ssl"] = _ssl_ctx
    _connect_args["direct_tls"] = True

engine = create_async_engine(
    _db_url,
    echo=False,
    connect_args=_connect_args,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,
    max_overflow=10,
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
