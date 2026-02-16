"""add priority and theme columns

Revision ID: 002
Revises: 001
Create Date: 2026-02-16

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "items",
        sa.Column("priority", sa.String(20), nullable=False, server_default="nice_to_have"),
    )
    op.add_column(
        "wishlists",
        sa.Column("theme", sa.String(30), nullable=False, server_default="purple"),
    )


def downgrade() -> None:
    op.drop_column("wishlists", "theme")
    op.drop_column("items", "priority")
