"""add oauth and performance indexes

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
    op.create_index(
        "ix_users_oauth_provider_oauth_id",
        "users",
        ["oauth_provider", "oauth_id"],
        unique=True,
        postgresql_where=sa.text("oauth_provider IS NOT NULL AND oauth_id IS NOT NULL"),
    )
    op.create_index(
        "ix_refresh_tokens_user_id_revoked_expires_at",
        "refresh_tokens",
        ["user_id", "revoked", "expires_at"],
    )
    op.create_index(
        "ix_items_wishlist_id_is_deleted_sort_order",
        "items",
        ["wishlist_id", "is_deleted", "sort_order"],
    )


def downgrade() -> None:
    op.drop_index("ix_items_wishlist_id_is_deleted_sort_order", table_name="items")
    op.drop_index("ix_refresh_tokens_user_id_revoked_expires_at", table_name="refresh_tokens")
    op.drop_index("ix_users_oauth_provider_oauth_id", table_name="users")
