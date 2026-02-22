import sys
import os
import asyncio
import logging
from urllib.parse import urlparse, urlencode, parse_qs, urlunparse
from logging.config import fileConfig
from sqlalchemy import pool
import logging
from sqlalchemy.ext.asyncio import async_engine_from_config, create_async_engine
from alembic import context

logger = logging.getLogger("alembic.env")

IS_RAILWAY = bool(os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("RAILWAY_SERVICE_NAME"))

# Ensure app module is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Override sqlalchemy.url from environment variable
database_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://wishlist:wishlist_dev@localhost:5432/wishlist")
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)

# Strip sslmode from URL on Railway — the proxy rejects SSL upgrades
if IS_RAILWAY:
    _parsed = urlparse(database_url)
    _qs = parse_qs(_parsed.query)
    _qs.pop("sslmode", None)
    database_url = urlunparse(_parsed._replace(query=urlencode(_qs, doseq=True)))

config.set_main_option("sqlalchemy.url", database_url)

from app.database import Base
from app.models import *  # noqa

target_metadata = Base.metadata


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


logger = logging.getLogger("alembic.env")

MAX_RETRIES = 5


async def run_async_migrations():
    # Railway proxy does not support SSL at the PostgreSQL protocol level
    connect_args = {}
    if IS_RAILWAY:
        connect_args["ssl"] = False
        logger.info("Railway detected, SSL disabled")

    _parsed_host = urlparse(database_url).hostname or "unknown"
    logger.info("Connecting to DB host: %s (railway=%s, ssl=%s)",
                _parsed_host, IS_RAILWAY, connect_args.get("ssl", "default"))

    # Use create_async_engine directly so connect_args (including ssl=False) are
    # passed straight to asyncpg without going through the alembic.ini config layer,
    # which can silently drop keyword arguments in some SQLAlchemy versions.
    for attempt in range(1, MAX_RETRIES + 1):
        connectable = create_async_engine(
            database_url,
            poolclass=pool.NullPool,
            connect_args=connect_args,
        )
        try:
            async with connectable.connect() as connection:
                await connection.run_sync(do_run_migrations)
            await connectable.dispose()
            return
        except Exception as exc:
            await connectable.dispose()
            if attempt == MAX_RETRIES:
                raise
            wait = 2 ** (attempt - 1)  # 1 s, 2 s, 4 s, 8 s
            logger.warning(
                "DB connection attempt %d/%d failed (%s). Retrying in %ds...",
                attempt, MAX_RETRIES, exc, wait,
            )
            await asyncio.sleep(wait)


def run_migrations_online():
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
