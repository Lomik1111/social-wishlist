"""add auth and performance indexes

Revision ID: 003
Revises: 002
Create Date: 2026-02-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE users
        SET oauth_provider = NULL, oauth_id = NULL
        WHERE (oauth_provider IS NULL AND oauth_id IS NOT NULL)
           OR (oauth_provider IS NOT NULL AND oauth_id IS NULL)
        """
    )

    op.execute(
        """
        WITH duplicates AS (
            SELECT id
            FROM (
                SELECT
                    id,
                    ROW_NUMBER() OVER (
                        PARTITION BY oauth_provider, oauth_id
                        ORDER BY created_at ASC, id ASC
                    ) AS rn
                FROM users
                WHERE oauth_provider IS NOT NULL AND oauth_id IS NOT NULL
            ) ranked
            WHERE ranked.rn > 1
        )
        UPDATE users
        SET oauth_provider = NULL, oauth_id = NULL
        WHERE id IN (SELECT id FROM duplicates)
        """
    )

    op.create_index(
        "uq_users_oauth_provider_oauth_id",
        "users",
        ["oauth_provider", "oauth_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_users_oauth_provider_oauth_id", table_name="users")
