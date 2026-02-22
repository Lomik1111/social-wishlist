import sys
import os
import asyncio
import logging
from urllib.parse import urlparse, urlencode, parse_qs, urlunparse
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

logger = logging.getLogger("alembic.env")

# Ensure app module is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# On Railway, prefer private URL (*.railway.internal) over public proxy
database_url = (
    os.getenv("DATABASE_PRIVATE_URL")
    or os.getenv("DATABASE_URL")
    or "postgresql+asyncpg://wishlist:wishlist_dev@localhost:5432/wishlist"
)
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)

# Strip sslmode from URL — asyncpg parses it and may force unwanted SSL
_parsed = urlparse(database_url)
_qs = parse_qs(_parsed.query)
if _qs.pop("sslmode", None):
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


async def run_async_migrations():
    connect_args = {}
    if ".railway.internal" in database_url:
        connect_args["ssl"] = False

    _parsed_host = urlparse(database_url).hostname or "unknown"
    logger.info("Connecting to DB host: %s (ssl=%s)", _parsed_host, connect_args.get("ssl", "default"))

    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )

    # Retry logic for Railway proxy cold-start connection resets
    max_retries = 5
    for attempt in range(1, max_retries + 1):
        try:
            async with connectable.connect() as connection:
                await connection.run_sync(do_run_migrations)
            break
        except Exception as e:
            if attempt == max_retries:
                logger.error("Failed to connect after %d attempts: %s", max_retries, e)
                raise
            wait = 2 ** attempt  # 2, 4, 8, 16, 32 seconds
            logger.warning(
                "DB connection attempt %d/%d failed (%s), retrying in %ds...",
                attempt, max_retries, e, wait,
            )
            await asyncio.sleep(wait)

    await connectable.dispose()


def run_migrations_online():
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
