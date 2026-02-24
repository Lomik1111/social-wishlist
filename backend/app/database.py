import os
from urllib.parse import urlparse, urlencode, parse_qs, urlunparse
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

# On Railway, prefer the private URL (*.railway.internal) over the public
# proxy (*.proxy.rlwy.net). The public proxy is unreliable for service-to-service
# connections within Railway. The private network needs no SSL.
_db_url = os.getenv("DATABASE_PRIVATE_URL") or os.getenv("DATABASE_URL") or settings.database_url
if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql+asyncpg://", 1)

# Strip sslmode from URL and disable SSL for internal Railway connections
_connect_args: dict = {}
_parsed = urlparse(_db_url)
_qs = parse_qs(_parsed.query)
if _qs.pop("sslmode", None):
    _db_url = urlunparse(_parsed._replace(query=urlencode(_qs, doseq=True)))
if ".railway.internal" in _db_url:
    _connect_args["ssl"] = False

engine = create_async_engine(
    _db_url,
    echo=False,
    connect_args=_connect_args,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,
    max_overflow=10,
    pool_timeout=10,
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
